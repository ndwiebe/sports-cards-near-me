import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classifyChange } from '../../src/lib/sheet-change-engine';
import { newShowRowsToProposedChanges, parseRefreshShowsCsv } from '../../src/lib/refresh-shows-payload';
import type { RefreshShowsRow } from '../../src/lib/refresh-shows-payload';

const FIXTURE_PATH = join(__dirname, '../../scripts/fixtures/refresh-shows-sample-payload.csv');
const FIXTURE_CSV = readFileSync(FIXTURE_PATH, 'utf8');

describe('parseRefreshShowsCsv', () => {
  it('parses every row from the fixture, including a NEW row with a quoted comma-bearing address', () => {
    const rows = parseRefreshShowsCsv(FIXTURE_CSV);
    expect(rows).toHaveLength(4);
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
    expect(rows.map((r) => r.status)).toEqual(['NEW', 'NEW', 'CHANGED', 'REVIEW-IDENTITY']);
  });

  it('throws on a header that does not match refresh-shows.py\'s own column order', () => {
    expect(() => parseRefreshShowsCsv('Wrong,Header\nrow,1\n')).toThrow(/header mismatch/);
  });

  it('returns an empty array for an empty file', () => {
    expect(parseRefreshShowsCsv('')).toEqual([]);
  });
});

describe('newShowRowsToProposedChanges', () => {
  const rows = parseRefreshShowsCsv(FIXTURE_CSV);

  it('only converts NEW rows -- CHANGED and REVIEW-IDENTITY are left for a human', () => {
    const { changes } = newShowRowsToProposedChanges(rows, 'refresh-shows.py');
    expect(changes).toHaveLength(2);
    expect(changes.map((c) => c.rowKey)).toEqual([
      'red-deer-card-show-red-deer-2026-11-14',
      'lethbridge-sports-card-expo-lethbridge-2026-12-05',
    ]);
  });

  it('derives the row key the same way GoogleSheetsClient/rowToShow do (slugify(name-city-startDate))', () => {
    const { changes } = newShowRowsToProposedChanges(rows, 'refresh-shows.py');
    expect(changes[0]?.rowKey).toBe('red-deer-card-show-red-deer-2026-11-14');
  });

  it('carries the show fields into the add-row values', () => {
    const { changes } = newShowRowsToProposedChanges(rows, 'refresh-shows.py');
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

  it('classifies every produced change as low-risk once fed through the real engine', () => {
    const { changes } = newShowRowsToProposedChanges(rows, 'refresh-shows.py');
    for (const c of changes) expect(classifyChange(c)).toBe('low-risk');
  });

  it('also classifies as low-risk for the other trusted add-row source, tcdb', () => {
    const { changes } = newShowRowsToProposedChanges(rows, 'tcdb');
    expect(changes.every((c) => c.source === 'tcdb')).toBe(true);
    for (const c of changes) expect(classifyChange(c)).toBe('low-risk');
  });

  it('classifies as risky (not low-risk) for an untrusted source -- the allowlist is real', () => {
    const { changes } = newShowRowsToProposedChanges(rows, 'someone-untrusted');
    for (const c of changes) expect(classifyChange(c)).toBe('risky');
  });

  it('skips a NEW row missing a required field instead of proposing a broken add-row', () => {
    const rowsWithBad: RefreshShowsRow[] = [...rows, { ...rows[0]!, name: '', status: 'NEW' }];
    const { changes, skipped } = newShowRowsToProposedChanges(rowsWithBad, 'refresh-shows.py');
    expect(changes).toHaveLength(2);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]?.reason).toMatch(/missing a required field/);
  });

  it('produces no changes and no error for an all-KNOWN payload', () => {
    const known: RefreshShowsRow[] = rows.map((r) => ({ ...r, status: 'KNOWN' }));
    expect(newShowRowsToProposedChanges(known, 'refresh-shows.py')).toEqual({ changes: [], skipped: [] });
  });
});
