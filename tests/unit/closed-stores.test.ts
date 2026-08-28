import { describe, expect, it } from 'vitest';
import { parseStatus, splitStores, rowToStore } from '../../src/lib/stores-build';
import { storeAnswerCapsule } from '../../src/lib/seo';
import type { Store } from '../../src/lib/types';

// A shop with no walk-in storefront — closed for good, or moved online-only —
// must vanish from every listing, count, map and guide while keeping its own
// page — someone searching the shop by name deserves to be told what happened
// rather than hitting a 404. The mechanism is a split at bake time (stores.json
// = open only), chosen over filtering at ~30 call sites because a missed call
// site is an unlisted shop appearing in someone's city with no test failing.
const store = (over: Partial<Store> = {}): Store => ({
  slug: 'waynes-sports-cards-edmonton', name: "Wayne's Sports Cards", city: 'Edmonton',
  citySlug: 'edmonton', address: '17020 90 Ave NW, Edmonton, AB', province: 'AB',
  rating: 4.7, reviewCount: 340, hours: undefined, phone: undefined,
  website: undefined, social: undefined, services: ['Sells'],
  sports: ['Hockey'], lat: 53.5, lng: -113.6, ...over,
} as Store);

describe('parseStatus — only explicit values unlist a shop', () => {
  it('accepts "closed", case- and space-insensitively', () => {
    for (const v of ['closed', 'CLOSED', ' Closed ']) expect(parseStatus(v)).toBe('closed');
  });

  it('accepts "online-only" and "online only", case- and space-insensitively', () => {
    for (const v of ['online-only', 'ONLINE-ONLY', ' Online-Only ', 'online only', 'Online Only'])
      expect(parseStatus(v)).toBe('online-only');
  });

  // The failure that matters is unlisting a LIVE business, not listing a dead one
  // for another month. So anything ambiguous has to read as open.
  it('treats blanks, notes, typos and non-strings as open', () => {
    for (const v of ['', '   ', 'open', 'CLOSED_PERMANENTLY?', 'closed for renovations',
                     'clsoed', 'online', 'onlineonly', undefined, null, 0, 1, true]) {
      expect(parseStatus(v)).toBeUndefined();
    }
  });
});

describe('splitStores', () => {
  it('keeps open shops in the listed set and pulls unlisted ones (closed or online-only) out', () => {
    const a = store({ slug: 'a' });
    const b = store({ slug: 'b', status: 'closed' });
    const c = store({ slug: 'c' });
    const d = store({ slug: 'd', status: 'online-only' });
    const { open, closed } = splitStores([a, b, c, d]);
    expect(open.map((s) => s.slug)).toEqual(['a', 'c']);
    expect(closed.map((s) => s.slug)).toEqual(['b', 'd']);
  });

  it('returns every store to exactly one side', () => {
    const all = [store({ slug: 'a' }), store({ slug: 'b', status: 'closed' }), store({ slug: 'c', status: 'online-only' })];
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

  it('marks a shop online-only only on an explicit value', () => {
    expect(rowToStore(cells([{ v: 'online-only' }]) as never)?.status).toBe('online-only');
    expect(rowToStore(cells([{ v: 'online only' }]) as never)?.status).toBe('online-only');
    expect(rowToStore(cells([{ v: 'online' }]) as never)?.status).toBeUndefined();
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

describe('the online-only capsule must not claim the storefront is gone for good, or still walk-in', () => {
  it('says "online only" and never "permanently closed"', () => {
    const c = storeAnswerCapsule(store({ status: 'online-only' }), 'Alberta');
    expect(c).toMatch(/online only/i);
    expect(c).not.toMatch(/permanently closed/i);
  });

  it('never uses present-tense "is a sports card shop" — the walk-in shop is gone', () => {
    const c = storeAnswerCapsule(store({ status: 'online-only' }), 'Alberta');
    expect(c).not.toMatch(/\bis a sports card shop/);
  });

  it('leaves the open capsule untouched', () => {
    const c = storeAnswerCapsule(store(), 'Alberta');
    expect(c).toMatch(/is a sports card shop/);
    expect(c).toContain('4.7');
  });
});
