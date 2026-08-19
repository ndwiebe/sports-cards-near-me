import { describe, expect, it } from 'vitest';
import { sellPageExistsForCity } from '../../src/lib/sell';
import type { Store } from '../../src/lib/types';

const store = (over: Partial<Store> = {}): Store => ({
  slug: 'a-edmonton', name: 'A', city: 'Edmonton', citySlug: 'edmonton',
  address: '1 Main St, Edmonton, AB', province: 'AB', rating: 4.5, reviewCount: 50,
  hours: undefined, phone: undefined, website: undefined, social: undefined,
  services: [], sports: [], lat: 53.54, lng: -113.49, ...over,
} as Store);

/**
 * Mirrors the exact gate `/sell/[city]/index.astro`'s getStaticPaths() uses:
 * a page exists for a citySlug iff some store there passes isBuyer(). This
 * helper exists so storeFaqs() can ask the same question without importing
 * an Astro page file, which it cannot do.
 */
describe('sellPageExistsForCity', () => {
  it('is true when a store in that city buys collections', () => {
    expect(sellPageExistsForCity([store({ services: ['Buys'] })], 'edmonton')).toBe(true);
  });

  it('is false when no store in that city buys collections', () => {
    expect(sellPageExistsForCity([store({ services: ['Sells'] })], 'edmonton')).toBe(false);
  });

  it('is false for a city with no stores at all', () => {
    expect(sellPageExistsForCity([store({ services: ['Buys'] })], 'calgary')).toBe(false);
  });

  it('matches case- and whitespace-insensitively, same as isBuyer', () => {
    expect(sellPageExistsForCity([store({ services: [' buys ' as never] })], 'edmonton')).toBe(true);
  });

  it('is true if ANY store in the city buys, even if others in the same city do not', () => {
    const stores = [store({ slug: 'a', services: ['Sells'] }), store({ slug: 'b', services: ['Buys'] })];
    expect(sellPageExistsForCity(stores, 'edmonton')).toBe(true);
  });

  it('ignores buyers in a different city entirely', () => {
    const stores = [store({ citySlug: 'calgary', services: ['Buys'] })];
    expect(sellPageExistsForCity(stores, 'edmonton')).toBe(false);
  });
});
