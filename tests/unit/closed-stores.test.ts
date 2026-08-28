import { describe, expect, it } from 'vitest';
import { isClosed, splitStores, rowToStore } from '../../src/lib/stores-build';
import { storeAnswerCapsule } from '../../src/lib/seo';
import type { Store } from '../../src/lib/types';

// A permanently-closed shop must vanish from every listing, count, map and guide
// while keeping its own page — someone searching the shop by name deserves to be
// told it shut rather than hitting a 404. The mechanism is a split at bake time
// (stores.json = open only), chosen over filtering at ~30 call sites because a
// missed call site is a dead shop appearing in someone's city with no test failing.
const store = (over: Partial<Store> = {}): Store => ({
  slug: 'waynes-sports-cards-edmonton', name: "Wayne's Sports Cards", city: 'Edmonton',
  citySlug: 'edmonton', address: '17020 90 Ave NW, Edmonton, AB', province: 'AB',
  rating: 4.7, reviewCount: 340, hours: undefined, phone: undefined,
  website: undefined, social: undefined, services: ['Sells'],
  sports: ['Hockey'], lat: 53.5, lng: -113.6, ...over,
} as Store);

describe('isClosed — only an explicit "closed" unlists a shop', () => {
  it('accepts the exact value, case- and space-insensitively', () => {
    for (const v of ['closed', 'CLOSED', ' Closed ']) expect(isClosed(v)).toBe(true);
  });

  // The failure that matters is unlisting a LIVE business, not listing a dead one
  // for another month. So anything ambiguous has to read as open.
  it('treats blanks, notes, typos and non-strings as open', () => {
    for (const v of ['', '   ', 'open', 'CLOSED_PERMANENTLY?', 'closed for renovations',
                     'clsoed', undefined, null, 0, 1, true]) {
      expect(isClosed(v)).toBe(false);
    }
  });
});

describe('splitStores', () => {
  it('keeps open shops in the listed set and pulls closed ones out', () => {
    const a = store({ slug: 'a' });
    const b = store({ slug: 'b', status: 'closed' });
    const c = store({ slug: 'c' });
    const { open, closed } = splitStores([a, b, c]);
    expect(open.map((s) => s.slug)).toEqual(['a', 'c']);
    expect(closed.map((s) => s.slug)).toEqual(['b']);
  });

  it('returns every store to exactly one side', () => {
    const all = [store({ slug: 'a' }), store({ slug: 'b', status: 'closed' })];
    const { open, closed } = splitStores(all);
    expect(open.length + closed.length).toBe(all.length);
  });
});

describe('rowToStore reads the status column additively', () => {
  const cells = (extra: unknown[] = []) => [
    { v: "Wayne's Sports Cards" }, { v: 'Edmonton' }, { v: '17020 90 Ave NW, Edmonton, AB' },
    { v: '4.7 (340)' }, null, null, null, null, null, null, { v: 53.5 }, { v: -113.6 },
    ...extra,
  ];

  // The sheet column does not exist yet. A row that stops at index 11 must still
  // parse and read as open, or shipping this ahead of the column would unlist
  // nothing but crash the bake.
  it('reads a row with no status column at all as open', () => {
    expect(rowToStore(cells() as never)?.status).toBeUndefined();
  });

  it('marks a shop closed only on an explicit value', () => {
    expect(rowToStore(cells([{ v: 'closed' }]) as never)?.status).toBe('closed');
    expect(rowToStore(cells([{ v: '' }]) as never)?.status).toBeUndefined();
    expect(rowToStore(cells([{ v: 'moved?' }]) as never)?.status).toBeUndefined();
  });
});

describe('the closed page must not make live-business claims', () => {
  // Same class of bug as the weighted-rank-called-a-rating one that reached 351
  // pages: every sentence in the open capsule is present tense, and a rating is a
  // live-business signal.
  it('uses past tense and drops the rating', () => {
    const c = storeAnswerCapsule(store({ status: 'closed' }), 'Alberta');
    expect(c).toMatch(/was a sports card shop/);
    expect(c).toMatch(/permanently closed/i);
    expect(c).not.toMatch(/\bis a sports card shop/);
    expect(c).not.toMatch(/holds a .* rating/i);
    expect(c).not.toContain('4.7');
  });

  it('still says where it was, so the page is worth landing on', () => {
    expect(storeAnswerCapsule(store({ status: 'closed' }), 'Alberta'))
      .toContain('17020 90 Ave NW');
  });

  it('leaves the open capsule untouched', () => {
    const c = storeAnswerCapsule(store(), 'Alberta');
    expect(c).toMatch(/is a sports card shop/);
    expect(c).toContain('4.7');
  });
});
