import { describe, expect, it } from 'vitest';
import showsJson from '../../src/data/shows.json';
import type { ShowRecord } from '../../src/lib/shows';
import { admissionPrice, parseShowHours, showEventLd } from '../../src/lib/shows';

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

const fixture = (over: Partial<ShowRecord> = {}): ShowRecord => ({
  slug: 'capital-card-show-ottawa-2026-09-12', name: 'Capital Card Show', city: 'Ottawa',
  citySlug: 'ottawa', province: 'ON', venue: 'Nepean Sportsplex',
  address: '1701 Woodroffe Ave, Ottawa, ON', startDate: '2026-09-12', hours: '10-4', ...over,
});

describe('showEventLd — organizer', () => {
  it('names the promoter and links their booking page', () => {
    const ld = showEventLd(
      fixture({ organizer: 'Capital Trade Shows', tableBooking: 'https://capitaltradeshows.ca/vendors/' }),
      'https://sportscardsnearme.ca/shows/x/',
    );
    expect(ld.organizer).toEqual({
      '@type': 'Organization',
      name: 'Capital Trade Shows',
      url: 'https://capitaltradeshows.ca/vendors/',
    });
  });

  it('omits the booking url when only the name is known', () => {
    const ld = showEventLd(fixture({ organizer: 'Capital Trade Shows' }), 'https://x/');
    expect(ld.organizer).toEqual({ '@type': 'Organization', name: 'Capital Trade Shows' });
  });

  it('omits organizer entirely when the promoter is unknown', () => {
    expect(showEventLd(fixture(), 'https://x/').organizer).toBeUndefined();
  });
});


describe('verified admission prices', () => {
  it.each([
    ['Free', 0], ['Free general admission; optional paid VIP tickets', 0],
    ['$5', 5], ['$16.50', 16.5], ['$25 at the door', 25],
  ])('reads %s without inferring a ticket tier', (admission, price) => {
    expect(admissionPrice(admission)).toBe(price);
    expect(showEventLd(fixture({ admission }), 'https://example.com/show/').offers).toEqual({
      '@type': 'Offer', description: admission, url: 'https://example.com/show/',
      price, priceCurrency: 'CAD',
    });
  });

  it.each([
    undefined, 'Under 6 free; 6-13 $3; 13+ $6', '$15-$20/day',
    'Sat $35 / Sun $25 / Weekend $50', '$15 adv / $20 door',
    'Early-bird pricing until Aug 15 (see tickets)', 'USD $5', '$5 USD',
  ])('does not guess prices for %s', (admission) => {
    expect(admissionPrice(admission)).toBeUndefined();
    const offers = showEventLd(fixture({ admission }), 'https://example.com/show/').offers;
    if (offers !== undefined) {
      expect(offers).not.toHaveProperty('price');
      expect(offers).not.toHaveProperty('priceCurrency');
      expect(offers).toHaveProperty('description', admission);
    }
  });

  it('does not invent sale dates or ticket availability', () => {
    const offers = showEventLd(fixture({ admission: '$5' }), 'https://example.com/show/').offers;
    expect(offers).not.toHaveProperty('validFrom');
    expect(offers).not.toHaveProperty('availability');
  });

  it('keeps known end dates but does not infer one from the start date alone', () => {
    expect(showEventLd(fixture({ hours: undefined, endDate: '2026-09-13' }), 'https://x/').endDate)
      .toBe('2026-09-13');
    expect(showEventLd(fixture({ hours: undefined, endDate: undefined }), 'https://x/'))
      .not.toHaveProperty('endDate');
  });
});
