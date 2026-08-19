import { describe, expect, it } from 'vitest';
import { nearestStores, nearestCities } from '../../src/lib/nearby';
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
    const out = nearestCities([EDM, EDM2, SHERWOOD], 'edmonton');
    expect(out.map((c) => c.citySlug)).not.toContain('edmonton');
  });

  it('counts the shops in each neighbouring city', () => {
    const out = nearestCities([EDM, EDM2, SHERWOOD], 'edmonton', { maxKm: 500 });
    expect(out[0]).toMatchObject({ citySlug: 'sherwood-park', count: 1 });
  });

  it('orders by distance between city centres', () => {
    const out = nearestCities([EDM, EDM2, SHERWOOD, CALGARY], 'edmonton', { maxKm: 500 });
    expect(out.map((c) => c.citySlug)).toEqual(['sherwood-park', 'calgary']);
  });

  it('returns an empty list for a city that is not in the data', () => {
    expect(nearestCities([EDM], 'nowhere')).toEqual([]);
  });
});
