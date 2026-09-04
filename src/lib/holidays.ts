/**
 * Canadian statutory holidays, used only to SUPPRESS a positive "open" claim
 * in open-now.ts — never to fabricate a closure. `openingHoursSpecification`
 * is a regular weekly schedule with no holiday data in it at all, so on a
 * stat holiday a schedule-only "open" match is a guess dressed as a fact.
 *
 * Two tiers: a national list (Canada Labour Code's federal holidays, which
 * apply everywhere regardless of province) plus a short list of provincial
 * add-ons for the cases explicitly worth getting right. Provinces not listed
 * in `provincialHolidays` still get the national list — an unlisted
 * provincial day under-suppresses, which never turns a real closure into a
 * false "open", so it's the safe gap to leave.
 *
 * Movable dates are computed, not hand-copied per year, so any year works —
 * extend by adding another `case`/branch, not another year's date table.
 */

import type { ProvinceCode } from './types';

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function iso(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Nth (1-indexed) occurrence of a weekday in a month. weekday: 0=Sun..6=Sat. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month - 1, 1 + offset + (n - 1) * 7));
}

/** Victoria Day's own definition: "the Monday on or before May 24". */
function mondayOnOrBefore(year: number, month: number, day: number): Date {
  const d = new Date(Date.UTC(year, month - 1, day));
  return addDays(d, -((d.getUTCDay() + 6) % 7));
}

/** How several Newfoundland holidays are defined: nearest Monday to a date. */
function nearestMonday(year: number, month: number, day: number): Date {
  const d = new Date(Date.UTC(year, month - 1, day));
  const wd = d.getUTCDay();
  if (wd === 0) return addDays(d, 1); // Sunday -> next day
  if (wd >= 2 && wd <= 4) return addDays(d, -(wd - 1)); // Tue-Thu -> back to Monday
  if (wd >= 5) return addDays(d, 8 - wd); // Fri/Sat -> forward to Monday
  return d; // already Monday
}

/** Meeus/Jones/Butcher Gregorian algorithm — Easter Sunday for any year. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Federal statutory holidays (Canada Labour Code) — suppressed nationwide. */
function nationalHolidays(year: number): Date[] {
  const easter = easterSunday(year);
  return [
    new Date(Date.UTC(year, 0, 1)), // New Year's Day
    addDays(easter, -2), // Good Friday
    mondayOnOrBefore(year, 5, 24), // Victoria Day
    new Date(Date.UTC(year, 6, 1)), // Canada Day
    nthWeekdayOfMonth(year, 9, 1, 1), // Labour Day
    new Date(Date.UTC(year, 8, 30)), // National Day for Truth and Reconciliation
    nthWeekdayOfMonth(year, 10, 1, 2), // Thanksgiving
    new Date(Date.UTC(year, 10, 11)), // Remembrance Day
    new Date(Date.UTC(year, 11, 25)), // Christmas Day
    new Date(Date.UTC(year, 11, 26)), // Boxing Day
  ];
}

/** Provincial add-ons beyond the national list — deliberately not exhaustive. */
function provincialHolidays(year: number, province: ProvinceCode): Date[] {
  // Family Day / Louis Riel Day / Islander Day / Heritage Day — all landed on
  // the 3rd Monday of February once BC moved its Family Day there in 2019.
  const thirdMondayFebruary: ProvinceCode[] = ['AB', 'BC', 'SK', 'ON', 'NB', 'PE', 'NS', 'MB'];
  if (thirdMondayFebruary.includes(province)) {
    return [nthWeekdayOfMonth(year, 2, 1, 3)];
  }
  if (province === 'QC') {
    return [new Date(Date.UTC(year, 5, 24))]; // Saint-Jean-Baptiste Day
  }
  if (province === 'NL') {
    return [
      nearestMonday(year, 3, 17), // St. Patrick's Day
      nearestMonday(year, 4, 23), // St. George's Day
      nearestMonday(year, 6, 24), // Discovery Day
      nearestMonday(year, 7, 12), // Orangemen's Day
    ];
  }
  return [];
}

const holidayCache = new Map<string, Set<string>>();

function holidayDatesForYear(year: number, province: ProvinceCode): Set<string> {
  const key = `${year}-${province}`;
  let dates = holidayCache.get(key);
  if (dates === undefined) {
    dates = new Set([...nationalHolidays(year), ...provincialHolidays(year, province)].map(iso));
    holidayCache.set(key, dates);
  }
  return dates;
}

/**
 * Whether `now`, read in the shop's own time zone, falls on a Canadian
 * statutory holiday — federal, or the one the shop's own province observes.
 */
export function isStatutoryHoliday(now: Date, timeZone: string, province: ProvinceCode): boolean {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '0');
  const month = parts.find((p) => p.type === 'month')?.value ?? '00';
  const day = parts.find((p) => p.type === 'day')?.value ?? '00';
  return holidayDatesForYear(year, province).has(`${year}-${month}-${day}`);
}
