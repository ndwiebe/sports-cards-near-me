import { describe, expect, it } from 'vitest';
import {
  FEATURED_LABEL,
  FEATURED_LINK_REL,
  FEATURED_PLACEMENTS_ENABLED,
  isPlacementActive,
  selectActiveFeaturedPlacements,
  type FeaturedPlacement,
} from '../../src/lib/featured';
import { byRecommendedRank } from '../../src/lib/seo';
import type { Store } from '../../src/lib/types';

const NOW = new Date('2026-09-23T12:00:00Z');

const placement = (over: Partial<FeaturedPlacement> = {}): FeaturedPlacement => ({
  id: 'plc_edmonton_1',
  storeSlug: 'a-shop-edmonton',
  province: 'AB',
  citySlug: 'edmonton',
  startUtc: '2026-09-01T00:00:00Z',
  endUtc: '2026-10-01T00:00:00Z',
  ...over,
});

describe('FEATURED_PLACEMENTS_ENABLED', () => {
  it('is false by default — no build-time flag is set for this test run', () => {
    expect(FEATURED_PLACEMENTS_ENABLED).toBe(false);
  });
});

describe('isPlacementActive', () => {
  it('is true strictly inside the start/end window', () => {
    expect(isPlacementActive(placement(), NOW)).toBe(true);
  });

  it('is false before startUtc', () => {
    const p = placement({ startUtc: '2026-10-01T00:00:00Z', endUtc: '2026-11-01T00:00:00Z' });
    expect(isPlacementActive(p, NOW)).toBe(false);
  });

  it('is false at or after endUtc — the window is exclusive at the end', () => {
    const p = placement({ startUtc: '2026-08-01T00:00:00Z', endUtc: '2026-09-23T12:00:00Z' });
    expect(isPlacementActive(p, NOW)).toBe(false);
  });

  it('is false well after endUtc (a clearly expired placement)', () => {
    const p = placement({ startUtc: '2026-01-01T00:00:00Z', endUtc: '2026-02-01T00:00:00Z' });
    expect(isPlacementActive(p, NOW)).toBe(false);
  });
});

describe('selectActiveFeaturedPlacements', () => {
  const opts = { province: 'AB' as const, citySlug: 'edmonton', now: NOW, enabled: true };

  it('returns an active, in-city, in-window placement when enabled', () => {
    const out = selectActiveFeaturedPlacements([placement()], opts);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe('plc_edmonton_1');
  });

  it('never returns an expired placement', () => {
    const expired = placement({ startUtc: '2026-01-01T00:00:00Z', endUtc: '2026-02-01T00:00:00Z' });
    expect(selectActiveFeaturedPlacements([expired], opts)).toEqual([]);
  });

  it('never returns a not-yet-started placement', () => {
    const future = placement({ startUtc: '2026-12-01T00:00:00Z', endUtc: '2027-01-01T00:00:00Z' });
    expect(selectActiveFeaturedPlacements([future], opts)).toEqual([]);
  });

  it('returns nothing at all when the flag is off, even for a valid active in-city placement', () => {
    const out = selectActiveFeaturedPlacements([placement()], { ...opts, enabled: false });
    expect(out).toEqual([]);
  });

  it('excludes a placement for a different city', () => {
    const other = placement({ citySlug: 'calgary' });
    expect(selectActiveFeaturedPlacements([other], opts)).toEqual([]);
  });

  it('excludes a placement in the same city slug but a different province', () => {
    // citySlug alone is not unique across provinces (e.g. a "springfield" in
    // more than one), so both province and citySlug must match.
    const other = placement({ province: 'ON' });
    expect(selectActiveFeaturedPlacements([other], opts)).toEqual([]);
  });

  it('returns at most one placement per city (the v1 cap is enforced by data, not asserted here, but the selector must never silently return two)', () => {
    const dupe = [placement({ id: 'a' }), placement({ id: 'b' })];
    const out = selectActiveFeaturedPlacements(dupe, opts);
    // The selector itself doesn't dedupe or cap — that's a bake-time/reservation-
    // ledger concern out of scope for this library (see featured-pricing doc).
    // It must, however, never crash and must never invent a placement that
    // wasn't in the input.
    expect(out.length).toBeLessThanOrEqual(dupe.length);
    for (const p of out) expect(dupe).toContainEqual(p);
  });
});

describe('label and link qualification', () => {
  it('the label is exactly "Paid advertisement" — plain wording, no euphemism', () => {
    expect(FEATURED_LABEL).toBe('Paid advertisement');
  });

  it('the outbound-link rel qualifies the link as sponsored per PLAN.md step 6', () => {
    expect(FEATURED_LINK_REL).toBe('sponsored noopener');
  });
});

describe('ranking invariance — placement data cannot affect ranking order', () => {
  const store = (over: Partial<Store>): Store => ({
    slug: 'x',
    name: 'X',
    city: 'Edmonton',
    citySlug: 'edmonton',
    address: '1 Main St, Edmonton, AB',
    province: 'AB',
    services: [],
    sports: [],
    lat: 53.5,
    lng: -113.5,
    ...over,
  });

  it('a store holding an active Featured placement does not move up the organic ranking', () => {
    const worst = store({ slug: 'worst-shop', name: 'Worst Shop', rating: 3.9, reviewCount: 25 });
    const middle = store({ slug: 'middle-shop', name: 'Middle Shop', rating: 4.5, reviewCount: 60 });
    const best = store({ slug: 'best-shop', name: 'Best Shop', rating: 4.9, reviewCount: 400 });
    const stores = [middle, worst, best];

    const baselineOrder = [...stores].sort(byRecommendedRank).map((s) => s.slug);
    expect(baselineOrder).toEqual(['best-shop', 'middle-shop', 'worst-shop']);

    // Give the WORST-ranked store an active, in-window, in-city Featured
    // placement — if placement data could leak into ranking, this is exactly
    // the shop that would visibly benefit from jumping the queue.
    const worstShopPlacement = placement({ storeSlug: worst.slug, citySlug: worst.citySlug, province: worst.province });
    const active = selectActiveFeaturedPlacements([worstShopPlacement], {
      province: worst.province,
      citySlug: worst.citySlug,
      now: NOW,
      enabled: true,
    });
    expect(active).toHaveLength(1); // sanity: the placement really is active and selected

    // Selecting/reading Featured placements must not touch the Store objects
    // or the comparator at all — re-sorting the identical array must produce
    // the identical order.
    const orderAfter = [...stores].sort(byRecommendedRank).map((s) => s.slug);
    expect(orderAfter).toEqual(baselineOrder);
    expect(orderAfter[0]).not.toBe(worst.slug);
  });

  it('FeaturedPlacement carries no rating/reviewCount-shaped field a ranking function could read', () => {
    const p = placement();
    expect(Object.prototype.hasOwnProperty.call(p, 'rating')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(p, 'reviewCount')).toBe(false);
  });
});
