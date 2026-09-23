import type { CellValue } from './sheet-change-client';
import type { ChangeLogEntry, ChangeOp } from './sheet-change-engine';

/** One row of `docs/research/click-events-report-*.csv` (see `docs/click-tracking.md`). */
export interface ClickEventRow {
  slug: string;
  name: string;
  destination_city: string;
  month: string;
  source_city: string;
  directions: number;
  call: number;
  website: number;
  combined: number;
}

export interface MonthlyTaps {
  month: string;
  total: number;
}

export interface JobStatus {
  name: string;
  status: 'ok' | 'failing';
  lastRun?: string;
  note?: string;
}

export interface DigestInput {
  /** Plain-English label for the reporting window, e.g. "Sept 17 – Sept 23, 2026". */
  weekLabel: string;
  /** Change-log entries for this window (caller filters by timestamp before passing them in). */
  changeLogEntries: ChangeLogEntry[];
  /** Undefined means "not reachable this run" -- see `docs/click-tracking.md`. */
  clickTrend?: MonthlyTaps[] | undefined;
  /** Undefined means no job-status feed is wired up yet. */
  jobStatuses?: JobStatus[] | undefined;
}

/**
 * A small, forgiving CSV parser (quoted fields, escaped `""`, no external
 * dependency) for `click-events-report-*.csv`. Not a general-purpose CSV
 * library -- just enough for the one file shape this digest reads.
 */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const pushField = (): void => {
    row.push(field);
    field = '';
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      pushField();
    } else if (c === '\n') {
      pushRow();
    } else if (c === '\r') {
      // skip; \r\n line endings are handled by the following \n
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) pushRow();
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

export function parseClickEventsCsv(text: string): ClickEventRow[] {
  const rows = parseCsvRows(text);
  const header = rows[0];
  if (header === undefined) return [];
  const idx = (col: string): number => header.indexOf(col);
  const num = (row: string[], col: string): number => {
    const raw = row[idx(col)];
    const n = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(n) ? n : 0;
  };
  const str = (row: string[], col: string): string => row[idx(col)] ?? '';
  return rows.slice(1).map((row) => ({
    slug: str(row, 'slug'),
    name: str(row, 'name'),
    destination_city: str(row, 'destination_city'),
    month: str(row, 'month'),
    source_city: str(row, 'source_city'),
    directions: num(row, 'directions'),
    call: num(row, 'call'),
    website: num(row, 'website'),
    combined: num(row, 'combined'),
  }));
}

/** Total taps (Call + Directions + Website presses) per month, chronological. */
export function summarizeMonthlyTaps(rows: ClickEventRow[]): MonthlyTaps[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.month, (totals.get(row.month) ?? 0) + row.combined);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}

const fmt = (v: CellValue): string => (v === null || v === '' ? '(blank)' : String(v));

const APPROVE_CMD = (id: string): string => `\`npx tsx scripts/sheet-change-engine.ts approve ${id}\``;
const UNDO_CMD = (id: string): string => `\`npx tsx scripts/sheet-change-engine.ts undo ${id}\``;

/** Plain-English description of what an op does, for someone who isn't a developer. */
function describeOp(op: ChangeOp): string {
  switch (op.kind) {
    case 'update':
      return `${op.column} changed from ${fmt(op.oldValue)} to ${fmt(op.newValue)}`;
    case 'rename':
      return (
        `${op.column} renamed from ${fmt(op.oldValue)} to ${fmt(op.newValue)} ` +
        `(its web address changes too — this needs a redirect added by hand so the old link still works)`
      );
    case 'add-row':
      return `a new row was added (${Object.entries(op.values)
        .map(([k, v]) => `${k}: ${fmt(v)}`)
        .join(', ')})`;
    case 'delete-row':
      return `this row was removed`;
    case 'merge':
      return `this duplicate row was removed and folded into ${op.keepRowKey}`;
  }
}

const RISK_EXPLAINER: Record<string, string> = {
  risky: "This needed your OK because it deletes, merges or renames a row, or changes something that's hard to undo cleanly.",
  closure: "Google's own listing says this shop is permanently closed, so its page now shows \"Permanently closed\" and it no longer appears in city listings. It keeps its web address and can be reversed.",
  'low-risk': 'A routine update from a trusted source.',
};

function renderChangeLine(entry: ChangeLogEntry, cmd: (id: string) => string): string {
  const { change } = entry;
  return `- **${change.rowKey}** (${change.sheet}) — ${describeOp(change.op)}. Why: ${change.reason} (source: ${change.source}). ${cmd(entry.id)}`;
}

/**
 * The log keeps every entry for a change's lifecycle (queued → applied →
 * undone, etc.) -- the digest should only ever describe a change's CURRENT
 * state, not every step it went through, or a change that was applied and
 * then undone within the same window would wrongly show as "still applied".
 */
function latestPerId(entries: ChangeLogEntry[]): ChangeLogEntry[] {
  const latest = new Map<string, ChangeLogEntry>();
  for (const e of entries) latest.set(e.id, e);
  return [...latest.values()];
}

export function buildDigest(input: DigestInput): string {
  const { weekLabel, changeLogEntries, clickTrend, jobStatuses } = input;
  const lines: string[] = [];

  lines.push(`# Weekly digest — ${weekLabel}`, '');
  lines.push(
    'This is a plain-English summary of what the automation did to your shop/show ' +
      'spreadsheet (the "sheet") this week, what still needs your OK, how taps and clicks ' +
      'are trending, and anything that broke. Every change below can be undone with the ' +
      '"undo" command shown next to it.',
    '',
  );

  const latest = latestPerId(changeLogEntries);
  const applied = latest.filter((e) => e.action === 'applied');
  const closures = applied.filter((e) => e.level === 'closure');
  const otherApplied = applied.filter((e) => e.level !== 'closure');
  const queued = latest.filter((e) => e.action === 'queued');
  const undone = latest.filter((e) => e.action === 'undone');

  lines.push('## What changed automatically');
  if (otherApplied.length === 0) {
    lines.push('Nothing was applied automatically this week.');
  } else {
    for (const e of otherApplied) lines.push(renderChangeLine(e, UNDO_CMD));
  }
  lines.push('');

  lines.push('## Shop closures (Google says permanently closed)');
  if (closures.length === 0) {
    lines.push('No closures were applied this week.');
  } else {
    lines.push(RISK_EXPLAINER['closure']!);
    for (const e of closures) lines.push(renderChangeLine(e, UNDO_CMD));
  }
  lines.push('');

  lines.push('## Waiting for your approval');
  if (queued.length === 0) {
    lines.push('Nothing is waiting on you this week.');
  } else {
    lines.push(
      'Each line below is a change an agent proposed but did not make — it needs a ' +
        'person to say yes. Copy the command shown to approve it, or ignore it to leave ' +
        'the sheet as-is.',
    );
    for (const e of queued) {
      lines.push(`${renderChangeLine(e, APPROVE_CMD)} — ${RISK_EXPLAINER[e.level] ?? ''}`);
    }
  }
  lines.push('');

  if (undone.length > 0) {
    lines.push('## Reversed this week');
    lines.push('These were undone, so the sheet is back to how it was before them. No action needed.');
    for (const e of undone) {
      lines.push(`- **${e.change.rowKey}** (${e.change.sheet}) — ${describeOp(e.change.op)} — undone (change id: ${e.id}).`);
    }
    lines.push('');
  }

  lines.push('## Taps and clicks (people pressing Call, Directions or Website)');
  if (clickTrend === undefined) {
    lines.push(
      'Not reachable this run — that data lives in Cloudflare (the hosting service that ' +
        'runs the click counter) and needs a one-time login step. Run ' +
        '`python3 scripts/click-report.py` first, then re-run this digest.',
    );
  } else if (clickTrend.length === 0) {
    lines.push('No taps have been recorded yet.');
  } else if (clickTrend.length === 1) {
    const only = clickTrend[0]!;
    lines.push(`Only one month of data so far — ${only.month}: ${only.total} taps.`);
  } else {
    const prev = clickTrend[clickTrend.length - 2]!;
    const curr = clickTrend[clickTrend.length - 1]!;
    const diff = curr.total - prev.total;
    const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
    const pct = prev.total === 0 ? undefined : Math.round((diff / prev.total) * 100);
    lines.push(
      `${curr.month}: ${curr.total} taps, ${direction} from ${prev.total} in ${prev.month}` +
        `${pct !== undefined ? ` (${pct > 0 ? '+' : ''}${pct}%)` : ''}.`,
    );
  }
  lines.push('');

  lines.push('## Anything failing');
  if (jobStatuses === undefined) {
    lines.push(
      'No automatic job-status feed is wired up yet — see ' +
        '`docs/superpowers/plans/2026-09-23-q4-sheet-automation.md` for what that would take.',
    );
  } else {
    const failing = jobStatuses.filter((j) => j.status === 'failing');
    if (failing.length === 0) {
      lines.push('Nothing is failing.');
    } else {
      for (const j of failing) lines.push(`- **${j.name}**: failing${j.note !== undefined ? ` — ${j.note}` : ''}`);
    }
  }
  lines.push('');

  lines.push('## Undoing anything above');
  lines.push(
    'Every applied change (including closures) has its own "undo" command printed next to ' +
      'it above. Running it puts that one cell or row back exactly the way it was — nothing ' +
      'else changes.',
  );

  return `${lines.join('\n')}\n`;
}
