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
    expect(showScheduleWarning(held)).toContain('Show has been removed or cancelled.');
    expect(showScheduleWarning(held)).toContain('actual event status remain unconfirmed');
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

describe('unconfirmed November Stampede City schedule', () => {
  it('holds just November 22 without changing the original record or December recommendations', () => {
    const base = { name: 'Stampede City Card Show', city: 'Calgary', citySlug: 'calgary', province: 'AB' as const };
    const november = { ...base, slug: 'stampede-city-card-show-calgary-2026-11-22', startDate: '2026-11-22', hours: '9:00 AM - 5:00 AM' };
    const december = { ...base, slug: 'stampede-city-card-show-calgary-2026-12-05', startDate: '2026-12-05' };
    const checkDate = new Date(2026, 10, 21, 12);
    expect(showScheduleWarning(november)).toBe('November 22 is unconfirmed. The organizer advertises December 5–6.');
    expect(isRecommendedShow(november, checkDate)).toBe(false);
    expect(november.startDate).toBe('2026-11-22');
    expect(november.hours).toBe('9:00 AM - 5:00 AM');
    expect(showScheduleWarning(december)).toBeUndefined();
    expect(isRecommendedShow(december, checkDate)).toBe(true);
  });
});
