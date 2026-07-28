import { describe, it, expect } from 'vitest';
import {
  rowToShow,
  parseLocalDate,
  isUpcoming,
  groupShowsByMonth,
  showsInProvinceYear,
  weekendWindow,
  isInWeekend,
  showsThisWeekend,
} from '../../src/lib/shows';
import type { ShowRecord } from '../../src/lib/shows';
import type { GvizRow, GvizCell } from '../../src/lib/sheet';

const cell = (v: string | number | null, f?: string): GvizCell | null =>
  v === null ? null : f !== undefined ? { v, f } : { v };

// Start/End Date columns are native Sheets date cells: gviz returns v as a
// locale-independent "Date(y,m,d)" constructor string (0-indexed month) —
// the ground truth — and f as the sheet's locale-formatted display text,
// which is only ISO YYYY-MM-DD incidentally and not guaranteed to stay that
// way. rowToShow must parse the date from `v`'s Date(...) constructor, not
// trust `f`.
const row = (over: Partial<Record<number, GvizCell | null>> = {}): GvizRow => {
  const base: (GvizCell | null)[] = [
    cell('Calgary Card Expo'),
    cell('Calgary'),
    cell('AB'),
    cell('BMO Centre'),
    cell('20 Roundup Way SE, Calgary, AB T2G 2W1'),
    cell('Date(2026,7,15)', '2026-08-15'),
    cell('Date(2026,7,16)', '2026-08-16'),
    cell('10am-5pm'),
    cell('$5'),
    cell('https://calgarycardexpo.example/'),
    cell('https://source.example/calgary'),
    cell('Annual'),
  ];
  return base.map((c, i) => (i in over ? (over[i] ?? null) : c));
};

describe('rowToShow', () => {
  it('maps a valid full row', () => {
    const s = rowToShow(row());
    expect(s).toMatchObject({
      slug: 'calgary-card-expo-calgary-2026-08-15',
      name: 'Calgary Card Expo',
      city: 'Calgary',
      citySlug: 'calgary',
      province: 'AB',
      venue: 'BMO Centre',
      address: '20 Roundup Way SE, Calgary, AB T2G 2W1',
      startDate: '2026-08-15',
      endDate: '2026-08-16',
      hours: '10am-5pm',
      admission: '$5',
      website: 'https://calgarycardexpo.example/',
      sourceUrl: 'https://source.example/calgary',
      recurring: 'Annual',
    });
  });

  it('drops rows missing name, city, province, or startDate', () => {
    expect(rowToShow(row({ 0: null }))).toBeNull();
    expect(rowToShow(row({ 1: null }))).toBeNull();
    expect(rowToShow(row({ 2: null }))).toBeNull();
    expect(rowToShow(row({ 5: null }))).toBeNull();
  });

  it('reads plain ISO text dates too (no `f`, in case a cell is text-formatted)', () => {
    const s = rowToShow(row({ 5: cell('2026-08-15'), 6: cell('2026-08-16') }));
    expect(s?.startDate).toBe('2026-08-15');
    expect(s?.endDate).toBe('2026-08-16');
  });

  it('parses the Date(y,m0,d) constructor in `v` with 0-indexed month, even with no `f`', () => {
    const s = rowToShow(row({ 5: cell('Date(2026,6,10)') }));
    expect(s?.startDate).toBe('2026-07-10');
  });

  it('trusts `v` over a locale-formatted `f` that is not ISO text', () => {
    const s = rowToShow(row({ 5: cell('Date(2026,6,10)', '7/10/2026') }));
    expect(s?.startDate).toBe('2026-07-10');
  });

  it('drops non-http(s) website/source values to undefined', () => {
    expect(rowToShow(row({ 9: cell('javascript:alert(1)') }))?.website).toBeUndefined();
    expect(rowToShow(row({ 10: cell('ftp://example.com') }))?.sourceUrl).toBeUndefined();
    expect(rowToShow(row())?.website).toBe('https://calgarycardexpo.example/');
  });

  it('builds the slug from name-city-startDate', () => {
    const s = rowToShow(
      row({ 0: cell('Winter Trading Card Show'), 1: cell('Winnipeg'), 5: cell('Date(2027,0,9)', '2027-01-09') }),
    );
    expect(s?.slug).toBe('winter-trading-card-show-winnipeg-2027-01-09');
  });

  it('retains past shows (no date filtering in the transform)', () => {
    const s = rowToShow(row({ 5: cell('Date(2020,0,1)', '2020-01-01'), 6: null }));
    expect(s).not.toBeNull();
    expect(s?.startDate).toBe('2020-01-01');
    expect(s?.endDate).toBeUndefined();
  });
});

const makeShow = (startDate: string, endDate?: string, province: ShowRecord['province'] = 'AB'): ShowRecord => ({
  slug: `show-${startDate}`,
  name: 'Test Show',
  city: 'Calgary',
  citySlug: 'calgary',
  province,
  startDate,
  endDate,
});

describe('parseLocalDate', () => {
  it('parses an ISO date as a local calendar date, not UTC', () => {
    const d = parseLocalDate('2026-07-10');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(10);
  });
});

describe('isUpcoming', () => {
  it('treats a startDate equal to the build date as upcoming', () => {
    expect(isUpcoming(makeShow('2026-07-11'), new Date(2026, 6, 11, 18, 0))).toBe(true);
  });

  it('treats a startDate before the build date as not upcoming', () => {
    expect(isUpcoming(makeShow('2026-07-10'), new Date(2026, 6, 11))).toBe(false);
  });

  it('treats a startDate after the build date as upcoming', () => {
    expect(isUpcoming(makeShow('2026-07-12'), new Date(2026, 6, 11))).toBe(true);
  });

  it('treats a multi-day show as upcoming while the build date falls between start and end', () => {
    expect(isUpcoming(makeShow('2026-07-10', '2026-07-12'), new Date(2026, 6, 11))).toBe(true);
  });

  it('treats a multi-day show as not upcoming once the end date has passed', () => {
    expect(isUpcoming(makeShow('2026-07-10', '2026-07-12'), new Date(2026, 6, 13))).toBe(false);
  });
});

describe('groupShowsByMonth', () => {
  it('groups shows by calendar month, preserving first-seen month order', () => {
    const groups = groupShowsByMonth([makeShow('2026-07-10'), makeShow('2026-07-12'), makeShow('2026-08-09')]);
    expect(groups.map((g) => g.label)).toEqual(['July 2026', 'August 2026']);
    expect(groups[0]?.shows).toHaveLength(2);
    expect(groups[1]?.shows).toHaveLength(1);
  });

  it('returns no groups for an empty list', () => {
    expect(groupShowsByMonth([])).toEqual([]);
  });
});

describe('showsInProvinceYear', () => {
  it('keeps only shows in the given province and calendar year, chronological', () => {
    const shows = [
      makeShow('2026-08-09', undefined, 'ON'),
      makeShow('2026-03-01', undefined, 'ON'),
      makeShow('2027-01-05', undefined, 'ON'),
      makeShow('2026-05-05', undefined, 'AB'),
    ];
    const result = showsInProvinceYear(shows, 'ON', 2026);
    expect(result.map((s) => s.startDate)).toEqual(['2026-03-01', '2026-08-09']);
  });

  it('returns an empty array when the province/year has no shows', () => {
    expect(showsInProvinceYear([makeShow('2026-05-05', undefined, 'AB')], 'QC', 2026)).toEqual([]);
  });
});

// Local-calendar-date assertion helper (avoids toISOString(), which converts
// to UTC and would shift by a day in negative-offset timezones like Canada's
// — the same reasoning as parseLocalDate's own doc comment above).
const asLocalIso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('weekendWindow', () => {
  it('rolls a Monday forward to the upcoming Friday-Sunday', () => {
    // 2026-07-13 is a Monday
    const { start, end } = weekendWindow(new Date(2026, 6, 13));
    expect(asLocalIso(start)).toBe('2026-07-17');
    expect(asLocalIso(end)).toBe('2026-07-19');
  });

  it('keeps a Friday build date as the start of that same weekend', () => {
    // 2026-07-17 is a Friday
    const { start, end } = weekendWindow(new Date(2026, 6, 17));
    expect(asLocalIso(start)).toBe('2026-07-17');
    expect(asLocalIso(end)).toBe('2026-07-19');
  });

  it('keeps a Sunday build date within the weekend already under way', () => {
    // 2026-07-19 is a Sunday
    const { start, end } = weekendWindow(new Date(2026, 6, 19));
    expect(asLocalIso(start)).toBe('2026-07-17');
    expect(asLocalIso(end)).toBe('2026-07-19');
  });
});

describe('isInWeekend', () => {
  const window = weekendWindow(new Date(2026, 6, 13)); // Mon -> Fri 17 - Sun 19

  it('is true for a show starting inside the window', () => {
    expect(isInWeekend(makeShow('2026-07-18'), window)).toBe(true);
  });

  it('is true for a multi-day show that only overlaps the window at the edge', () => {
    expect(isInWeekend(makeShow('2026-07-16', '2026-07-17'), window)).toBe(true);
  });

  it('is false for a show entirely before or after the window', () => {
    expect(isInWeekend(makeShow('2026-07-10'), window)).toBe(false);
    expect(isInWeekend(makeShow('2026-07-21'), window)).toBe(false);
  });
});

describe('showsThisWeekend', () => {
  it('returns only shows overlapping the weekend, sorted chronologically', () => {
    const shows = [makeShow('2026-07-19'), makeShow('2026-07-17'), makeShow('2026-07-10')];
    const result = showsThisWeekend(shows, new Date(2026, 6, 13));
    expect(result.map((s) => s.startDate)).toEqual(['2026-07-17', '2026-07-19']);
  });

  it('returns an empty array when nothing falls on the weekend', () => {
    expect(showsThisWeekend([makeShow('2026-07-10')], new Date(2026, 6, 13))).toEqual([]);
  });
});
