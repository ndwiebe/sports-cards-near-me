import { describe, it, expect } from 'vitest';
import { rowToShow } from '../../src/lib/shows';
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
