#!/usr/bin/env -S npx tsx
/**
 * CLI for the sheet-change engine (`src/lib/sheet-change-engine.ts`).
 *
 * By default this CLI operates on a local JSON file standing in for the
 * sheet (`--sheet-state`, default `scripts/fixtures/sheet-state.sample.json`)
 * via `JsonFileSheetClient` — no network, no credentials, safe to run freely.
 *
 * Passing `--sheet-id <id>` switches to a REAL Google Sheet via
 * `GoogleSheetsClient` (`src/lib/google-sheets-client.ts`), authenticated as
 * a service account (a Google-managed "robot" login with no human sign-in).
 * That path additionally requires the `SCNM_SHEET_KEY_FILE` environment
 * variable — the local path to the service account's private key file — and
 * refuses to run without it. There is NO `--allow-live-sheet` flag anywhere
 * in this file, deliberately: the only way to write to the live directory
 * sheet (`14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I`) is to construct a
 * `GoogleSheetsClient` directly in code with `allowLiveSheet: true`, which
 * this CLI never does. See the plan doc, §6, for the full picture.
 *
 * Usage:
 *   npx tsx scripts/sheet-change-engine.ts process <payload.json> [--mode review-all|auto-low-risk]
 *   npx tsx scripts/sheet-change-engine.ts list-pending
 *   npx tsx scripts/sheet-change-engine.ts approve <id>
 *   npx tsx scripts/sheet-change-engine.ts reject <id> [--note "..."]
 *   npx tsx scripts/sheet-change-engine.ts undo <id>
 *
 * Shared flags:
 *   --sheet-state <path>   local JSON sheet fixture (default: scripts/fixtures/sheet-state.sample.json)
 *   --sheet-id <id>        a real Google Sheet id — requires SCNM_SHEET_KEY_FILE to be set
 *   --log <path>           append-only change log (default: docs/change-log/sheet-changes.jsonl)
 */
import { readFile } from 'node:fs/promises';
import { JsonFileSheetClient } from '../src/lib/sheet-change-client';
import type { SheetClient } from '../src/lib/sheet-change-client';
import { GoogleSheetsClient } from '../src/lib/google-sheets-client';
import {
  processChange,
  approveChange,
  rejectChange,
  undoChange,
  JsonlChangeLog,
} from '../src/lib/sheet-change-engine';
import type { ProposedChange, EngineMode, ChangeLogEntry } from '../src/lib/sheet-change-engine';
import { log } from '../src/lib/log';

const DEFAULT_SHEET_STATE = 'scripts/fixtures/sheet-state.sample.json';
const DEFAULT_LOG = 'docs/change-log/sheet-changes.jsonl';

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}

/**
 * Builds the `SheetClient` a command should use: a real Google Sheet when
 * `--sheet-id` is given, otherwise the local JSON fixture (unchanged default
 * behavior). `allowLiveSheet` is never set here — see the file header.
 */
async function getClient(args: string[]): Promise<SheetClient> {
  const sheetId = flag(args, '--sheet-id');
  if (sheetId !== undefined) {
    const keyFilePath = process.env['SCNM_SHEET_KEY_FILE'];
    if (keyFilePath === undefined) {
      throw new Error('--sheet-id requires the SCNM_SHEET_KEY_FILE environment variable (path to the service-account key file)');
    }
    return new GoogleSheetsClient({ spreadsheetId: sheetId, keyFilePath });
  }
  const sheetStatePath = flag(args, '--sheet-state') ?? DEFAULT_SHEET_STATE;
  return JsonFileSheetClient.open(sheetStatePath);
}

function isProposedChange(x: unknown): x is ProposedChange {
  if (typeof x !== 'object' || x === null) return false;
  const c = x as Record<string, unknown>;
  return (
    typeof c['sheet'] === 'string' &&
    typeof c['rowKey'] === 'string' &&
    typeof c['source'] === 'string' &&
    typeof c['reason'] === 'string' &&
    typeof c['op'] === 'object' &&
    c['op'] !== null &&
    typeof (c['op'] as Record<string, unknown>)['kind'] === 'string'
  );
}

async function loadPayload(path: string): Promise<ProposedChange[]> {
  const raw = JSON.parse(await readFile(path, 'utf8')) as unknown;
  if (!Array.isArray(raw)) throw new Error(`${path}: expected a JSON array of proposed changes`);
  const bad = raw.findIndex((c) => !isProposedChange(c));
  if (bad !== -1) throw new Error(`${path}: entry ${bad} is not a valid ProposedChange (needs sheet, rowKey, op.kind, source, reason)`);
  return raw as ProposedChange[];
}

async function cmdProcess(args: string[]): Promise<void> {
  const payloadPath = args[0];
  if (payloadPath === undefined) throw new Error('usage: process <payload.json> [--mode review-all|auto-low-risk]');
  const modeArg = flag(args, '--mode') ?? 'review-all';
  if (modeArg !== 'review-all' && modeArg !== 'auto-low-risk') {
    throw new Error(`--mode must be review-all or auto-low-risk, got: ${modeArg}`);
  }
  const mode: EngineMode = modeArg;
  const logPath = flag(args, '--log') ?? DEFAULT_LOG;

  const changes = await loadPayload(payloadPath);
  const client = await getClient(args);
  const changeLog = new JsonlChangeLog(logPath);

  log.info(`mode: ${mode}`);
  let applied = 0;
  let queued = 0;
  let rejected = 0;
  for (const change of changes) {
    const result = await processChange(client, changeLog, change, mode);
    if (result.outcome === 'applied') applied++;
    else if (result.outcome === 'queued') queued++;
    else rejected++;
    log.info(`  [${result.outcome}] ${change.sheet}/${change.rowKey} (${result.id})${result.reason !== undefined ? ` — ${result.reason}` : ''}`);
  }
  log.info(`\n${applied} applied, ${queued} queued for approval, ${rejected} rejected.`);
  if (queued > 0) log.info(`Run "list-pending" to see the approve command for each queued change.`);
}

async function cmdListPending(args: string[]): Promise<void> {
  const logPath = flag(args, '--log') ?? DEFAULT_LOG;
  const changeLog = new JsonlChangeLog(logPath);
  const entries = await changeLog.readAll();
  const latestById = new Map<string, ChangeLogEntry>();
  for (const e of entries) latestById.set(e.id, e); // last write wins -- log is append order
  const pending = [...latestById.values()].filter((e) => e.action === 'queued');
  if (pending.length === 0) {
    log.info('Nothing is waiting for approval.');
    return;
  }
  for (const e of pending) {
    log.info(`${e.id}  [${e.level}]  ${e.change.sheet}/${e.change.rowKey}  ${e.change.reason}`);
    log.info(`  approve: npx tsx scripts/sheet-change-engine.ts approve ${e.id}`);
    log.info(`  reject:  npx tsx scripts/sheet-change-engine.ts reject ${e.id} --note "..."`);
  }
}

async function cmdApprove(args: string[]): Promise<void> {
  const id = args[0];
  if (id === undefined) throw new Error('usage: approve <id>');
  const logPath = flag(args, '--log') ?? DEFAULT_LOG;
  const client = await getClient(args);
  const changeLog = new JsonlChangeLog(logPath);
  const result = await approveChange(client, changeLog, id);
  log.info(`[${result.outcome}] ${id}${result.reason !== undefined ? ` — ${result.reason}` : ''}`);
}

async function cmdReject(args: string[]): Promise<void> {
  const id = args[0];
  if (id === undefined) throw new Error('usage: reject <id> [--note "..."]');
  const logPath = flag(args, '--log') ?? DEFAULT_LOG;
  const note = flag(args, '--note');
  const changeLog = new JsonlChangeLog(logPath);
  const result = await rejectChange(changeLog, id, note);
  log.info(`[${result.outcome}] ${id}`);
}

async function cmdUndo(args: string[]): Promise<void> {
  const id = args[0];
  if (id === undefined) throw new Error('usage: undo <id>');
  const logPath = flag(args, '--log') ?? DEFAULT_LOG;
  const client = await getClient(args);
  const changeLog = new JsonlChangeLog(logPath);
  const result = await undoChange(client, changeLog, id);
  log.info(`[${result.outcome}] ${id}`);
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case 'process':
      return cmdProcess(rest);
    case 'list-pending':
      return cmdListPending(rest);
    case 'approve':
      return cmdApprove(rest);
    case 'reject':
      return cmdReject(rest);
    case 'undo':
      return cmdUndo(rest);
    default:
      log.error('usage: sheet-change-engine.ts <process|list-pending|approve|reject|undo> ...');
      process.exitCode = 1;
  }
}

await main();
