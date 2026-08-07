import type { GvizCell, GvizRow } from './sheet';
import type { ProvinceCode } from './types';
import { PROVINCES } from './types';
import { sanitizeText, slugify } from './transform';
import { httpUrl } from './stores-build';

export interface ShowRecord {
  slug: string;
  name: string;
  city: string;
  citySlug: string;
  province: ProvinceCode;
  venue?: string | undefined;
  address?: string | undefined;
  startDate: string;
  endDate?: string | undefined;
  hours?: string | undefined;
  admission?: string | undefined;
  website?: string | undefined;
  sourceUrl?: string | undefined;
  recurring?: string | undefined;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const GVIZ_DATE_RE = /^Date\((\d{4}),(\d{1,2}),(\d{1,2})/;

// Start/End Date sheet cells are native Sheets date cells: gviz reports `v`
// as a locale-independent "Date(y,m0,d)" constructor string (month
// 0-indexed) — the ground truth — while `f` is the sheet's locale-formatted
// display text (e.g. "7/10/2026" vs "10/7/2026" depending on locale), which
// is NOT guaranteed to be ISO. Parse `v`'s Date(...) constructor first, as
// the primary path; fall back to ISO text on `f` then `v` for cells that
// are plain text instead of native Sheets dates.
export const isoDate = (cell: GvizCell | null | undefined): string | undefined => {
  const raw = sanitizeText(cell?.v);
  const match = raw?.match(GVIZ_DATE_RE);
  const year = match?.[1];
  const month = match?.[2];
  const day = match?.[3];
  if (year !== undefined && month !== undefined && day !== undefined) {
    const mm = String(Number(month) + 1).padStart(2, '0');
    const dd = day.padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }
  const formatted = sanitizeText(cell?.f);
  if (formatted !== undefined && ISO_DATE_RE.test(formatted)) return formatted;
  return raw !== undefined && ISO_DATE_RE.test(raw) ? raw : undefined;
};

const provinceCode = (raw: unknown): ProvinceCode | null => {
  const text = sanitizeText(raw);
  if (text === undefined) return null;
  const code = text.toUpperCase();
  return code in PROVINCES ? (code as ProvinceCode) : null;
};

// Parses an ISO `YYYY-MM-DD` string as a local calendar date rather than
// UTC midnight. `new Date('2026-07-10')` is parsed as UTC and can render as
// the previous day in negative-offset timezones (e.g. all of Canada) — so
// every date shown to visitors goes through this instead.
export function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

// "Upcoming" is a build-time snapshot: it compares each show's last day
// (endDate, or startDate for single-day shows) to the date the static site
// was generated, not the visitor's request time. A multi-day show stays
// upcoming through its last day rather than dropping out the morning after
// it starts. That's acceptable here because the site rebuilds daily
// (scheduled GitHub Actions run + pushes to `redesign`), so the
// upcoming/past boundary is never more than a day stale — a page can't
// recompute this itself since there's no server, only pre-rendered HTML.
export function isUpcoming(show: ShowRecord, buildDate: Date): boolean {
  const today = new Date(buildDate.getFullYear(), buildDate.getMonth(), buildDate.getDate());
  return parseLocalDate(show.endDate ?? show.startDate).getTime() >= today.getTime();
}

export interface ShowMonthGroup {
  label: string;
  shows: ShowRecord[];
}

export function groupShowsByMonth(shows: ShowRecord[]): ShowMonthGroup[] {
  const monthFormat = new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric' });
  const groups: ShowMonthGroup[] = [];
  const index = new Map<string, ShowMonthGroup>();
  for (const show of shows) {
    const date = parseLocalDate(show.startDate);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    let group = index.get(key);
    if (!group) {
      group = { label: monthFormat.format(date), shows: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.shows.push(show);
  }
  return groups;
}

/** A province's shows in a given calendar year (by startDate), chronological. */
export function showsInProvinceYear(shows: ShowRecord[], province: ProvinceCode, year: number): ShowRecord[] {
  return shows
    .filter((s) => s.province === province && parseLocalDate(s.startDate).getFullYear() === year)
    .sort((a, b) => parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime());
}

/**
 * The one show-calendar year worth linking to for a province — e.g. from the
 * province page — when several years of data exist. Prefers the earliest year
 * that still has an upcoming show (so the link lands somewhere with something
 * to see); falls back to the most recent year on record if every show for
 * that province has already happened. Returns undefined when the province has
 * no shows at all, so callers never construct a link to an empty page.
 */
export function primaryShowCalendarYear(shows: ShowRecord[], province: ProvinceCode, buildDate: Date): number | undefined {
  const years = [...new Set(shows.filter((s) => s.province === province).map((s) => parseLocalDate(s.startDate).getFullYear()))].sort(
    (a, b) => a - b,
  );
  if (years.length === 0) return undefined;
  for (const year of years) {
    if (showsInProvinceYear(shows, province, year).some((s) => isUpcoming(s, buildDate))) return year;
  }
  return years[years.length - 1];
}

export interface WeekendWindow {
  start: Date;
  end: Date;
}

// The Friday-Sunday window that counts as "this weekend" relative to
// buildDate. Mon-Thu roll forward to the upcoming Friday; Fri/Sat/Sun use
// the weekend already under way, so the page never skips the weekend it's
// published during. Both ends are local-calendar midnight, inclusive.
export function weekendWindow(buildDate: Date): WeekendWindow {
  const today = new Date(buildDate.getFullYear(), buildDate.getMonth(), buildDate.getDate());
  const daysSinceFriday = (today.getDay() - 5 + 7) % 7;
  const fridayOffset = daysSinceFriday <= 2 ? -daysSinceFriday : 7 - daysSinceFriday;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + fridayOffset);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 2);
  return { start, end };
}

/** True when a show's date range (startDate..endDate, or just startDate for a
 * single-day show) overlaps the given weekend window at all. */
export function isInWeekend(show: ShowRecord, window: WeekendWindow): boolean {
  const start = parseLocalDate(show.startDate).getTime();
  const end = parseLocalDate(show.endDate ?? show.startDate).getTime();
  return start <= window.end.getTime() && end >= window.start.getTime();
}

/** Shows overlapping this weekend (see weekendWindow), chronological by start date. */
export function showsThisWeekend(shows: ShowRecord[], buildDate: Date): ShowRecord[] {
  const window = weekendWindow(buildDate);
  return shows
    .filter((s) => isInWeekend(s, window))
    .sort((a, b) => parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime());
}

/**
 * Short time-urgency label for a show's title/meta copy: "Today", "Tomorrow",
 * "This Weekend", or a short dated fallback ("Aug 22, 2026"). The 07-23 keyword
 * research found every show query carries a time modifier, so show page titles
 * lead with one instead of the show name. Returns undefined for a show that has
 * already finished — none of the urgency framings would be true then, and
 * isUpcoming is already the one place that boundary is decided.
 */
export function showTimingLabel(show: ShowRecord, buildDate: Date): string | undefined {
  if (!isUpcoming(show, buildDate)) return undefined;
  const today = new Date(buildDate.getFullYear(), buildDate.getMonth(), buildDate.getDate());
  const daysUntilStart = Math.round((parseLocalDate(show.startDate).getTime() - today.getTime()) / 86_400_000);
  if (daysUntilStart <= 0) return 'Today';
  if (daysUntilStart === 1) return 'Tomorrow';
  if (isInWeekend(show, weekendWindow(buildDate))) return 'This Weekend';
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(parseLocalDate(show.startDate));
}

export function rowToShow(cells: GvizRow): ShowRecord | null {
  const name = sanitizeText(cells[0]?.v);
  const city = sanitizeText(cells[1]?.v);
  const province = provinceCode(cells[2]?.v);
  const startDate = isoDate(cells[5]);
  if (name === undefined || city === undefined || province === null || startDate === undefined) return null;

  return {
    slug: slugify(`${name}-${city}-${startDate}`),
    name,
    city,
    citySlug: slugify(city),
    province,
    venue: sanitizeText(cells[3]?.v),
    address: sanitizeText(cells[4]?.v),
    startDate,
    endDate: isoDate(cells[6]),
    hours: sanitizeText(cells[7]?.v),
    admission: sanitizeText(cells[8]?.v),
    website: httpUrl(cells[9]?.v),
    sourceUrl: httpUrl(cells[10]?.v),
    recurring: sanitizeText(cells[11]?.v),
  };
}
