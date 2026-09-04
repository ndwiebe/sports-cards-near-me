/**
 * "Open now" / "closes soon" / "opens Tuesday" — computed from the same
 * `OpeningHoursSpecification` the store page already emits as structured data.
 *
 * This MUST run in the visitor's browser at page view, not at build time. The
 * site is a statically prerendered daily rebuild; baking an open/closed state
 * into the HTML would freeze whatever was true at 09:00 UTC and serve it as
 * fact all day. Every function here is a pure function of a spec, a time zone
 * and an instant, so it is testable without a browser and safe to call from an
 * inline client script.
 */

import { isStatutoryHoliday } from './holidays';
import { parseStoreHours, type OpeningHoursSpecification } from './store-hours';
import type { ProvinceCode, Store } from './types';

/**
 * Province -> the IANA time zone its shops mostly sit in. "Open now" has to
 * use the SHOP's local time, not the visitor's — a Vancouver visitor checking
 * a Halifax shop needs Halifax's answer. `Intl.DateTimeFormat` resolves DST
 * for whichever zone is passed, which is why Saskatchewan (permanently
 * UTC-6, no DST) and Alberta (UTC-7/UTC-6) fall out of the same code path
 * without a special case.
 *
 * Province boundaries are not shop boundaries: Ontario runs Eastern almost
 * everywhere, but Kenora is west of the Ontario/Manitoba line and runs
 * Central; BC runs Pacific almost everywhere, but the Kootenays pocket
 * around Cranbrook runs Mountain; and the Saskatchewan side of Lloydminster
 * runs Alberta clock time by provincial statute, unlike the rest of
 * Saskatchewan. None of that is expressible at the province level, so those
 * three shops are handled by `SHOP_TIME_ZONE_OVERRIDES` below instead of
 * here. Nunavut (which would straddle Eastern/Central/Mountain) carries no
 * `ProvinceCode` in this dataset — zero shops — so it never reaches this map.
 */
export const PROVINCE_TIME_ZONE: Record<ProvinceCode, string> = {
  AB: 'America/Edmonton',
  BC: 'America/Vancouver',
  MB: 'America/Winnipeg',
  NB: 'America/Moncton',
  NL: 'America/St_Johns',
  NS: 'America/Halifax',
  NT: 'America/Yellowknife',
  ON: 'America/Toronto',
  PE: 'America/Halifax',
  QC: 'America/Toronto',
  SK: 'America/Regina',
  YT: 'America/Whitehorse',
};

export function provinceTimeZone(province: ProvinceCode): string {
  return PROVINCE_TIME_ZONE[province];
}

/**
 * Single shops (not whole cities) whose real time zone the province map
 * gets wrong — see the comment on PROVINCE_TIME_ZONE. Checked ahead of the
 * province map, never instead of it.
 */
export const SHOP_TIME_ZONE_OVERRIDES: Record<string, string> = {
  'kootenay-sports-cards-collectables-cranbrook': 'America/Edmonton', // Cranbrook BC: Mountain, observes DST like Edmonton
  'great-canadian-collectibles-kenora': 'America/Winnipeg', // Kenora ON: Central, not Eastern
  'nova-s-sports-cards-lloydminster-sk-side': 'America/Edmonton', // Lloydminster SK side: Alberta time by statute
};

export function storeTimeZone(store: Store): string {
  return SHOP_TIME_ZONE_OVERRIDES[store.slug] ?? provinceTimeZone(store.province);
}

export interface OpenNowPayload {
  spec: OpeningHoursSpecification[];
  timeZone: string;
  province: ProvinceCode;
}

/**
 * What OpenNowBadge.astro needs, or `undefined` when there is nothing honest
 * to say: hours that don't parse (see the all-or-nothing rule in
 * store-hours.ts) or a shop with no current walk-in location (`status` set)
 * both mean the badge renders nothing, never a guess.
 */
export function openNowPayload(store: Store): OpenNowPayload | undefined {
  if (store.status !== undefined) return undefined;
  const spec = parseStoreHours(store.hours);
  if (spec === undefined) return undefined;
  return { spec, timeZone: storeTimeZone(store), province: store.province };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MINUTES_PER_DAY = 1440;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7;

export interface OpenNowState {
  isOpen: boolean;
  /**
   * e.g. "Listed open now · closes 6:00 PM" or "Closed · opens Tuesday 11:00
   * AM". Empty when there's a schedule match but no honest claim to make
   * from it (a 24-hour listing, or a statutory holiday) — the badge renders
   * nothing rather than a guess.
   */
  summary: string;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':');
  return Number(h) * 60 + Number(m);
}

function formatClock(minuteOfDay: number): string {
  const h24 = Math.floor(minuteOfDay / 60) % 24;
  const m = minuteOfDay % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

interface Occurrence {
  start: number; // dayIndex*1440 + open minute, absolute within a 0..10079 week timeline
  end: number; // exclusive; > 10080 is legitimate for a Saturday block that ends Sunday
  closesMinute: number; // wall-clock minute the block ends, for display while open
  isAllDay: boolean; // the "Open 24 hours" special case — no real close time exists
}

function buildOccurrences(spec: OpeningHoursSpecification[]): Occurrence[] {
  return spec.map((s) => {
    const dayIndex = DAY_NAMES.indexOf(s.dayOfWeek);
    const opensMin = toMinutes(s.opens);
    const isAllDay = opensMin === 0 && s.closes === '23:59';
    // parseStoreHours encodes "Open 24 hours" as 00:00-23:59, one minute short
    // of a full day. Read as literal minutes that leaves a one-minute closed
    // gap at 23:59 that isn't real — treat that exact pair as the full day.
    const closesMin = isAllDay ? MINUTES_PER_DAY : toMinutes(s.closes);
    const wraps = closesMin <= opensMin;
    const start = dayIndex * MINUTES_PER_DAY + opensMin;
    const end = dayIndex * MINUTES_PER_DAY + closesMin + (wraps ? MINUTES_PER_DAY : 0);
    return { start, end, closesMinute: closesMin % MINUTES_PER_DAY, isAllDay };
  });
}

// An occurrence is a fixed point in a 7-day cycle, but a Saturday-night block
// can end Sunday morning — past the end of that cycle. Checking the target
// shifted a week forward is what catches the wrap without special-casing
// "is this Saturday's block." (Shifting backward can never match: target is
// always in [0, 10079] and occ.start >= 0, so target - MINUTES_PER_WEEK is
// always negative and always < occ.start.)
function matches(target: number, occ: Occurrence): boolean {
  return [target, target + MINUTES_PER_WEEK].some((t) => t >= occ.start && t < occ.end);
}

export function localClock(now: Date, timeZone: string): { dayIndex: number; minuteOfDay: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return { dayIndex: DAY_NAMES.indexOf(weekday), minuteOfDay: hour * 60 + minute };
}

function describeUpcoming(dayDiff: number, weekdayIndex: number, minuteOfDay: number): string {
  const time = formatClock(minuteOfDay);
  if (dayDiff === 0) return `opens ${time}`;
  if (dayDiff === 1) return `opens tomorrow ${time}`;
  // At exactly 7 days out, weekdayIndex names TODAY's weekday — "opens
  // Monday" on a Monday reads as "later today", which is the opposite of
  // true. "next Monday" is unambiguous at every other dayDiff too, but only
  // 7 is where the bare name actively lies.
  if (dayDiff === 7) return `opens next ${DAY_NAMES[weekdayIndex]} ${time}`;
  return `opens ${DAY_NAMES[weekdayIndex]} ${time}`;
}

export function computeOpenState(spec: OpeningHoursSpecification[], timeZone: string, now: Date, province: ProvinceCode): OpenNowState {
  const { dayIndex, minuteOfDay } = localClock(now, timeZone);
  const target = dayIndex * MINUTES_PER_DAY + minuteOfDay;
  const occurrences = buildOccurrences(spec);

  const openOcc = occurrences.find((occ) => matches(target, occ));
  if (openOcc !== undefined) {
    // Two cases where the schedule says "open" but asserting that would be a
    // guess dressed as a fact: a "24 hours" listing (almost always a mis-set
    // source record, and there's no real close time to report even if it's
    // genuine) and a statutory holiday (the schedule has no holiday data at
    // all — see holidays.ts). Both suppress rather than assert either
    // "open" or "closed"; the "closed" direction is unaffected because it
    // never overclaims in the first place.
    if (openOcc.isAllDay || isStatutoryHoliday(now, timeZone, province)) {
      return { isOpen: false, summary: '' };
    }
    return { isOpen: true, summary: `Listed open now · closes ${formatClock(openOcc.closesMinute)}` };
  }

  // Closed: the soonest future start wins. Weeks repeat identically, so
  // "soonest" only ever needs a single forward wrap per occurrence.
  let bestCandidate: number | undefined;
  let bestStart = 0;
  for (const occ of occurrences) {
    let candidate = occ.start;
    while (candidate < target) candidate += MINUTES_PER_WEEK;
    if (bestCandidate === undefined || candidate < bestCandidate) {
      bestCandidate = candidate;
      bestStart = occ.start;
    }
  }
  // Every store here has at least one open segment (parseStoreHours refuses an
  // empty result), so a spec with length > 0 always finds a next opening.
  const candidateDayIndex = Math.floor(bestCandidate! / MINUTES_PER_DAY);
  const targetDayIndex = Math.floor(target / MINUTES_PER_DAY);
  const dayDiff = candidateDayIndex - targetDayIndex;
  const weekdayIndex = candidateDayIndex % 7;
  const minuteOfDayStart = bestStart % MINUTES_PER_DAY;

  return { isOpen: false, summary: `Closed · ${describeUpcoming(dayDiff, weekdayIndex, minuteOfDayStart)}` };
}
