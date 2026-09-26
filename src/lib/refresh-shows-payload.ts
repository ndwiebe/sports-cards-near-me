import { slugify } from './transform';
import type { ProposedChange } from './sheet-change-engine';

/**
 * One row of `docs/research/<date>-show-refresh-payload.csv`, as written by
 * `scripts/refresh-shows.py`'s own `csv.writer` in `main()`. Column order and
 * names come straight from that script's header row -- see the pinned check
 * in `parseRefreshShowsCsv` below, which fails loudly rather than silently
 * misreading a shifted column (same "pinned header" philosophy `CLAUDE.md`
 * calls out for the sheet bake scripts).
 */
export interface RefreshShowsRow {
  name: string;
  city: string;
  /** Already a 2-letter code (e.g. "AB") -- refresh-shows.py writes `PROVINCES[...]` itself. */
  province: string;
  venue: string;
  address: string;
  startDate: string;
  endDate: string;
  hours: string;
  admission: string;
  website: string;
  sourceUrl: string;
  recurring: string;
  /** One of NEW / CHANGED / KNOWN / COVERED-DAY / REVIEW-IDENTITY / REVIEW-MULTIDAY / PREVIOUSLY-REJECTED. */
  status: string;
}

const HEADER = [
  'Show Name',
  'City',
  'Province',
  'Venue',
  'Address',
  'StartDate',
  'EndDate',
  'Hours',
  'Admission',
  'Website',
  'SourceUrl',
  'Recurring',
  '_status',
] as const;

/**
 * Minimal CSV parser matching what Python's `csv.writer` produces (comma
 * separated, fields double-quoted only where needed, `""` for an embedded
 * quote). Deliberately not shared with `src/lib/weekly-digest.ts`'s own CSV
 * parser -- that one is scoped to a different file shape (click-events
 * reports) owned by a different lane's plan, and this repo has no shared CSV
 * utility to reuse instead of duplicating a couple dozen lines.
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

/**
 * Parses a `refresh-shows.py` payload CSV. Throws on a header mismatch
 * instead of guessing column positions -- a moved/renamed column would
 * otherwise silently misfile every field (e.g. a venue landing in the
 * address column) with no error anywhere downstream.
 */
export function parseRefreshShowsCsv(text: string): RefreshShowsRow[] {
  const rows = parseCsvRows(text);
  const header = rows[0];
  if (header === undefined) return [];
  const mismatch = HEADER.some((h, i) => header[i] !== h);
  if (mismatch) {
    throw new Error(
      `refresh-shows payload header mismatch: expected ${JSON.stringify(HEADER)}, got ${JSON.stringify(header)}. ` +
        `Refusing to guess column positions -- refresh-shows.py's CSV header must have changed.`,
    );
  }
  return rows.slice(1).map((r) => ({
    name: r[0] ?? '',
    city: r[1] ?? '',
    province: r[2] ?? '',
    venue: r[3] ?? '',
    address: r[4] ?? '',
    startDate: r[5] ?? '',
    endDate: r[6] ?? '',
    hours: r[7] ?? '',
    admission: r[8] ?? '',
    website: r[9] ?? '',
    sourceUrl: r[10] ?? '',
    recurring: r[11] ?? '',
    status: r[12] ?? '',
  }));
}

export interface ConversionResult {
  changes: ProposedChange[];
  skipped: { row: RefreshShowsRow; reason: string }[];
}

/**
 * Turns the NEW rows from a `refresh-shows.py` run into `add-row` proposals
 * for the sheet-change engine. Only `status === 'NEW'` rows are converted --
 * every other status (CHANGED, REVIEW-IDENTITY, REVIEW-MULTIDAY, KNOWN,
 * COVERED-DAY, PREVIOUSLY-REJECTED) is deliberately left OUT of the payload.
 * Those need a person to read `refresh-shows.py`'s own markdown report: an
 * `update` proposal isn't what the engine's `low-risk` add-row path was built
 * for, and a mis-shaped automatic proposal is a worse failure than simply not
 * proposing one yet (see `docs/superpowers/plans/2026-09-23-q4-sheet-automation.md`
 * §3 -- the engine classifies an `add-row` from `tcdb`/`refresh-shows.py` as
 * `low-risk`; nothing else in this row shape qualifies).
 *
 * The row key mirrors how `GoogleSheetsClient` and `rowToShow` (`src/lib/shows.ts`)
 * both derive a show's identity, so a show accepted here lines up with the
 * same slug once it's actually baked from the sheet:
 * `slugify(\`${name}-${city}-${startDate}\`)`.
 */
export function newShowRowsToProposedChanges(rows: RefreshShowsRow[], source: string): ConversionResult {
  const changes: ProposedChange[] = [];
  const skipped: { row: RefreshShowsRow; reason: string }[] = [];

  for (const row of rows) {
    if (row.status !== 'NEW') continue;
    if (row.name === '' || row.city === '' || row.province === '' || row.startDate === '') {
      skipped.push({ row, reason: 'missing a required field (name, city, province or start date)' });
      continue;
    }
    const rowKey = slugify(`${row.name}-${row.city}-${row.startDate}`);
    changes.push({
      sheet: 'Shows',
      rowKey,
      op: {
        kind: 'add-row',
        values: {
          Name: row.name,
          City: row.city,
          Province: row.province,
          Venue: row.venue,
          Address: row.address,
          StartDate: row.startDate,
          EndDate: row.endDate,
          Hours: row.hours,
          Admission: row.admission,
          Website: row.website,
          SourceUrl: row.sourceUrl,
          Recurring: row.recurring,
        },
      },
      source,
      reason: 'New show found by the weekly TCDB discovery scrape (refresh-shows.py) -- not yet on the sheet.',
    });
  }

  return { changes, skipped };
}
