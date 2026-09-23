import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { CellValue, SheetClient, SheetName, SheetRow } from './sheet-change-client';
import { assertNoUnexpectedShrink } from './dataset-guard';

/**
 * A proposed sheet change, matching the payload shape the brief specifies (row
 * key, column, old value, new value, source, reason) plus what's needed to
 * describe a whole-row add/delete and to make a delete/undo faithful:
 * `delete-row` always carries a full-row `snapshot`, since that's what makes
 * undo possible without re-reading a sheet that may have moved on.
 *
 * `merge` is modeled as a tagged `delete-row` of the duplicate row (the
 * surviving row is left untouched) -- this matches how the one merge this
 * directory has actually done was handled (the 2026-08-28 Ottawa fold-in: a
 * duplicate row deleted plus a redirect, not a field copy into the survivor).
 * `keepRowKey` records which row survives, for the digest and for a human
 * reviewing the log; it isn't used by apply/undo, both of which only touch
 * the duplicate's row.
 */
export type ChangeOp =
  | { kind: 'update'; column: string; oldValue: CellValue; newValue: CellValue }
  | { kind: 'rename'; column: string; oldValue: CellValue; newValue: CellValue; oldSlug: string; newSlug: string }
  | { kind: 'add-row'; values: SheetRow }
  | { kind: 'delete-row'; snapshot: SheetRow }
  | { kind: 'merge'; keepRowKey: string; snapshot: SheetRow };

export interface ProposedChange {
  sheet: SheetName;
  rowKey: string;
  op: ChangeOp;
  /** Where this proposal came from, e.g. `refresh-ratings.py`, `tcdb`, `nathan-manual`. */
  source: string;
  /** Plain-English reason, shown in the digest. */
  reason: string;
}

export type RiskLevel = 'low-risk' | 'risky' | 'closure';
export type EngineMode = 'review-all' | 'auto-low-risk';

/**
 * A "new business is currently listed" state change caused specifically by
 * `refresh-ratings.py` reading Google's businessStatus, per PRD Phase 2c.
 * Trusted sources for other low-risk kinds are intentionally short lists --
 * both default to safe (unrecognized source/column falls through to `risky`).
 */
const CLOSURE_SOURCES = new Set(['refresh-ratings.py']);
const LOW_RISK_UPDATE_COLUMNS = new Set(['Hours', 'Rating', 'Logo']);
const LOW_RISK_ADD_SOURCES = new Set(['tcdb', 'refresh-shows.py']);

/**
 * Classifies a proposed change. Defaults to `risky` for anything it doesn't
 * specifically recognize -- an unfamiliar op, column or source is exactly the
 * case that should stop for a human, not slide through as low-risk.
 */
export function classifyChange(change: ProposedChange): RiskLevel {
  const { op, sheet, source } = change;

  if (
    sheet === 'Stores' &&
    op.kind === 'update' &&
    op.column === 'Status' &&
    op.newValue === 'closed' &&
    CLOSURE_SOURCES.has(source)
  ) {
    return 'closure';
  }

  if (op.kind === 'delete-row' || op.kind === 'merge' || op.kind === 'rename') return 'risky';

  if (op.kind === 'update') {
    return LOW_RISK_UPDATE_COLUMNS.has(op.column) ? 'low-risk' : 'risky';
  }

  // op.kind === 'add-row'
  return LOW_RISK_ADD_SOURCES.has(source) ? 'low-risk' : 'risky';
}

/**
 * Whether a classified change should write immediately, or wait for
 * `approveChange`. `review-all` never auto-applies anything -- including a
 * closure -- matching the PRD's "first two weeks everything runs in
 * review-everything mode" literally.
 */
export function shouldAutoApply(level: RiskLevel, mode: EngineMode): boolean {
  if (mode === 'review-all') return false;
  return level === 'low-risk' || level === 'closure';
}

export type ChangeAction = 'queued' | 'applied' | 'rejected' | 'undone';

/**
 * One line in the append-only change log. Entries for the same logical
 * change share an `id`; the log is a history, so a change's current status is
 * always its LAST entry for that id, never a value mutated in place.
 */
export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  action: ChangeAction;
  change: ProposedChange;
  level: RiskLevel;
  mode?: EngineMode;
  /** Set on `rejected` (why) and optionally on a manual `rejectChange` call. */
  note?: string;
}

export interface ChangeLog {
  append(entry: ChangeLogEntry): Promise<void>;
  readAll(): Promise<ChangeLogEntry[]>;
}

/** In-process, for unit tests -- no file I/O. */
export class InMemoryChangeLog implements ChangeLog {
  private entries: ChangeLogEntry[] = [];

  append(entry: ChangeLogEntry): Promise<void> {
    this.entries.push(entry);
    return Promise.resolve();
  }

  readAll(): Promise<ChangeLogEntry[]> {
    return Promise.resolve([...this.entries]);
  }
}

/**
 * Append-only JSON Lines file, one entry per line. Recommended over a sheet
 * tab (see the plan doc, §3): git-diffable, needs no extra Sheets write
 * scope, and survives the sheet itself being copied for a dry run. Never
 * rewrites existing lines -- `append` only ever adds one.
 */
export class JsonlChangeLog implements ChangeLog {
  constructor(private readonly path: string) {}

  async append(entry: ChangeLogEntry): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify(entry)}\n`);
  }

  async readAll(): Promise<ChangeLogEntry[]> {
    let raw: string;
    try {
      raw = await readFile(this.path, 'utf8');
    } catch {
      return [];
    }
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((line) => JSON.parse(line) as ChangeLogEntry);
  }
}

export interface ProcessResult {
  id: string;
  outcome: 'applied' | 'queued' | 'rejected' | 'undone';
  reason?: string;
}

const nowIso = (): string => new Date().toISOString();

/**
 * Optimistic check: does the sheet still hold what this change was proposed
 * against? Runs before every write (auto-apply, approve, and the mirrored
 * check inside undo), so a change proposed against stale data is refused
 * rather than silently overwriting whatever is there now.
 */
async function checkCurrent(client: SheetClient, change: ProposedChange): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { sheet, rowKey, op } = change;
  if (op.kind === 'update' || op.kind === 'rename') {
    const row = await client.getRow(sheet, rowKey);
    if (row === undefined) return { ok: false, reason: `row not found: ${sheet}/${rowKey}` };
    const current = row[op.column] ?? null;
    if (current !== op.oldValue) {
      return {
        ok: false,
        reason: `value changed since this was proposed: expected ${JSON.stringify(op.oldValue)}, sheet has ${JSON.stringify(current)}`,
      };
    }
    return { ok: true };
  }
  if (op.kind === 'add-row') {
    const row = await client.getRow(sheet, rowKey);
    if (row !== undefined) return { ok: false, reason: `row already exists: ${sheet}/${rowKey}` };
    return { ok: true };
  }
  // delete-row / merge
  const row = await client.getRow(sheet, rowKey);
  if (row === undefined) return { ok: false, reason: `row not found: ${sheet}/${rowKey}` };
  const drifted = Object.keys(op.snapshot).some((key) => row[key] !== op.snapshot[key]);
  if (drifted) return { ok: false, reason: `row contents changed since this was proposed: ${sheet}/${rowKey}` };
  return { ok: true };
}

/**
 * Row-count guard for anything that removes a row. Reuses the same shrink
 * check the bake scripts run, at the point of the write itself rather than
 * only after the next bake -- catches a delete/merge queue that would empty
 * out a small sheet before it ever reaches the sheet.
 */
async function checkRowCountGuard(client: SheetClient, change: ProposedChange): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (change.op.kind !== 'delete-row' && change.op.kind !== 'merge') return { ok: true };
  const prev = await client.countRows(change.sheet);
  try {
    assertNoUnexpectedShrink(change.sheet, prev - 1, prev);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

async function applyOp(client: SheetClient, sheet: SheetName, rowKey: string, op: ChangeOp): Promise<void> {
  switch (op.kind) {
    case 'update':
    case 'rename':
      return client.updateCell(sheet, rowKey, op.column, op.newValue);
    case 'add-row':
      return client.addRow(sheet, rowKey, op.values);
    case 'delete-row':
    case 'merge':
      return client.deleteRow(sheet, rowKey);
  }
}

/** The inverse of an op, for undo. Never touches the log or the client itself. */
function inverseOp(op: ChangeOp): ChangeOp {
  switch (op.kind) {
    case 'update':
      return { kind: 'update', column: op.column, oldValue: op.newValue, newValue: op.oldValue };
    case 'rename':
      return {
        kind: 'rename',
        column: op.column,
        oldValue: op.newValue,
        newValue: op.oldValue,
        oldSlug: op.newSlug,
        newSlug: op.oldSlug,
      };
    case 'add-row':
      return { kind: 'delete-row', snapshot: op.values };
    case 'delete-row':
      return { kind: 'add-row', values: op.snapshot };
    case 'merge':
      return { kind: 'add-row', values: op.snapshot };
  }
}

/**
 * Classifies, optimistically checks, row-count-guards, and either applies or
 * queues a proposed change. This is the ONLY place a change is ever written
 * to the sheet automatically -- `approveChange` reuses the same guard checks
 * and the same `applyOp`, so there is no separate, less-guarded "automatic"
 * write path.
 */
export async function processChange(
  client: SheetClient,
  log: ChangeLog,
  change: ProposedChange,
  mode: EngineMode,
): Promise<ProcessResult> {
  const id = randomUUID();
  const level = classifyChange(change);

  const current = await checkCurrent(client, change);
  if (!current.ok) {
    await log.append({ id, timestamp: nowIso(), action: 'rejected', change, level, note: current.reason });
    return { id, outcome: 'rejected', reason: current.reason };
  }

  // The row-count guard only matters at the moment of an actual write.
  // Queuing a change makes no write, so a risky delete that WOULD trip the
  // guard should still queue for review -- the guard runs again, and can
  // still refuse, at `approveChange` time.
  if (shouldAutoApply(level, mode)) {
    const countGuard = await checkRowCountGuard(client, change);
    if (!countGuard.ok) {
      await log.append({ id, timestamp: nowIso(), action: 'rejected', change, level, note: countGuard.reason });
      return { id, outcome: 'rejected', reason: countGuard.reason };
    }
    await applyOp(client, change.sheet, change.rowKey, change.op);
    await log.append({ id, timestamp: nowIso(), action: 'applied', change, level, mode });
    return { id, outcome: 'applied' };
  }

  await log.append({ id, timestamp: nowIso(), action: 'queued', change, level, mode });
  return { id, outcome: 'queued' };
}

function lastEntryFor(entries: ChangeLogEntry[], id: string): ChangeLogEntry | undefined {
  return entries.filter((e) => e.id === id).at(-1);
}

/** Applies a `queued` change -- the exact command the digest tells Nathan to run. */
export async function approveChange(client: SheetClient, log: ChangeLog, id: string): Promise<ProcessResult> {
  const last = lastEntryFor(await log.readAll(), id);
  if (last === undefined) throw new Error(`change not found: ${id}`);
  if (last.action !== 'queued') throw new Error(`change ${id} is already ${last.action}`);

  const current = await checkCurrent(client, last.change);
  if (!current.ok) {
    await log.append({ id, timestamp: nowIso(), action: 'rejected', change: last.change, level: last.level, note: current.reason });
    return { id, outcome: 'rejected', reason: current.reason };
  }
  const countGuard = await checkRowCountGuard(client, last.change);
  if (!countGuard.ok) {
    await log.append({ id, timestamp: nowIso(), action: 'rejected', change: last.change, level: last.level, note: countGuard.reason });
    return { id, outcome: 'rejected', reason: countGuard.reason };
  }

  await applyOp(client, last.change.sheet, last.change.rowKey, last.change.op);
  await log.append({ id, timestamp: nowIso(), action: 'applied', change: last.change, level: last.level });
  return { id, outcome: 'applied' };
}

/** Declines a `queued` change. Never touches the sheet. */
export async function rejectChange(log: ChangeLog, id: string, note?: string): Promise<ProcessResult> {
  const last = lastEntryFor(await log.readAll(), id);
  if (last === undefined) throw new Error(`change not found: ${id}`);
  if (last.action !== 'queued') throw new Error(`change ${id} is already ${last.action}`);

  await log.append({
    id,
    timestamp: nowIso(),
    action: 'rejected',
    change: last.change,
    level: last.level,
    ...(note !== undefined ? { note } : {}),
  });
  return { id, outcome: 'rejected' };
}

/**
 * One-command undo. Looks up the `applied` entry, re-runs the same
 * optimistic check against the inverse (so undoing something that's since
 * been changed again fails loudly rather than clobbering a newer edit), and
 * applies the inverse. Refuses anything not currently `applied`.
 */
export async function undoChange(client: SheetClient, log: ChangeLog, id: string): Promise<ProcessResult> {
  const last = lastEntryFor(await log.readAll(), id);
  if (last === undefined) throw new Error(`change not found: ${id}`);
  if (last.action === 'undone') throw new Error(`change ${id} was already undone`);
  if (last.action !== 'applied') throw new Error(`change ${id} is not applied (currently ${last.action})`);

  const inverse = inverseOp(last.change.op);
  await applyOp(client, last.change.sheet, last.change.rowKey, inverse);
  await log.append({
    id,
    timestamp: nowIso(),
    action: 'undone',
    change: last.change,
    level: last.level,
    ...(last.mode !== undefined ? { mode: last.mode } : {}),
  });
  return { id, outcome: 'undone' };
}
