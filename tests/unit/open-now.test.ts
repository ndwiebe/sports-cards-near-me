import { describe, expect, it } from 'vitest';
import { computeOpenState, openNowPayload, provinceTimeZone, storeTimeZone } from '../../src/lib/open-now';
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
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-09-02T20:00:00Z'), 'AB');
    expect(state).toEqual({ isOpen: true, summary: 'Listed open now · closes 6:00 PM' });
  });

  it('reads the same weekday as closed outside its hours', () => {
    // Same Wednesday, 20:00 local (02:00 UTC Thursday) — well past close.
    const s = spec([
      ['Wednesday', '09:00', '18:00'],
      ['Thursday', '09:00', '18:00'],
    ]);
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-09-03T02:00:00Z'), 'AB');
    expect(state).toEqual({ isOpen: false, summary: 'Closed · opens tomorrow 9:00 AM' });
  });

  it('reads a day with no entry at all as closed', () => {
    // Sunday, no Sunday segment in the spec — next opening is Tuesday.
    const s = spec([['Tuesday', '11:00', '18:00']]);
    // 2026-08-30 is a Sunday. Noon Edmonton = 18:00 UTC (UTC-6).
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-08-30T18:00:00Z'), 'AB');
    expect(state).toEqual({ isOpen: false, summary: 'Closed · opens Tuesday 11:00 AM' });
  });

  it('handles a split-shift day: inside the first block, the gap, and the second block', () => {
    const s = spec([['Monday', '11:00', '14:00'], ['Monday', '17:00', '21:00']]);
    // 2026-08-31 is a Monday. America/Edmonton is UTC-6 in August (DST).
    const inFirst = computeOpenState(s, 'America/Edmonton', new Date('2026-08-31T18:00:00Z'), 'AB'); // 12:00 local
    expect(inFirst).toEqual({ isOpen: true, summary: 'Listed open now · closes 2:00 PM' });

    const inGap = computeOpenState(s, 'America/Edmonton', new Date('2026-08-31T21:30:00Z'), 'AB'); // 15:30 local
    expect(inGap).toEqual({ isOpen: false, summary: 'Closed · opens 5:00 PM' });

    const inSecond = computeOpenState(s, 'America/Edmonton', new Date('2026-08-31T23:30:00Z'), 'AB'); // 17:30 local
    expect(inSecond).toEqual({ isOpen: true, summary: 'Listed open now · closes 9:00 PM' });
  });

  it('keeps an overnight span open past midnight, on both sides of the boundary', () => {
    // Board-game-cafe hours, straight from the store-hours.ts comment:
    // Friday 4:00 PM - Saturday 1:00 AM (parseStoreHours emits opens 16:00, closes 01:00).
    const s = spec([['Friday', '16:00', '01:00']]);
    // 2026-09-04 is a Friday. 23:00 local Edmonton (UTC-6) = 05:00 UTC Saturday.
    const beforeMidnight = computeOpenState(s, 'America/Edmonton', new Date('2026-09-05T05:00:00Z'), 'AB');
    expect(beforeMidnight).toEqual({ isOpen: true, summary: 'Listed open now · closes 1:00 AM' });

    // 00:30 Saturday local = 06:30 UTC — past midnight, still within Friday's wrapped window.
    const afterMidnight = computeOpenState(s, 'America/Edmonton', new Date('2026-09-05T06:30:00Z'), 'AB');
    expect(afterMidnight).toEqual({ isOpen: true, summary: 'Listed open now · closes 1:00 AM' });

    // 01:30 Saturday local = 07:30 UTC — the window has actually ended.
    const afterClose = computeOpenState(s, 'America/Edmonton', new Date('2026-09-05T07:30:00Z'), 'AB');
    expect(afterClose.isOpen).toBe(false);
  });

  it('keeps a Saturday-night span open into Sunday, crossing the week boundary', () => {
    // Friday->Saturday (above) never leaves the 0..10079 minute cycle, so it
    // can pass even if matches()'s `target + MINUTES_PER_WEEK` wrap check is
    // deleted. Saturday's block runs past index 6 into what the timeline
    // calls "day 7" and is ONLY reachable via that wrap — this is the case
    // putali-chowk-board-games-bar-windsor actually hits (Sat 3PM - 2AM).
    const s = spec([['Saturday', '16:00', '01:00']]);
    // 2026-09-05 is a Saturday. 00:30 Sunday local Edmonton (UTC-6) = 06:30 UTC.
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-09-06T06:30:00Z'), 'AB');
    expect(state).toEqual({ isOpen: true, summary: 'Listed open now · closes 1:00 AM' });
  });

  it('suppresses the claim entirely for "Open 24 hours" (00:00-23:59) — there is no real close time to report', () => {
    const s = spec([['Monday', '00:00', '23:59']]);
    // 2026-08-31 is a Monday. 03:00 local Edmonton = 09:00 UTC.
    const earlyMorning = computeOpenState(s, 'America/Edmonton', new Date('2026-08-31T09:00:00Z'), 'AB');
    expect(earlyMorning).toEqual({ isOpen: false, summary: '' });
    // Late in the day too — 23:00 local = 05:00 UTC Tuesday.
    const lateNight = computeOpenState(s, 'America/Edmonton', new Date('2026-09-01T05:00:00Z'), 'AB');
    expect(lateNight).toEqual({ isOpen: false, summary: '' });
  });

  it('wraps the whole week to find a next opening several days away', () => {
    // Only open Wednesdays. Checked Thursday — the next opening is six days out.
    const s = spec([['Wednesday', '10:00', '17:00']]);
    // 2026-09-03 is a Thursday. Noon Edmonton = 18:00 UTC.
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-09-03T18:00:00Z'), 'AB');
    expect(state).toEqual({ isOpen: false, summary: 'Closed · opens Wednesday 10:00 AM' });
  });

  it('says "next Monday", not bare "Monday", when the next opening is exactly 7 days out', () => {
    // Only open Mondays, checked Monday evening after close. The next match
    // is 7 days away, which is exactly the case where a bare weekday name
    // (dayDiff===7 lands on TODAY's weekday) reads as "later today".
    const s = spec([['Monday', '10:00', '17:00']]);
    // 2026-08-31 is a Monday. 20:00 local Edmonton = 02:00 UTC Tuesday.
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-09-01T02:00:00Z'), 'AB');
    expect(state).toEqual({ isOpen: false, summary: 'Closed · opens next Monday 10:00 AM' });
  });

  it('observes DST in a province that has it', () => {
    const s = spec([['Sunday', '09:00', '17:00']]);
    // 2026-03-08 is the US/Canada spring-forward Sunday. At 09:30 MDT (UTC-6,
    // post-transition) the shop is open; the same UTC instant read as MST
    // (UTC-7, pre-transition) would land at 08:30 and say closed. This proves
    // the zone-aware read, not a manual DST table.
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-03-08T15:30:00Z'), 'AB');
    expect(state).toEqual({ isOpen: true, summary: 'Listed open now · closes 5:00 PM' });
  });

  it('does not observe DST in Saskatchewan, on an instant where that actually changes the answer', () => {
    const s = spec([['Sunday', '09:00', '17:00']]);
    // 2026-12-06 15:30 UTC, a Sunday in Alberta's standard-time season
    // (UTC-7): Edmonton reads 08:30 — before opening, closed. Saskatchewan
    // never observes DST (permanently UTC-6), so the same instant reads
    // 09:30 there — open. If Saskatchewan were (wrongly) mapped to
    // America/Edmonton, `regina` below would come back closed instead of
    // open, and this assertion would catch it.
    const instant = new Date('2026-12-06T15:30:00Z');
    const edmonton = computeOpenState(s, 'America/Edmonton', instant, 'AB');
    const regina = computeOpenState(s, 'America/Regina', instant, 'SK');
    expect(edmonton.isOpen).toBe(false);
    expect(regina).toEqual({ isOpen: true, summary: 'Listed open now · closes 5:00 PM' });
  });
});

describe('statutory holiday suppression', () => {
  it('suppresses the open claim on a fixed national holiday (Christmas Day)', () => {
    const s = spec([['Friday', '09:00', '18:00']]);
    // 2026-12-25 is a Friday, Christmas Day. Noon local Edmonton = 19:00 UTC
    // (standard time, UTC-7).
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-12-25T19:00:00Z'), 'AB');
    expect(state).toEqual({ isOpen: false, summary: '' });
  });

  it('suppresses the open claim on a movable feast (Good Friday)', () => {
    const s = spec([['Friday', '09:00', '18:00']]);
    // 2026-04-03 is Good Friday (Easter Sunday 2026-04-05 minus two days).
    // Noon local Edmonton = 18:00 UTC (DST, UTC-6).
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-04-03T18:00:00Z'), 'AB');
    expect(state).toEqual({ isOpen: false, summary: '' });
  });

  it('suppresses a province-specific holiday only in a province that observes it', () => {
    const s = spec([['Monday', '09:00', '18:00']]);
    // 2026-02-16 is Family Day (3rd Monday of February) — observed in
    // Alberta, not in Quebec. Noon local in each province, same UTC day.
    const ab = computeOpenState(s, 'America/Edmonton', new Date('2026-02-16T19:00:00Z'), 'AB'); // noon MST (UTC-7)
    const qc = computeOpenState(s, 'America/Toronto', new Date('2026-02-16T17:00:00Z'), 'QC'); // noon EST (UTC-5)
    expect(ab).toEqual({ isOpen: false, summary: '' });
    expect(qc).toEqual({ isOpen: true, summary: 'Listed open now · closes 6:00 PM' });
  });

  it('leaves the "closed" direction untouched on a holiday', () => {
    // A shop with no Friday hours at all is still just "closed", not
    // specially flagged — holiday suppression only ever mutes a positive claim.
    const s = spec([['Saturday', '09:00', '18:00']]);
    const state = computeOpenState(s, 'America/Edmonton', new Date('2026-12-25T19:00:00Z'), 'AB');
    expect(state.isOpen).toBe(false);
    expect(state.summary).not.toBe('');
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

describe('storeTimeZone', () => {
  it('leaves an ordinary shop on the province map', () => {
    expect(storeTimeZone(BASE_STORE)).toBe('America/Edmonton');
  });

  it('reads Cranbrook BC as Mountain time, not Pacific', () => {
    const store: Store = { ...BASE_STORE, slug: 'kootenay-sports-cards-collectables-cranbrook', province: 'BC', city: 'Cranbrook' };
    expect(storeTimeZone(store)).toBe('America/Edmonton');
  });

  it('reads Kenora ON as Central time, not Eastern', () => {
    const store: Store = { ...BASE_STORE, slug: 'great-canadian-collectibles-kenora', province: 'ON', city: 'Kenora' };
    expect(storeTimeZone(store)).toBe('America/Winnipeg');
  });

  it('reads the Saskatchewan side of Lloydminster as Alberta time by statute', () => {
    const store: Store = {
      ...BASE_STORE,
      slug: 'nova-s-sports-cards-lloydminster-sk-side',
      province: 'SK',
      city: 'Lloydminster (SK side)',
    };
    expect(storeTimeZone(store)).toBe('America/Edmonton');
  });
});

describe('openNowPayload', () => {
  it('builds a spec + time zone + province payload for a normal open shop', () => {
    const payload = openNowPayload(BASE_STORE);
    expect(payload).toEqual({
      spec: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '09:00', closes: '18:00' }],
      timeZone: 'America/Edmonton',
      province: 'AB',
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
