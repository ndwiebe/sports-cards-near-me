import { describe, expect, it } from 'vitest';
import { isUpcoming, isRecommendedShow, nextInSeries, showScheduleWarning, showsThisWeekend, showTimingLabel, type ShowRecord } from '../../src/lib/shows';
const held: ShowRecord = { slug: 'uxbridge-sports-card-show-stouffville-2026-10-03', name: 'Uxbridge Sports Card Show', city: 'Stouffville', citySlug: 'stouffville', province: 'ON', startDate: '2026-10-03', venue: 'Goodwood Community Centre', hours: '10–4' };
const today = new Date(2026, 9, 3, 12);
describe('unconfirmed Uxbridge schedule hold', () => {
  it('preserves the original dated record while withholding recommendations and urgency', () => {
    const before = { ...held };
    expect(isUpcoming(held, today)).toBe(true);
    expect(isRecommendedShow(held, today)).toBe(false);
    expect(showTimingLabel(held, today)).toBeUndefined();
    expect(showScheduleWarning(held)).toContain('verify before travelling');
    expect(held).toEqual(before);
  });
  it('excludes only the exact held edition from weekend and next-series picks', () => {
    const other = { ...held, slug: 'other-show', name: 'Other show' };
    const next = { ...held, slug: 'uxbridge-sports-card-show-stouffville-2026-11-07', startDate: '2026-11-07' };
    expect(showsThisWeekend([held, other, next], today)).toEqual([other]);
    expect(isRecommendedShow(other, today)).toBe(true);
    expect(showTimingLabel(other, today)).toBe('Today');
    expect(showScheduleWarning(next)).toBeUndefined();
    expect(nextInSeries({ slug: 'series', name: held.name, city: held.city, citySlug: held.citySlug, province: held.province, shows: [held, next] }, today)).toEqual(next);
  });
});
