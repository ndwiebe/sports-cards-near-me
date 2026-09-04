/**
 * Google Places opening hours -> schema.org `openingHoursSpecification`.
 *
 * The sheet's Hours column holds Google's own `weekdayDescriptions`, collapsed to
 * one cell by `scripts/refresh-ratings.py`:
 *
 *   "Monday: Closed; Tuesday: 11:00 AM – 6:30 PM; ... ; Sunday: 12:00 – 5:00 PM"
 *
 * Rendering that string is already handled by the store page. This turns it into
 * the structured form Google reads for the "Open now" / hours rich result, which
 * the plain string cannot feed.
 *
 * Across the 632 stores carrying hours as of 2026-08-28 there are exactly four
 * shapes in 4,424 day-segments: a normal range (3,992), `Closed` (395),
 * `Open 24 hours` (28) and a two-range day (9). Ten stores — game cafes and
 * lounges — close after midnight; that is a valid range, not a broken one.
 * Anything else is treated as unrecognised — see the all-or-nothing rule below.
 */

export interface OpeningHoursSpecification {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: string;
  opens: string;
  closes: string;
}

const DAYS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

// "11:00 AM – 6:30 PM", "12:00 – 7:00 PM" (meridiem only on the end), en-dash or hyphen.
const RANGE_RE = /^(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[–—-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?$/i;

/** 12-hour clock -> "HH:MM". `fallback` supplies a meridiem the text omitted. */
function to24(hour: string, minute: string, meridiem: string | undefined, fallback: string | undefined): string | undefined {
  let h = Number(hour);
  if (!Number.isInteger(h) || h < 1 || h > 12) return undefined;
  const m = (meridiem ?? fallback)?.toUpperCase();
  if (m === 'PM' && h < 12) h += 12;
  else if (m === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

function parseRange(day: string, body: string): OpeningHoursSpecification[] | undefined {
  const m = RANGE_RE.exec(body);
  if (m === null) return undefined;

  // A missing meridiem borrows the other end's: "12:00 – 7:00 PM" is an
  // afternoon shift, never midnight to seven.
  const opens = to24(m[1]!, m[2]!, m[3], m[6]);
  const closes = to24(m[4]!, m[5]!, m[6], m[3]);
  if (opens === undefined || closes === undefined) return undefined;
  // A close earlier than the open means the shop trades past midnight — real for
  // the board-game cafes and lounges in the directory ("Friday: 4:00 PM – 12:00 AM",
  // "Saturday: 1:00 PM – 1:00 AM"). schema.org reads that pair as spanning
  // midnight, so it is emitted as-is. Only an empty window is refused.
  if (closes === opens) return undefined;

  return [{ '@type': 'OpeningHoursSpecification', dayOfWeek: day, opens, closes }];
}

/**
 * Every day the store is open, or `undefined`.
 *
 * All-or-nothing on purpose: a segment this parser does not understand is
 * dropped, and a dropped day reads to Google as "closed that day". Publishing a
 * shop as closed on a day it is open is worse than publishing no hours at all,
 * so one unrecognised segment discards the whole store's specification. Every
 * segment in the current data parses, so this costs nothing today and fails
 * safe if Google's phrasing drifts.
 */
export function parseStoreHours(hours: string | undefined): OpeningHoursSpecification[] | undefined {
  if (hours === undefined || hours.trim() === '') return undefined;

  const out: OpeningHoursSpecification[] = [];
  for (const segment of hours.split(';')) {
    const text = segment.trim();
    if (text === '') continue;

    const colon = text.indexOf(':');
    if (colon === -1) return undefined;
    const day = DAYS[text.slice(0, colon).trim().toLowerCase()];
    if (day === undefined) return undefined;

    const body = text.slice(colon + 1).trim();
    if (/^closed$/i.test(body)) continue; // omitted entirely — schema.org reads absence as closed
    if (/^open 24 hours$/i.test(body)) {
      out.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: day, opens: '00:00', closes: '23:59' });
      continue;
    }

    // A comma splits a split shift: "9:00 AM – 12:00 PM, 1:00 – 5:00 PM".
    const parts = body.split(',').map((p) => p.trim());
    for (const part of parts) {
      const spec = parseRange(day, part);
      if (spec === undefined) return undefined;
      out.push(...spec);
    }
  }

  return out.length > 0 ? out : undefined;
}

export interface HoursRow {
  day: string;
  /** Exactly what the source says for that day — "11:00 AM – 6:30 PM", "Closed", "Open 24 hours". */
  value: string;
  isClosed: boolean;
}

const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * The same string, laid out one day per row instead of a single run-on line.
 *
 * Deliberately a re-layout, not a re-interpretation: the value is passed through
 * verbatim, so this can never disagree with the hours a visitor would have read
 * before, and it stays correct if Google's phrasing drifts in ways
 * `parseStoreHours` would reject. That is also why it doesn't reuse the parsed
 * specification — that form drops closed days (schema.org reads absence as
 * closed), and a week with Tuesday silently missing is exactly what a human
 * reader must not be shown.
 *
 * Returns undefined unless all seven days are present exactly once, so the
 * caller can fall back to the original string rather than render a partial week.
 */
export function formatHoursByDay(hours: string | undefined): HoursRow[] | undefined {
  if (hours === undefined || hours.trim() === '') return undefined;

  const byDay = new Map<string, string>();
  for (const segment of hours.split(';')) {
    const text = segment.trim();
    if (text === '') continue;

    const colon = text.indexOf(':');
    if (colon === -1) return undefined;
    const day = DAYS[text.slice(0, colon).trim().toLowerCase()];
    const value = text.slice(colon + 1).trim();
    if (day === undefined || value === '' || byDay.has(day)) return undefined;
    byDay.set(day, value);
  }

  if (byDay.size !== WEEK.length) return undefined;
  return WEEK.map((day) => {
    const value = byDay.get(day) as string;
    return { day, value, isClosed: /^closed$/i.test(value) };
  });
}
