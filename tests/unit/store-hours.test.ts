import { describe, expect, it } from 'vitest';
import { parseStoreHours } from '../../src/lib/store-hours';
import storesJson from '../../src/data/stores.json';
import type { Store } from '../../src/lib/types';

// The Hours column sat empty (59 cells held a pasted icon glyph, nothing else)
// until 2026-08-28, when 632 stores' hours were imported from the Places data the
// monthly ratings refresh had already fetched. The plain string renders on the
// store page; this parser is what lets Google read it.

describe('parseStoreHours', () => {
  it('reads a normal weekday range', () => {
    expect(parseStoreHours('Monday: 11:00 AM – 6:30 PM')).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '11:00', closes: '18:30' },
    ]);
  });

  it('omits closed days rather than emitting a zero-length window', () => {
    const spec = parseStoreHours('Monday: Closed; Tuesday: 10:00 AM – 5:00 PM');
    expect(spec).toHaveLength(1);
    expect(spec?.[0]?.dayOfWeek).toBe('Tuesday');
  });

  it('borrows the missing meridiem from the other end of the range', () => {
    // "12:00 – 7:00 PM" is an afternoon shift. Reading the start as midnight
    // would put the shop's opening time twelve hours early.
    expect(parseStoreHours('Sunday: 12:00 – 7:00 PM')).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Sunday', opens: '12:00', closes: '19:00' },
    ]);
  });

  it('handles a midday close without shifting it into the afternoon', () => {
    expect(parseStoreHours('Friday: 10:00 AM – 12:00 PM')).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Friday', opens: '10:00', closes: '12:00' },
    ]);
  });

  it('expands "Open 24 hours"', () => {
    expect(parseStoreHours('Monday: Open 24 hours')).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '00:00', closes: '23:59' },
    ]);
  });

  it('emits two windows for a split shift', () => {
    const spec = parseStoreHours('Monday: 9:00 AM – 12:00 PM, 1:00 – 5:00 PM');
    expect(spec).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '09:00', closes: '12:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '13:00', closes: '17:00' },
    ]);
  });

  it('discards the whole store when one segment is unrecognised', () => {
    // A dropped day reads to Google as "closed". Publishing a shop as shut on a
    // day it is open is worse than publishing nothing, so the parser refuses.
    expect(parseStoreHours('Monday: 10:00 AM – 5:00 PM; Tuesday: by appointment')).toBeUndefined();
  });

  it('returns undefined for empty or missing input', () => {
    expect(parseStoreHours(undefined)).toBeUndefined();
    expect(parseStoreHours('   ')).toBeUndefined();
  });

  it('keeps a range that runs past midnight', () => {
    // Board-game cafes and lounges genuinely close at 1am. Ten stores in the
    // directory do; refusing them would have silently dropped all their hours.
    expect(parseStoreHours('Friday: 4:00 PM – 12:00 AM')).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Friday', opens: '16:00', closes: '00:00' },
    ]);
  });

  it('refuses an empty window', () => {
    expect(parseStoreHours('Monday: 5:00 PM – 5:00 PM')).toBeUndefined();
  });

  it('parses every store in the live dataset', () => {
    // The all-or-nothing rule only costs nothing while this holds. If Google's
    // phrasing drifts, this test says so before the hours silently vanish.
    const withHours = (storesJson as Store[]).filter((s) => s.hours !== undefined);
    expect(withHours.length).toBeGreaterThan(600);
    const failed = withHours.filter((s) => parseStoreHours(s.hours) === undefined);
    expect(failed.map((s) => `${s.slug}: ${s.hours}`)).toEqual([]);
  });
});
