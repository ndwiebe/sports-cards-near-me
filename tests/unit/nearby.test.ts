import { describe, expect, it } from 'vitest';
import { nearestCities, nearestStores, nearestStoresToCity } from '../../src/lib/nearby';
import type { Store } from '../../src/lib/types';

const store = (over: Partial<Store> = {}): Store => ({
  slug: 'a-edmonton', name: 'A', city: 'Edmonton', citySlug: 'edmonton',
  address: '1 Main St, Edmonton, AB', province: 'AB', rating: 4.5, reviewCount: 50,
  hours: undefined, phone: undefined, website: undefined, social: undefined,
  services: [], sports: [], lat: 53.54, lng: -113.49, ...over,
} as Store);

// Edmonton 53.54/-113.49 · Sherwood Park ~20km east · Calgary ~280km south
const EDM = store({ slug: 'a-edmonton', city: 'Edmonton', citySlug: 'edmonton' });
const EDM2 = store({ slug: 'b-edmonton', name: 'B', lat: 53.55, lng: -113.5 });
const SHERWOOD = store({ slug: 'c-sherwood-park', name: 'C', city: 'Sherwood Park', citySlug: 'sherwood-park', lat: 53.52, lng: -113.31 });
const CALGARY = store({ slug: 'd-calgary', name: 'D', city: 'Calgary', citySlug: 'calgary', lat: 51.05, lng: -114.07 });

describe('nearestStores', () => {
  it('never returns the origin shop itself', () => {
    const out = nearestStores([EDM, EDM2, SHERWOOD], EDM);
    expect(out.map((s) => s.slug)).not.toContain('a-edmonton');
  });

  it('orders by real distance, closest first', () => {
    const out = nearestStores([EDM, CALGARY, SHERWOOD, EDM2], EDM, { maxKm: 500 });
    expect(out.map((s) => s.slug)).toEqual(['b-edmonton', 'c-sherwood-park', 'd-calgary']);
  });

  it('drops shops beyond maxKm, so a remote shop links to nothing absurd', () => {
    const out = nearestStores([EDM, CALGARY], EDM, { maxKm: 75 });
    expect(out).toEqual([]);
  });

  it('respects the limit', () => {
    const out = nearestStores([EDM, EDM2, SHERWOOD, CALGARY], EDM, { limit: 1, maxKm: 500 });
    expect(out).toHaveLength(1);
    expect(out[0]?.slug).toBe('b-edmonton');
  });
});

describe('nearestCities', () => {
  it('never returns the origin city', () => {
    const out = nearestCities([EDM, EDM2, SHERWOOD], 'AB', 'edmonton');
    expect(out.map((c) => c.citySlug)).not.toContain('edmonton');
  });

  it('counts the shops in each neighbouring city', () => {
    const out = nearestCities([EDM, EDM2, SHERWOOD], 'AB', 'edmonton', { maxKm: 500 });
    expect(out[0]).toMatchObject({ citySlug: 'sherwood-park', count: 1 });
  });

  it('orders by distance between city centres', () => {
    const out = nearestCities([EDM, EDM2, SHERWOOD, CALGARY], 'AB', 'edmonton', { maxKm: 500 });
    expect(out.map((c) => c.citySlug)).toEqual(['sherwood-park', 'calgary']);
  });

  it('returns an empty list for a city that is not in the data', () => {
    expect(nearestCities([EDM], 'AB', 'nowhere')).toEqual([]);
  });
});

describe('nearestStoresToCity', () => {
  it('returns distance-ranked shops outside the origin city', () => {
    const out = nearestStoresToCity([EDM, EDM2, SHERWOOD, CALGARY], 'AB', 'edmonton', { maxKm: 500 });
    expect(out.map((s) => s.slug)).toEqual(['c-sherwood-park', 'd-calgary']);
  });

  it('uses the 150km city radius by default', () => {
    const out = nearestStoresToCity([EDM, SHERWOOD, CALGARY], 'AB', 'edmonton');
    expect(out.map((s) => s.slug)).toEqual(['c-sherwood-park']);
  });

  it('respects the limit and breaks equal-distance ties by store slug', () => {
    const TIE_Z = store({ slug: 'z-sherwood-park', city: 'Sherwood Park', citySlug: 'sherwood-park', lat: 53.52, lng: -113.31 });
    const out = nearestStoresToCity([EDM, TIE_Z, SHERWOOD], 'AB', 'edmonton', { limit: 1 });
    expect(out.map((s) => s.slug)).toEqual(['c-sherwood-park']);
  });

  it('returns an empty list for a city that is not in the data', () => {
    expect(nearestStoresToCity([EDM], 'AB', 'nowhere')).toEqual([]);
  });
});

describe('nearestCities — cities that share a citySlug across provinces', () => {
  // Mirrors real data: src/data/stores.json has "Stratford, ON" (2 shops,
  // ~43.37/-80.98) and "Stratford, PE" (1 shop, ~46.22/-63.09) — different
  // real places 1440+ km apart that happen to share citySlug 'stratford'.
  // Grouping by citySlug alone (the bug) averaged them into one fake centre
  // near neither. citiesIn() in src/lib/stores.ts already scopes by province
  // before grouping by slug; nearby.ts now follows the same pattern.
  const STRATFORD_ON_1 = store({
    slug: 'x-stratford-on', name: 'X', city: 'Stratford', citySlug: 'stratford',
    province: 'ON', lat: 43.3679, lng: -80.98033,
  });
  const STRATFORD_ON_2 = store({
    slug: 'y-stratford-on', name: 'Y', city: 'Stratford', citySlug: 'stratford',
    province: 'ON', lat: 43.36883, lng: -80.98087,
  });
  const STRATFORD_PE = store({
    slug: 'z-stratford-pe', name: 'Z', city: 'Stratford', citySlug: 'stratford',
    province: 'PE', lat: 46.22066, lng: -63.08665,
  });
  // A real Stratford, ON neighbour ~17.6km away — St. Marys, ON.
  const ST_MARYS_ON = store({
    slug: 'w-st-marys', name: 'W', city: 'St. Marys', citySlug: 'st-marys',
    province: 'ON', lat: 43.2589, lng: -81.1379,
  });
  // A real Stratford, PE neighbour ~3.9km away — Charlottetown, PE.
  const CHARLOTTETOWN_PE = store({
    slug: 'v-charlottetown', name: 'V', city: 'Charlottetown', citySlug: 'charlottetown',
    province: 'PE', lat: 46.2382, lng: -63.1311,
  });
  const all = [STRATFORD_ON_1, STRATFORD_ON_2, STRATFORD_PE, ST_MARYS_ON, CHARLOTTETOWN_PE];

  it('centres Stratford, ON on its real Ontario shops and finds its real Ontario neighbour', () => {
    const out = nearestCities(all, 'ON', 'stratford');
    expect(out.map((c) => c.citySlug)).toContain('st-marys');
  });

  it('centres Stratford, PE on its real PEI shop and finds its real PEI neighbour', () => {
    const out = nearestCities(all, 'PE', 'stratford');
    expect(out.map((c) => c.citySlug)).toContain('charlottetown');
  });

  it('never blends the two Stratfords into a cross-country false neighbour', () => {
    const outOn = nearestCities(all, 'ON', 'stratford');
    const outPe = nearestCities(all, 'PE', 'stratford');
    // 1440+ km apart in reality, so with a correct (unmerged) centre neither
    // Stratford's 150km-default neighbour search can reach the other's province.
    expect(outOn.some((c) => c.province === 'PE')).toBe(false);
    expect(outPe.some((c) => c.province === 'ON')).toBe(false);
  });

  it('keeps each same-slug city\'s own shop count separate (2 in ON, 1 in PE), proving they were not merged into one centre', () => {
    const out = nearestCities(all, 'ON', 'st-marys');
    const strat = out.find((c) => c.citySlug === 'stratford');
    expect(strat).toBeDefined();
    expect(strat).toMatchObject({ citySlug: 'stratford', province: 'ON', count: 2 });
  });
});
