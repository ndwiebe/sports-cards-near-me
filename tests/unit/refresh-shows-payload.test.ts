import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classifyChange } from '../../src/lib/sheet-change-engine';
import { refreshShowRowsToProposedChanges, parseRefreshShowsCsv } from '../../src/lib/refresh-shows-payload';
import type { ExistingShow, RefreshShowsRow } from '../../src/lib/refresh-shows-payload';

const FIXTURE_PATH = join(__dirname, '../../scripts/fixtures/refresh-shows-sample-payload.csv');
const FIXTURE_CSV = readFileSync(FIXTURE_PATH, 'utf8');

describe('parseRefreshShowsCsv', () => {
  it('parses every row from the fixture, including a NEW row with a quoted comma-bearing address', () => {
    const rows = parseRefreshShowsCsv(FIXTURE_CSV);
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual<RefreshShowsRow>({
      name: 'Red Deer Card Show',
      city: 'Red Deer',
      province: 'AB',
      venue: 'Westerner Park',
      address: '4847A 19 St, Red Deer, AB',
      startDate: '2026-11-14',
      endDate: '',
      hours: '10am-4pm',
      admission: '',
      website: 'https://reddeercardshow.example/',
      sourceUrl: 'https://www.tcdb.com/CardShows.cfm?MODE=VIEW&ID=1',
      recurring: '',
      status: 'NEW',
    });
  });

  it('carries every status through untouched (filtering is the converter\'s job, not the parser\'s)', () => {
    const rows = parseRefreshShowsCsv(FIXTURE_CSV);
    expect(rows.map((r) => r.status)).toEqual([
      'NEW',
      'NEW',
      'CHANGED',
      'REVIEW-IDENTITY',
      'REVIEW-MULTIDAY',
      'REVIEW-MULTIDAY',
    ]);
  });

  it('throws on a header that does not match refresh-shows.py\'s own column order', () => {
    expect(() => parseRefreshShowsCsv('Wrong,Header\nrow,1\n')).toThrow(/header mismatch/);
  });

  it('returns an empty array for an empty file', () => {
    expect(parseRefreshShowsCsv('')).toEqual([]);
  });
});

/**
 * Deliberately NOT real sheet data -- these exist only to exercise the
 * matching logic (`findChangedMatch`/`findMultidayMatch`) against known
 * inputs. The row's own name/city/venue are real public show data (trimmed
 * from `docs/research/2026-09-26-show-refresh-payload.csv`); the "existing
 * show" each one is matched against here is a fabricated stand-in for
 * whatever the real sheet holds.
 */
const EXISTING_SHOWS: ExistingShow[] = [
  {
    slug: 'capital-trade-shows-card-comic-show-ottawa-2026-10-11',
    name: 'Capital Trade Shows: Card & Comic Show',
    city: 'Ottawa',
    province: 'ON',
    venue: 'Nepean Sportsplex (Hall A & B)', // differs from the CSV row's "Nepean Sportsplex"
    address: '', // blank on the sheet -> the CSV row's address is a genuine addition
    startDate: '2026-10-11',
  },
  {
    // A single-day show already on the sheet; the CSV's 2026-11-08 row is the very next day.
    slug: 'card-yard-card-show-hamilton-2026-11-07',
    name: 'Card Yard Card Show',
    city: 'Hamilton',
    province: 'ON',
    venue: 'Eastgate Square',
    startDate: '2026-11-07',
  },
  {
    // Same name/city/date-adjacency as the CSV's Stampede City row, but a DIFFERENT venue --
    // this is what should make the match fail and the row get held instead.
    slug: 'stampede-city-card-show-calgary-2026-12-04',
    name: 'Stampede City Card Show',
    city: 'Calgary',
    province: 'AB',
    venue: 'Some Other Banquet Hall',
    startDate: '2026-12-04',
  },
];

describe('refreshShowRowsToProposedChanges', () => {
  const rows = parseRefreshShowsCsv(FIXTURE_CSV);

  it('converts NEW rows to add-row and leaves CHANGED/REVIEW-IDENTITY out of `changes` when nothing matches', () => {
    const { changes } = refreshShowRowsToProposedChanges(rows, 'refresh-shows.py', []);
    // With no existing shows to match against, CHANGED and REVIEW-MULTIDAY hold instead of converting.
    expect(changes.filter((c) => c.op.kind === 'add-row').map((c) => c.rowKey)).toEqual([
      'red-deer-card-show-red-deer-2026-11-14',
      'lethbridge-sports-card-expo-lethbridge-2026-12-05',
    ]);
    expect(changes.every((c) => c.op.kind === 'add-row')).toBe(true);
  });

  it('derives a NEW row key the same way GoogleSheetsClient/rowToShow do (slugify(name-city-startDate))', () => {
    const { changes } = refreshShowRowsToProposedChanges(rows, 'refresh-shows.py', []);
    expect(changes[0]?.rowKey).toBe('red-deer-card-show-red-deer-2026-11-14');
  });

  it('carries the show fields into a NEW row\'s add-row values', () => {
    const { changes } = refreshShowRowsToProposedChanges(rows, 'refresh-shows.py', []);
    expect(changes[0]?.op).toEqual({
      kind: 'add-row',
      values: {
        Name: 'Red Deer Card Show',
        City: 'Red Deer',
        Province: 'AB',
        Venue: 'Westerner Park',
        Address: '4847A 19 St, Red Deer, AB',
        StartDate: '2026-11-14',
        EndDate: '',
        Hours: '10am-4pm',
        Admission: '',
        Website: 'https://reddeercardshow.example/',
        SourceUrl: 'https://www.tcdb.com/CardShows.cfm?MODE=VIEW&ID=1',
        Recurring: '',
      },
    });
  });

  it('classifies a NEW row\'s add-row as show-autopost once fed through the real engine (refresh-shows.py)', () => {
    const { changes } = refreshShowRowsToProposedChanges(rows, 'refresh-shows.py', []);
    for (const c of changes) expect(classifyChange(c)).toBe('show-autopost');
  });

  it('still classifies as low-risk (not show-autopost) for the other trusted add-row source, tcdb', () => {
    const { changes } = refreshShowRowsToProposedChanges(rows, 'tcdb', []);
    expect(changes.every((c) => c.source === 'tcdb')).toBe(true);
    for (const c of changes) expect(classifyChange(c)).toBe('low-risk');
  });

  it('classifies as risky (not show-autopost or low-risk) for an untrusted source -- the allowlist is real', () => {
    const { changes } = refreshShowRowsToProposedChanges(rows, 'someone-untrusted', []);
    for (const c of changes) expect(classifyChange(c)).toBe('risky');
  });

  it('skips a NEW row missing a required field instead of proposing a broken add-row', () => {
    const rowsWithBad: RefreshShowsRow[] = [...rows, { ...rows[0]!, name: '', status: 'NEW' }];
    const { changes, skipped } = refreshShowRowsToProposedChanges(rowsWithBad, 'refresh-shows.py', []);
    expect(changes.filter((c) => c.op.kind === 'add-row')).toHaveLength(2);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]?.reason).toMatch(/missing a required field/);
  });

  it('produces no changes, no held items and no error for an all-KNOWN payload', () => {
    const known: RefreshShowsRow[] = rows.map((r) => ({ ...r, status: 'KNOWN' }));
    expect(refreshShowRowsToProposedChanges(known, 'refresh-shows.py', [])).toEqual({
      changes: [],
      held: [],
      skipped: [],
    });
  });

  it('ignores COVERED-DAY, GONE and PREVIOUSLY-REJECTED rows entirely -- no change, not held', () => {
    for (const status of ['COVERED-DAY', 'GONE', 'PREVIOUSLY-REJECTED']) {
      const ignoredRows: RefreshShowsRow[] = [{ ...rows[0]!, status }];
      const result = refreshShowRowsToProposedChanges(ignoredRows, 'refresh-shows.py', []);
      expect(result).toEqual({ changes: [], held: [], skipped: [] });
    }
  });

  it('a REVIEW-IDENTITY row never produces a change, even when it could match an existing show', () => {
    const { changes, held } = refreshShowRowsToProposedChanges(rows, 'refresh-shows.py', EXISTING_SHOWS);
    const identityRow = rows.find((r) => r.status === 'REVIEW-IDENTITY')!;
    expect(changes.some((c) => c.reason.includes(identityRow.name))).toBe(false);
    expect(held.some((h) => h.row === identityRow)).toBe(true);
    expect(held.find((h) => h.row === identityRow)?.reason).toMatch(/same event|different promoter/i);
  });

  it('CHANGED converts to update ops on the matched existing row\'s changed fields', () => {
    const { changes } = refreshShowRowsToProposedChanges(rows, 'refresh-shows.py', EXISTING_SHOWS);
    const updates = changes.filter((c) => c.rowKey === 'capital-trade-shows-card-comic-show-ottawa-2026-10-11');
    expect(updates).toHaveLength(3);
    expect(updates.map((c) => (c.op.kind === 'update' ? c.op.column : undefined)).sort()).toEqual([
      'Address',
      'Hours',
      'Venue',
    ]);
    const venueOp = updates.find((c) => c.op.kind === 'update' && c.op.column === 'Venue');
    expect(venueOp?.op).toEqual({
      kind: 'update',
      column: 'Venue',
      oldValue: 'Nepean Sportsplex (Hall A & B)',
      newValue: 'Nepean Sportsplex',
    });
    for (const c of updates) expect(classifyChange(c)).toBe('show-autopost');
  });

  it('CHANGED holds instead of guessing when the existing show can\'t be matched uniquely', () => {
    const { changes, held } = refreshShowRowsToProposedChanges(rows, 'refresh-shows.py', []);
    expect(changes.some((c) => c.rowKey === 'capital-trade-shows-card-comic-show-ottawa-2026-10-11')).toBe(false);
    const changedRow = rows.find((r) => r.status === 'CHANGED')!;
    expect(held.some((h) => h.row === changedRow)).toBe(true);
  });

  it('REVIEW-MULTIDAY extends the matched existing show\'s EndDate when name, city and venue all match', () => {
    const { changes } = refreshShowRowsToProposedChanges(rows, 'refresh-shows.py', EXISTING_SHOWS);
    const extension = changes.find((c) => c.rowKey === 'card-yard-card-show-hamilton-2026-11-07');
    expect(extension?.op).toEqual({ kind: 'update', column: 'EndDate', oldValue: null, newValue: '2026-11-08' });
    expect(extension && classifyChange(extension)).toBe('show-autopost');
  });

  it('a multiday row with a mismatched venue is held, not extended', () => {
    const { changes, held } = refreshShowRowsToProposedChanges(rows, 'refresh-shows.py', EXISTING_SHOWS);
    expect(changes.some((c) => c.rowKey === 'stampede-city-card-show-calgary-2026-12-04')).toBe(false);
    const stampedeRow = rows.find((r) => r.name === 'Stampede City Card Show')!;
    expect(held.some((h) => h.row === stampedeRow)).toBe(true);
    expect(held.find((h) => h.row === stampedeRow)?.reason).toMatch(/no existing show matched/i);
  });

  it('a multiday row is held when nothing matches on name/city/venue at all', () => {
    const { changes, held } = refreshShowRowsToProposedChanges(rows, 'refresh-shows.py', []);
    const multidayRows = rows.filter((r) => r.status === 'REVIEW-MULTIDAY');
    expect(changes.some((c) => multidayRows.some((r) => c.reason.includes(r.name)))).toBe(false);
    expect(multidayRows.every((r) => held.some((h) => h.row === r))).toBe(true);
  });
});
