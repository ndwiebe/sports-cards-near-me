import { describe, expect, it } from 'vitest';
import { computeOpenState, openNowPayload, provinceTimeZone } from '../../src/lib/open-now';
import type { OpeningHoursSpecification } from '../../src/lib/store-hours';
import type { Store } from '../../src/lib/types';

// All timestamps below are fixed UTC instants, never Date.now() — the whole
// point of putting this logic in a plain function is that "open now" is
// checkable without a clock.

function spec(entries: [string, string, string][]): OpeningHoursSpecification[] {
  return entries.map(([dayOfWeek, opens, closes]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek, opens, closes }));
}

describe('computeOpenState', () => {
  it('reads a normal weekday as open inside its hours', () => {
    // Wednesday 2026-09-02, 14:00 America/Edmonton = 20:00 UTC (UTC-6 in September, DST).
    const s = spec([['Wednesday', '09:00', '18:00']]);
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-09-02T20:00:00Z'));
    expect(state).toEqual({ isOpen: true, summary: 'Open now · closes 6:00 PM' });
  });

  it('reads the same weekday as closed outside its hours', () => {
    // Same Wednesday, 20:00 local (02:00 UTC Thursday) — well past close.
    const s = spec([
      ['Wednesday', '09:00', '18:00'],
      ['Thursday', '09:00', '18:00'],
    ]);
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-09-03T02:00:00Z'));
    expect(state).toEqual({ isOpen: false, summary: 'Closed · opens tomorrow 9:00 AM' });
  });

  it('reads a day with no entry at all as closed', () => {
    // Sunday, no Sunday segment in the spec — next opening is Tuesday.
    const s = spec([['Tuesday', '11:00', '18:00']]);
    // 2026-08-30 is a Sunday. Noon Edmonton = 18:00 UTC (UTC-6).
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-08-30T18:00:00Z'));
    expect(state).toEqual({ isOpen: false, summary: 'Closed · opens Tuesday 11:00 AM' });
  });

  it('handles a split-shift day: inside the first block, the gap, and the second block', () => {
    const s = spec([['Monday', '11:00', '14:00'], ['Monday', '17:00', '21:00']]);
    // 2026-08-31 is a Monday. America/Edmonton is UTC-6 in August (DST).
    const inFirst = computeOpenState(s, 'America/Edmonton', new Date('2026-08-31T18:00:00Z')); // 12:00 local
    expect(inFirst).toEqual({ isOpen: true, summary: 'Open now · closes 2:00 PM' });

    const inGap = computeOpenState(s, 'America/Edmonton', new Date('2026-08-31T21:30:00Z')); // 15:30 local
    expect(inGap).toEqual({ isOpen: false, summary: 'Closed · opens 5:00 PM' });

    const inSecond = computeOpenState(s, 'America/Edmonton', new Date('2026-08-31T23:30:00Z')); // 17:30 local
    expect(inSecond).toEqual({ isOpen: true, summary: 'Open now · closes 9:00 PM' });
  });

  it('keeps an overnight span open past midnight, on both sides of the boundary', () => {
    // Board-game-cafe hours, straight from the store-hours.ts comment:
    // Friday 4:00 PM - Saturday 1:00 AM (parseStoreHours emits opens 16:00, closes 01:00).
    const s = spec([['Friday', '16:00', '01:00']]);
    // 2026-09-04 is a Friday. 23:00 local Edmonton (UTC-6) = 05:00 UTC Saturday.
    const beforeMidnight = computeOpenState(s, 'America/Edmonton', new Date('2026-09-05T05:00:00Z'));
    expect(beforeMidnight).toEqual({ isOpen: true, summary: 'Open now · closes 1:00 AM' });

    // 00:30 Saturday local = 06:30 UTC — past midnight, still within Friday's wrapped window.
    const afterMidnight = computeOpenState(s, 'America/Edmonton', new Date('2026-09-05T06:30:00Z'));
    expect(afterMidnight).toEqual({ isOpen: true, summary: 'Open now · closes 1:00 AM' });

    // 01:30 Saturday local = 07:30 UTC — the window has actually ended.
    const afterClose = computeOpenState(s, 'America/Edmonton', new Date('2026-09-05T07:30:00Z'));
    expect(afterClose.isOpen).toBe(false);
  });

  it('reads "Open 24 hours" (00:00-23:59) as open at any hour of that day', () => {
    const s = spec([['Monday', '00:00', '23:59']]);
    // 2026-08-31 is a Monday. 03:00 local Edmonton = 09:00 UTC.
    const earlyMorning = computeOpenState(s, 'America/Edmonton', new Date('2026-08-31T09:00:00Z'));
    expect(earlyMorning.isOpen).toBe(true);
    // Late in the day too — 23:00 local = 05:00 UTC Tuesday.
    const lateNight = computeOpenState(s, 'America/Edmonton', new Date('2026-09-01T05:00:00Z'));
    expect(lateNight.isOpen).toBe(true);
  });

  it('wraps the whole week to find a next opening several days away', () => {
    // Only open Wednesdays. Checked Thursday — the next opening is six days out.
    const s = spec([['Wednesday', '10:00', '17:00']]);
    // 2026-09-03 is a Thursday. Noon Edmonton = 18:00 UTC.
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-09-03T18:00:00Z'));
    expect(state).toEqual({ isOpen: false, summary: 'Closed · opens Wednesday 10:00 AM' });
  });

  it('reports next week\'s opening, not "later today", once today\'s only window has passed', () => {
    // Only open Mondays, checked Monday evening after close — must not read as "later today".
    const s = spec([['Monday', '10:00', '17:00']]);
    // 2026-08-31 is a Monday. 20:00 local Edmonton = 02:00 UTC Tuesday.
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-09-01T02:00:00Z'));
    expect(state).toEqual({ isOpen: false, summary: 'Closed · opens Monday 10:00 AM' });
  });

  it('observes DST in a province that has it', () => {
    const s = spec([['Sunday', '09:00', '17:00']]);
    // 2026-03-08 is the US/Canada spring-forward Sunday. At 09:30 MDT (UTC-6,
    // post-transition) the shop is open; the same UTC instant read as MST
    // (UTC-7, pre-transition) would land at 08:30 and say closed. This proves
    // the zone-aware read, not a manual DST table.
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-03-08T15:30:00Z'));
    expect(state).toEqual({ isOpen: true, summary: 'Open now · closes 5:00 PM' });
  });

  it('does not observe DST in Saskatchewan, on the same calendar date', () => {
    const s = spec([['Sunday', '09:00', '17:00']]);
    // Same instant as the DST test above. Saskatchewan stays UTC-6 year-round,
    // so 15:30 UTC is 09:30 local here too — Alberta only matched by
    // coincidence of being mid-DST; a December instant would diverge them.
    const marchState = computeOpenState(s, 'America/Regina', new Date('2026-03-08T15:30:00Z'));
    expect(marchState).toEqual({ isOpen: true, summary: 'Open now · closes 5:00 PM' });

    // In December, Edmonton is UTC-7 (standard time) and Regina is still
    // UTC-6 — the same UTC instant now reads as two different local times.
    const decemberInstant = new Date('2026-12-06T16:30:00Z'); // Sunday
    const edmonton = computeOpenState(s, 'America/Edmonton', decemberInstant); // 09:30 local -> open
    const regina = computeOpenState(s, 'America/Regina', decemberInstant); // 10:30 local -> open
    expect(edmonton.isOpen).toBe(true);
    expect(regina.isOpen).toBe(true);
    expect(edmonton.summary).toBe(regina.summary); // both "Open now · closes 5:00 PM"

    const edmontonBefore = computeOpenState(s, 'America/Edmonton', new Date('2026-12-06T15:30:00Z')); // 08:30 local -> closed
    expect(edmontonBefore.isOpen).toBe(false);
  });
});

describe('provinceTimeZone', () => {
  it('gives Saskatchewan its own zone, distinct from its DST-observing neighbours', () => {
    expect(provinceTimeZone('SK')).toBe('America/Regina');
    expect(provinceTimeZone('AB')).not.toBe(provinceTimeZone('SK'));
  });
});

const BASE_STORE: Store = {
  slug: 'test-shop',
  name: 'Test Shop',
  city: 'Edmonton',
  citySlug: 'edmonton',
  address: '123 Main St',
  province: 'AB',
  hours: 'Monday: 9:00 AM – 6:00 PM',
  services: [],
  sports: [],
  lat: 53.5,
  lng: -113.5,
};

describe('openNowPayload', () => {
  it('builds a spec + time zone payload for a normal open shop', () => {
    const payload = openNowPayload(BASE_STORE);
    expect(payload).toEqual({
      spec: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '09:00', closes: '18:00' }],
      timeZone: 'America/Edmonton',
    });
  });

  it('renders nothing for a shop whose hours do not parse', () => {
    const store: Store = { ...BASE_STORE, hours: 'Monday: by appointment' };
    expect(openNowPayload(store)).toBeUndefined();
  });

  it('renders nothing for a shop with no hours at all', () => {
    const store: Store = { ...BASE_STORE, hours: undefined };
    expect(openNowPayload(store)).toBeUndefined();
  });

  it('renders nothing for a closed shop, even with parseable hours', () => {
    const store: Store = { ...BASE_STORE, status: 'closed' };
    expect(openNowPayload(store)).toBeUndefined();
  });

  it('renders nothing for an online-only shop', () => {
    const store: Store = { ...BASE_STORE, status: 'online-only' };
    expect(openNowPayload(store)).toBeUndefined();
  });
});
