import { slugify } from './transform';
import type { CellValue } from './sheet-change-client';
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

/**
 * The minimal shape of an already-on-the-sheet show this converter needs to
 * find a match and compute an `update` op's `oldValue` -- a subset of
 * `ShowRecord` (`src/lib/shows.ts`), passed in rather than imported so this
 * module doesn't have to depend on the gviz-parsing half of that file. In
 * practice the caller (`scripts/refresh-shows-to-payload.ts`) loads this from
 * the committed `src/data/shows.json` -- the very same "ours" snapshot
 * `refresh-shows.py` itself read when it decided a row was CHANGED or
 * REVIEW-MULTIDAY, so a match found here should always agree with the
 * classification already stamped on the row.
 */
export interface ExistingShow {
  slug: string;
  name: string;
  city: string;
  province: string;
  venue?: string | undefined;
  address?: string | undefined;
  startDate: string;
  endDate?: string | undefined;
  hours?: string | undefined;
}

/**
 * A row `refresh-shows.py` flagged for a closer look that this converter
 * deliberately never turns into a `ProposedChange` -- see the
 * per-status handling in `refreshShowRowsToProposedChanges` below. Shown to
 * Nathan in the weekly digest's "Held for a closer look" section so nothing
 * silently disappears; nothing here ever touches the sheet.
 */
export interface HeldItem {
  row: RefreshShowsRow;
  /** Plain English -- shown to Nathan as-is, no further translation. */
  reason: string;
}

export interface ConversionResult {
  changes: ProposedChange[];
  held: HeldItem[];
  skipped: { row: RefreshShowsRow; reason: string }[];
}

// Same known upstream misspellings `refresh-shows.py` corrects for (see that
// script's own `SOURCE_CITY_ALIASES`) -- needed here too so a match against
// `src/data/shows.json` doesn't miss on exactly the cities that script
// already had to special-case.
const CITY_ALIASES: Record<string, string> = { stcatherines: 'stcatharines', lloyminster: 'lloydminster' };

/** Strips accents/punctuation/case for COMPARISON only -- mirrors `refresh-shows.py`'s `norm_city`. */
function normKey(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normCityKey(city: string): string {
  const k = normKey(city);
  return CITY_ALIASES[k] ?? k;
}

/** Mirrors `refresh-shows.py`'s `flag_adjacent_new_days`: "Day 1"/"Day 2" is cadence, not identity. */
function stripDayNumber(name: string): string {
  return name.replace(/\bday\s*\d+\b/gi, '');
}

function addDaysIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

/**
 * Finds the one existing show a `CHANGED` row belongs to. Mirrors
 * `refresh-shows.py`'s `match_existing` candidate filter (same province,
 * same normalized city, the row's date inside the show's [start, end] range)
 * -- by construction a row is only ever stamped `CHANGED` once that script
 * has already resolved it to exactly one such show, so re-deriving the same
 * filter here should always land on exactly one candidate too. Returns
 * `undefined` on 0 or 2+ candidates rather than guessing -- a disagreement
 * with the Python classification is exactly the case that should go to the
 * held list, not silently pick one.
 */
function findChangedMatch(row: RefreshShowsRow, existingShows: ExistingShow[]): ExistingShow | undefined {
  const candidates = existingShows.filter(
    (s) =>
      s.province === row.province &&
      normCityKey(s.city) === normCityKey(row.city) &&
      s.startDate <= row.startDate &&
      row.startDate <= (s.endDate || s.startDate),
  );
  return candidates.length === 1 ? candidates[0] : undefined;
}

interface MultidayExtension {
  show: ExistingShow;
  column: 'EndDate' | 'StartDate';
  oldValue: CellValue;
}

/**
 * Finds an existing show a `REVIEW-MULTIDAY` row extends: one matching on
 * name (ignoring a "Day N" suffix), city and venue, whose date range the
 * row's date sits immediately next to (a one-day gap, either direction) --
 * exactly the "if an existing show matches on name, city and venue, and the
 * new day is adjacent to its date range" test from the 2026-09-26 decision.
 * Requires a non-blank venue on both sides: two shows with no venue on file
 * would otherwise look identical here, which is exactly the wrong moment to
 * guess. Returns `undefined` (hold it) for 0 or 2+ name/city/venue matches,
 * or a match whose date isn't actually adjacent.
 */
function findMultidayMatch(row: RefreshShowsRow, existingShows: ExistingShow[]): MultidayExtension | undefined {
  if (row.venue === '') return undefined;
  const candidates = existingShows.filter(
    (s) =>
      s.province === row.province &&
      normCityKey(s.city) === normCityKey(row.city) &&
      (s.venue ?? '') !== '' &&
      normKey(s.venue ?? '') === normKey(row.venue) &&
      normKey(stripDayNumber(s.name)) === normKey(stripDayNumber(row.name)),
  );
  if (candidates.length !== 1) return undefined;
  const show = candidates[0]!;
  const end = show.endDate ?? show.startDate;
  if (row.startDate === addDaysIso(end, 1)) return { show, column: 'EndDate', oldValue: show.endDate ?? null };
  if (row.startDate === addDaysIso(show.startDate, -1)) return { show, column: 'StartDate', oldValue: show.startDate };
  return undefined;
}

/**
 * One `update` op per field `refresh-shows.py`'s own CHANGED test actually
 * found different. `oldValue` uses `?? ''` (never `?? null`) for these three
 * -- Venue/Hours/Address are plain TEXT sheet columns, and every `SheetClient`
 * in this repo (`GoogleSheetsClient.rawToCellValue`, `JsonFileSheetClient`'s
 * fixtures, `InMemorySheetClient`) represents a blank text cell as `''`, not
 * `null` -- only a DATE column (EndDate/StartDate, see `findMultidayMatch`)
 * legitimately reads back as `null` when blank. Using `null` here would make
 * the engine's optimistic check (`checkCurrent`) refuse a perfectly current
 * change as "changed since this was proposed" every time the field started
 * out blank -- caught 2026-09-27 running this for real against the TEST COPY
 * sheet (`vancity-card-show-vancouver-2026-10-02`'s blank Hours).
 */
function buildChangedOps(row: RefreshShowsRow, existing: ExistingShow): { column: 'Venue' | 'Hours' | 'Address'; oldValue: CellValue; newValue: string }[] {
  const ops: { column: 'Venue' | 'Hours' | 'Address'; oldValue: CellValue; newValue: string }[] = [];
  if (row.venue !== '' && row.venue !== (existing.venue ?? '')) {
    ops.push({ column: 'Venue', oldValue: existing.venue ?? '', newValue: row.venue });
  }
  if (row.hours !== '' && row.hours !== (existing.hours ?? '')) {
    ops.push({ column: 'Hours', oldValue: existing.hours ?? '', newValue: row.hours });
  }
  if ((existing.address ?? '') === '' && row.address !== '') {
    ops.push({ column: 'Address', oldValue: existing.address ?? '', newValue: row.address });
  }
  return ops;
}

/**
 * Turns a `refresh-shows.py` run's NEW/CHANGED/REVIEW-IDENTITY/REVIEW-MULTIDAY
 * rows into `ProposedChange`s (for NEW/CHANGED/matched-REVIEW-MULTIDAY) or
 * `HeldItem`s (for REVIEW-IDENTITY, and any REVIEW-MULTIDAY row that can't be
 * matched to an existing show) per the 2026-09-26 decision
 * (`~/jarvis-memory/decisions/2026/2026-09-26-scnm-new-shows-auto-post.md`):
 *
 * - `NEW` -> `add-row`.
 * - `CHANGED` -> `update` op(s) on the matching existing row's changed fields
 *   (Venue, Hours, Address).
 * - `REVIEW-MULTIDAY` -> an `update` extending EndDate (or StartDate) when a
 *   name+city+venue match with an adjacent date range is found; held
 *   otherwise.
 * - `REVIEW-IDENTITY` -> always held; never becomes a change.
 * - `KNOWN`, `COVERED-DAY`, `GONE`, `PREVIOUSLY-REJECTED` (and anything else)
 *   -> ignored entirely (no change, not held -- `refresh-shows.py`'s CSV
 *   already excludes KNOWN/COVERED-DAY, and GONE is reported only, never in
 *   this CSV at all).
 *
 * The row key for a NEW row mirrors how `GoogleSheetsClient` and `rowToShow`
 * (`src/lib/shows.ts`) both derive a show's identity:
 * `slugify(\`${name}-${city}-${startDate}\`)`. CHANGED/REVIEW-MULTIDAY reuse
 * the matched existing show's own `slug` instead, since those act on a row
 * that's already on the sheet.
 */
export function refreshShowRowsToProposedChanges(
  rows: RefreshShowsRow[],
  source: string,
  existingShows: ExistingShow[],
): ConversionResult {
  const changes: ProposedChange[] = [];
  const held: HeldItem[] = [];
  const skipped: { row: RefreshShowsRow; reason: string }[] = [];

  for (const row of rows) {
    switch (row.status) {
      case 'NEW': {
        if (row.name === '' || row.city === '' || row.province === '' || row.startDate === '') {
          skipped.push({ row, reason: 'missing a required field (name, city, province or start date)' });
          continue;
        }
        changes.push({
          sheet: 'Shows',
          rowKey: slugify(`${row.name}-${row.city}-${row.startDate}`),
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
        break;
      }

      case 'CHANGED': {
        const existing = findChangedMatch(row, existingShows);
        if (existing === undefined) {
          held.push({
            row,
            reason:
              `refresh-shows.py flagged ${row.name} (${row.city}, ${row.startDate}) as changed, but this couldn't ` +
              `be matched back to exactly one existing show on the sheet -- needs a quick human look.`,
          });
          continue;
        }
        const ops = buildChangedOps(row, existing);
        if (ops.length === 0) {
          held.push({
            row,
            reason:
              `refresh-shows.py flagged ${row.name} (${row.city}, ${row.startDate}) as changed, but no field on ` +
              `${existing.name} actually looks different right now -- needs a quick human look.`,
          });
          continue;
        }
        for (const op of ops) {
          changes.push({
            sheet: 'Shows',
            rowKey: existing.slug,
            op: { kind: 'update', column: op.column, oldValue: op.oldValue, newValue: op.newValue },
            source,
            reason: `refresh-shows.py found this show's ${op.column.toLowerCase()} changed on TCDB.`,
          });
        }
        break;
      }

      case 'REVIEW-MULTIDAY': {
        const match = findMultidayMatch(row, existingShows);
        if (match === undefined) {
          held.push({
            row,
            reason:
              `${row.name} (${row.city}, ${row.startDate}) looks like it could be an extra day of an existing show ` +
              `at ${row.venue || 'the same venue'}, but no existing show matched closely enough (same name, city and ` +
              `venue, with the new day right next to its dates) to extend automatically -- needs a quick human look.`,
          });
          continue;
        }
        changes.push({
          sheet: 'Shows',
          rowKey: match.show.slug,
          op: { kind: 'update', column: match.column, oldValue: match.oldValue, newValue: row.startDate },
          source,
          reason:
            `refresh-shows.py found ${row.startDate} listed as an extra day right next to ${match.show.name}'s dates -- ` +
            `extending its ${match.column === 'EndDate' ? 'end' : 'start'} date to include it.`,
        });
        break;
      }

      case 'REVIEW-IDENTITY': {
        held.push({
          row,
          reason:
            `${row.name} (${row.city}, ${row.startDate}) is the same city and around the same date as an existing ` +
            `show, but refresh-shows.py couldn't tell whether it's the same event or a different promoter using the ` +
            `same weekend -- needs a quick human look before it's added or matched to anything.`,
        });
        break;
      }

      default:
        // KNOWN, COVERED-DAY, GONE, PREVIOUSLY-REJECTED (and anything else
        // refresh-shows.py might emit in the future): no change, not held.
        break;
    }
  }

  return { changes, held, skipped };
}
