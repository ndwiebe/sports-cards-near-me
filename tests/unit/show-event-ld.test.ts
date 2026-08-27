import { describe, expect, it } from 'vitest';
import showsJson from '../../src/data/shows.json';
import type { ShowRecord } from '../../src/lib/shows';
import { parseShowHours, showEventLd } from '../../src/lib/shows';

const shows = showsJson as ShowRecord[];
const url = (s: ShowRecord): string => `https://sportscardsnearme.ca/shows/${s.slug}/`;

describe('parseShowHours', () => {
  it('reads the common forms', () => {
    expect(parseShowHours('10:00 AM - 4:00 PM')).toEqual({ start: '10:00', end: '16:00' });
    expect(parseShowHours('10am-5pm')).toEqual({ start: '10:00', end: '17:00' });
    expect(parseShowHours('9:30 AM - 3:00 PM')).toEqual({ start: '09:30', end: '15:00' });
  });

  it('reads a bare "10-4" as daytime, not 10:00 to 04:00', () => {
    expect(parseShowHours('10-4')).toEqual({ start: '10:00', end: '16:00' });
  });

  it('refuses anything it does not fully understand rather than guessing', () => {
    // Multi-day shows carry per-day hours; a single start time would be invented.
    expect(parseShowHours('Fri 4-8pm, Sat 10-5, Sun 10-4')).toBeUndefined();
    expect(parseShowHours('Sat 10am-5pm, Sun 10am-4pm')).toBeUndefined();
    expect(parseShowHours('by appointment')).toBeUndefined();
    expect(parseShowHours(undefined)).toBeUndefined();
  });

  it('never returns an end at or before the start', () => {
    for (const s of shows) {
      const t = parseShowHours(s.hours);
      if (t === undefined) continue;
      expect(t.end > t.start, `${s.slug}: ${s.hours} -> ${t.start}-${t.end}`).toBe(true);
    }
  });
});

describe('showEventLd', () => {
  it('ALWAYS emits location.address — Google requires it for a physical event', () => {
    // The bug this replaces: address was emitted only when a street address was
    // known, leaving 168 of 207 shows ineligible for the Event rich result.
    for (const s of shows) {
      const ld = showEventLd(s, url(s)) as any;
      expect(ld.location.address, `${s.slug} has no address block`).toBeDefined();
      expect(ld.location.address.addressLocality).toBe(s.city);
      expect(ld.location.address.addressRegion).toBe(s.province);
      expect(ld.location.address.addressCountry).toBe('CA');
    }
  });

  it('claims a street address only for shows that actually have one', () => {
    for (const s of shows) {
      const ld = showEventLd(s, url(s)) as any;
      expect(Object.hasOwn(ld.location.address, 'streetAddress')).toBe(s.address !== undefined);
    }
  });

  it('carries every property Google requires for an Event', () => {
    for (const s of shows) {
      const ld = showEventLd(s, url(s)) as any;
      expect(ld['@type']).toBe('Event');
      expect(ld.name, `${s.slug} name`).toBeTruthy();
      expect(ld.startDate, `${s.slug} startDate`).toMatch(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/);
      expect(ld.location.name, `${s.slug} location name`).toBeTruthy();
    }
  });

  it('emits local time with no UTC offset, since shows span five time zones', () => {
    const timed = shows.filter((s) => parseShowHours(s.hours) !== undefined);
    expect(timed.length).toBeGreaterThan(150);
    for (const s of timed) {
      const ld = showEventLd(s, url(s)) as any;
      expect(ld.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(ld.startDate, 'an offset would be wrong in most provinces').not.toMatch(/[+-]\d{2}:\d{2}$|Z$/);
      expect(ld.endDate > ld.startDate).toBe(true);
    }
  });

  it('never invents an admission price', () => {
    for (const s of shows) {
      const ld = showEventLd(s, url(s)) as any;
      expect(Object.hasOwn(ld, 'offers')).toBe(s.admission !== undefined);
    }
  });
});
