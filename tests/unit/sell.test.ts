import { describe, expect, it } from 'vitest';
import { buyersInCity, isBuyer, sellCityCapsule, sellCityFaqs } from '../../src/lib/sell';
import type { Store } from '../../src/lib/types';

function store(overrides: Partial<Store>): Store {
  return {
    slug: 'test-store',
    name: 'Test Store',
    city: 'Winnipeg',
    citySlug: 'winnipeg',
    address: '123 Main St',
    province: 'MB',
    services: [],
    sports: [],
    lat: 49.9,
    lng: -97.14,
    ...overrides,
  };
}

const PRICE_PATTERN = /\$\s?\d|\d+\s?(dollars|usd|cad)\b/i;

describe('isBuyer', () => {
  it('matches the exact service "buys" case-insensitively and trimmed', () => {
    expect(isBuyer(store({ services: ['Buys'] }))).toBe(true);
    expect(isBuyer(store({ services: [' BUYS '] }))).toBe(true);
    expect(isBuyer(store({ services: ['buys'] }))).toBe(true);
  });

  it('does not match unrelated or partial services', () => {
    expect(isBuyer(store({ services: ['Sells'] }))).toBe(false);
    expect(isBuyer(store({ services: ['Buys and sells'] }))).toBe(false);
    expect(isBuyer(store({ services: [] }))).toBe(false);
  });
});

describe('buyersInCity', () => {
  it('filters to only buyers in the given province and city', () => {
    const stores = [
      store({ slug: 'a', name: 'A', services: ['Buys'], province: 'MB', citySlug: 'winnipeg' }),
      store({ slug: 'b', name: 'B', services: [], province: 'MB', citySlug: 'winnipeg' }),
      store({ slug: 'c', name: 'C', services: ['Buys'], province: 'AB', citySlug: 'winnipeg' }),
      store({ slug: 'd', name: 'D', services: ['Buys'], province: 'MB', citySlug: 'brandon' }),
    ];
    const result = buyersInCity(stores, 'MB', 'winnipeg');
    expect(result.map((s) => s.slug)).toEqual(['a']);
  });

  it('returns an empty array for a city with zero buyers, without throwing', () => {
    const stores = [store({ slug: 'a', services: [] })];
    expect(buyersInCity(stores, 'MB', 'winnipeg')).toEqual([]);
  });

  it('ranks by rating desc (undefined last), then reviewCount desc, then name', () => {
    const stores = [
      store({ slug: 'no-rating-b', name: 'Zeta', services: ['Buys'], rating: undefined }),
      store({ slug: 'no-rating-a', name: 'Alpha', services: ['Buys'], rating: undefined }),
      store({ slug: 'low-rating', name: 'Low', services: ['Buys'], rating: 4.0, reviewCount: 500 }),
      store({ slug: 'tie-more-reviews', name: 'TieMore', services: ['Buys'], rating: 4.8, reviewCount: 300 }),
      store({ slug: 'tie-fewer-reviews', name: 'TieFewer', services: ['Buys'], rating: 4.8, reviewCount: 10 }),
      store({ slug: 'top', name: 'Top', services: ['Buys'], rating: 4.9, reviewCount: 1 }),
    ];
    const result = buyersInCity(stores, 'MB', 'winnipeg');
    expect(result.map((s) => s.slug)).toEqual([
      'top',
      'tie-more-reviews',
      'tie-fewer-reviews',
      'low-rating',
      'no-rating-a',
      'no-rating-b',
    ]);
  });
});

describe('sellCityCapsule', () => {
  it('uses singular grammar for a single-buyer city', () => {
    const capsule = sellCityCapsule('Brandon', 'Manitoba', [store({ name: 'Solo Shop', services: ['Buys'] })]);
    expect(capsule).toContain('1 sports card shop in Brandon, Manitoba lists buying collections');
    expect(capsule).not.toContain('shops');
    expect(capsule).not.toContain('they list');
  });

  it('produces a 40-60 word capsule for a multi-buyer, rated city and names the top buyer', () => {
    const buyers = [
      store({ slug: 'a', name: 'CanCentral', services: ['Buys'], rating: 4.8, reviewCount: 200 }),
      store({ slug: 'b', name: 'First Row', services: ['Buys'], rating: 4.5, reviewCount: 90 }),
      store({ slug: 'c', name: 'Joe Daleys', services: ['Buys'], rating: 4.2, reviewCount: 40 }),
    ];
    const capsule = sellCityCapsule('Winnipeg', 'Manitoba', buyers);
    const wordCount = capsule.trim().split(/\s+/).length;
    expect(wordCount).toBeGreaterThanOrEqual(40);
    expect(wordCount).toBeLessThanOrEqual(60);
    expect(capsule).toContain('3 sports card shops');
    expect(capsule).toContain('CanCentral');
    expect(capsule).toContain('4.8 stars');
  });

  it('never fabricates a price and handles zero buyers without throwing', () => {
    const capsule = sellCityCapsule('Nowhere', 'Alberta', []);
    expect(capsule).not.toMatch(PRICE_PATTERN);
    expect(capsule.length).toBeGreaterThan(0);
  });

  it('omits the top-rated claim when no buyer in the city has a rating', () => {
    const capsule = sellCityCapsule('Brandon', 'Manitoba', [store({ name: 'Unrated', services: ['Buys'] })]);
    expect(capsule).not.toContain('highest-rated');
  });
});

describe('sellCityFaqs', () => {
  const cityUrl = 'https://x/manitoba/winnipeg/';
  const guideUrl = 'https://x/guides/selling-your-collection/';

  it('generates exactly 3 questions', () => {
    const faqs = sellCityFaqs('Winnipeg', 'Manitoba', [store({ services: ['Buys'] })], cityUrl, guideUrl);
    expect(faqs).toHaveLength(3);
  });

  it('names up to 3 top buyers in the first answer, in ranked order', () => {
    const buyers = [
      store({ slug: 'a', name: 'CanCentral', services: ['Buys'], rating: 4.9 }),
      store({ slug: 'b', name: 'First Row', services: ['Buys'], rating: 4.7 }),
      store({ slug: 'c', name: 'Joe Daleys', services: ['Buys'], rating: 4.5 }),
      store({ slug: 'd', name: 'Lower Level', services: ['Buys'], rating: 4.3 }),
      store({ slug: 'e', name: 'Superstars', services: ['Buys'], rating: 4.1 }),
    ];
    const faqs = sellCityFaqs('Winnipeg', 'Manitoba', buyers, cityUrl, guideUrl);
    expect(faqs[0]?.question).toBe('Where can I sell sports cards in Winnipeg?');
    expect(faqs[0]?.answer).toContain('CanCentral, First Row, Joe Daleys, and 2 more');
    expect(faqs[0]?.link).toEqual({ href: cityUrl, label: 'Winnipeg shop directory' });
  });

  it('answers honestly when a city has zero buyers', () => {
    const faqs = sellCityFaqs('Nowhere', 'Alberta', [], cityUrl, guideUrl);
    expect(faqs[0]?.answer).toContain('No shops');
  });

  it('never states a price and always links the selling guide for the value question', () => {
    const faqs = sellCityFaqs('Winnipeg', 'Manitoba', [store({ services: ['Buys'] })], cityUrl, guideUrl);
    expect(faqs[1]?.question).toBe('How much are my cards worth?');
    expect(faqs[1]?.link).toEqual({ href: guideUrl, label: 'guide to selling a collection' });
    for (const faq of faqs) {
      expect(faq.answer).not.toMatch(PRICE_PATTERN);
    }
  });

  it('gives general shop-vs-online guidance linking the guide for the third question', () => {
    const faqs = sellCityFaqs('Winnipeg', 'Manitoba', [store({ services: ['Buys'] })], cityUrl, guideUrl);
    expect(faqs[2]?.question).toBe('Is it better to sell to a shop or online?');
    expect(faqs[2]?.link).toEqual({ href: guideUrl, label: 'guide to selling a collection' });
  });
});
