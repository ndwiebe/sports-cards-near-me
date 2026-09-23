import { describe, it, expect } from 'vitest';
import { parseClickEventsCsv, summarizeMonthlyTaps, buildDigest } from '../../src/lib/weekly-digest';
import type { ChangeLogEntry } from '../../src/lib/sheet-change-engine';

describe('parseClickEventsCsv', () => {
  it('parses the click-events-report header shape', () => {
    const csv =
      'slug,name,destination_city,month,source_city,directions,call,website,combined\n' +
      'a-shop-edmonton,A Shop,edmonton,2026-08,alberta/edmonton,3,1,0,4\n' +
      'b-shop-calgary,B Shop,calgary,2026-09,unknown,2,0,1,3\n';
    const rows = parseClickEventsCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ slug: 'a-shop-edmonton', month: '2026-08', combined: 4 });
    expect(rows[1]).toMatchObject({ slug: 'b-shop-calgary', month: '2026-09', combined: 3 });
  });

  it('handles a quoted field containing a comma', () => {
    const csv =
      'slug,name,destination_city,month,source_city,directions,call,website,combined\n' +
      'x-shop,"X Shop, Inc",edmonton,2026-08,unknown,1,0,0,1\n';
    const rows = parseClickEventsCsv(csv);
    expect(rows[0]?.name).toBe('X Shop, Inc');
  });

  it('returns an empty array for a header-only file', () => {
    const csv = 'slug,name,destination_city,month,source_city,directions,call,website,combined\n';
    expect(parseClickEventsCsv(csv)).toEqual([]);
  });
});

describe('summarizeMonthlyTaps', () => {
  it('sums combined taps per month across rows, sorted chronologically', () => {
    const rows = [
      { slug: 'a', name: 'A', destination_city: 'x', month: '2026-08', source_city: 'unknown', directions: 1, call: 0, website: 0, combined: 1 },
      { slug: 'b', name: 'B', destination_city: 'x', month: '2026-08', source_city: 'unknown', directions: 0, call: 2, website: 0, combined: 2 },
      { slug: 'a', name: 'A', destination_city: 'x', month: '2026-09', source_city: 'unknown', directions: 4, call: 0, website: 1, combined: 5 },
    ];
    expect(summarizeMonthlyTaps(rows)).toEqual([
      { month: '2026-08', total: 3 },
      { month: '2026-09', total: 5 },
    ]);
  });

  it('returns an empty array for no rows', () => {
    expect(summarizeMonthlyTaps([])).toEqual([]);
  });
});

const changeEntry = (over: Partial<ChangeLogEntry> = {}): ChangeLogEntry => ({
  id: '11111111-1111-1111-1111-111111111111',
  timestamp: '2026-09-20T00:00:00.000Z',
  action: 'applied',
  change: {
    sheet: 'Stores',
    rowKey: 'a-shop-edmonton',
    op: { kind: 'update', column: 'Hours', oldValue: 'old hours', newValue: 'new hours' },
    source: 'refresh-ratings.py',
    reason: 'Google Places refresh',
  },
  level: 'low-risk',
  ...over,
});

describe('buildDigest', () => {
  it('renders a fully-empty week in plain English, with no crash', () => {
    const md = buildDigest({ weekLabel: 'Sept 17 – Sept 23, 2026', changeLogEntries: [] });
    expect(md).toContain('Sept 17 – Sept 23, 2026');
    expect(md).toContain('Nothing was applied automatically this week');
    expect(md).toContain('Nothing is waiting on you this week');
    expect(md).toMatch(/not reachable this run/i);
    expect(md).toMatch(/no automatic job-status feed/i);
  });

  it('lists an applied low-risk change in plain English', () => {
    const md = buildDigest({
      weekLabel: 'Sept 17 – Sept 23, 2026',
      changeLogEntries: [changeEntry()],
    });
    expect(md).toContain('Hours');
    expect(md).toContain('a-shop-edmonton');
    expect(md).toContain('refresh-ratings.py');
  });

  it('calls out an applied closure separately, with the undo command', () => {
    const md = buildDigest({
      weekLabel: 'Sept 17 – Sept 23, 2026',
      changeLogEntries: [
        changeEntry({
          id: 'closure-1',
          change: {
            sheet: 'Stores',
            rowKey: 'closed-shop-edmonton',
            op: { kind: 'update', column: 'Status', oldValue: '', newValue: 'closed' },
            source: 'refresh-ratings.py',
            reason: 'Google says permanently closed',
          },
          level: 'closure',
        }),
      ],
    });
    expect(md).toMatch(/closed-shop-edmonton/);
    expect(md).toContain('npx tsx scripts/sheet-change-engine.ts undo closure-1');
  });

  it('lists a queued change with the exact approve command', () => {
    const md = buildDigest({
      weekLabel: 'Sept 17 – Sept 23, 2026',
      changeLogEntries: [
        changeEntry({
          id: 'queued-1',
          action: 'queued',
          level: 'risky',
          change: {
            sheet: 'Stores',
            rowKey: 'dup-shop-edmonton',
            op: { kind: 'delete-row', snapshot: { Name: 'Dup Shop' } },
            source: 'tcdb',
            reason: 'duplicate of a-shop-edmonton',
          },
        }),
      ],
    });
    expect(md).toContain('npx tsx scripts/sheet-change-engine.ts approve queued-1');
    expect(md).toMatch(/dup-shop-edmonton/);
  });

  it('describes a click trend when data is reachable', () => {
    const md = buildDigest({
      weekLabel: 'Sept 17 – Sept 23, 2026',
      changeLogEntries: [],
      clickTrend: [
        { month: '2026-08', total: 10 },
        { month: '2026-09', total: 25 },
      ],
    });
    expect(md).toMatch(/10/);
    expect(md).toMatch(/25/);
    expect(md).not.toMatch(/not reachable this run/i);
  });

  it('shows only the latest state per change id -- an applied-then-undone change is reversed, not "changed automatically"', () => {
    const md = buildDigest({
      weekLabel: 'Sept 17 – Sept 23, 2026',
      changeLogEntries: [
        changeEntry({ id: 'flip-flop', action: 'applied', timestamp: '2026-09-20T00:00:00.000Z' }),
        changeEntry({ id: 'flip-flop', action: 'undone', timestamp: '2026-09-21T00:00:00.000Z' }),
      ],
    });
    expect(md).toContain('Nothing was applied automatically this week');
    expect(md).toMatch(/## Reversed this week/);
    expect(md).toContain('flip-flop');
  });

  it('lists failing jobs when a job-status feed is supplied', () => {
    const md = buildDigest({
      weekLabel: 'Sept 17 – Sept 23, 2026',
      changeLogEntries: [],
      jobStatuses: [{ name: 'nightly bake', status: 'failing', note: 'sheet returned 0 rows' }],
    });
    expect(md).toContain('nightly bake');
    expect(md).toContain('sheet returned 0 rows');
  });
});
