import { describe, expect, it } from 'vitest';
import { isPokemonShop, pokemonCityCapsule, pokemonCityFaqs, pokemonShopsInCity } from '../../src/lib/tcg';
import type { Store } from '../../src/lib/types';

function store(overrides: Partial<Store>): Store {
  return {
    slug: 'test-store',
    name: 'Test Store',
    city: 'Calgary',
    citySlug: 'calgary',
    address: '123 Main St',
    province: 'AB',
    services: [],
    sports: [],
    lat: 51.05,
    lng: -114.07,
    ...overrides,
  };
}

describe('isPokemonShop', () => {
  it('is true when sports contains Pokemon, case/whitespace-insensitive', () => {
    expect(isPokemonShop(store({ sports: ['Pokemon'] }))).toBe(true);
    expect(isPokemonShop(store({ sports: [' pokemon '] }))).toBe(true);
    expect(isPokemonShop(store({ sports: ['POKEMON'] }))).toBe(true);
  });

  it('is true when services contains pokemon', () => {
    expect(isPokemonShop(store({ services: ['Pokemon'] }))).toBe(true);
  });

  it('is false when no tag matches exactly', () => {
    expect(isPokemonShop(store({ sports: ['Pokemon TCG'], services: [] }))).toBe(false);
    expect(isPokemonShop(store({ sports: ['Hockey'], services: ['Buys'] }))).toBe(false);
    expect(isPokemonShop(store({ sports: [], services: [] }))).toBe(false);
  });
});

describe('pokemonShopsInCity', () => {
  it('filters to only Pokemon shops in the given province+city', () => {
    const stores = [
      store({ slug: 'a', name: 'A', province: 'AB', citySlug: 'calgary', sports: ['Pokemon'] }),
      store({ slug: 'b', name: 'B', province: 'AB', citySlug: 'calgary', sports: ['Hockey'] }),
      store({ slug: 'c', name: 'C', province: 'AB', citySlug: 'edmonton', sports: ['Pokemon'] }),
      store({ slug: 'd', name: 'D', province: 'BC', citySlug: 'calgary', sports: ['Pokemon'] }),
    ];
    const result = pokemonShopsInCity(stores, 'AB', 'calgary');
    expect(result.map((s) => s.slug)).toEqual(['a']);
  });

  it('ranks by rating desc with undefined last, then reviewCount desc, then name', () => {
    const stores = [
      store({ slug: 'unrated-z', name: 'Zebra', sports: ['Pokemon'], rating: undefined }),
      store({ slug: 'low', name: 'Low', sports: ['Pokemon'], rating: 4.0, reviewCount: 500 }),
      store({ slug: 'high-fewer', name: 'HighFewer', sports: ['Pokemon'], rating: 4.9, reviewCount: 10 }),
      store({ slug: 'high-more', name: 'HighMore', sports: ['Pokemon'], rating: 4.9, reviewCount: 50 }),
      store({ slug: 'unrated-a', name: 'Aardvark', sports: ['Pokemon'], rating: undefined }),
    ];
    const result = pokemonShopsInCity(stores, 'AB', 'calgary');
    expect(result.map((s) => s.slug)).toEqual(['high-more', 'high-fewer', 'low', 'unrated-a', 'unrated-z']);
  });
});

describe('pokemonCityCapsule', () => {
  it('uses singular grammar for a one-shop city', () => {
    const capsule = pokemonCityCapsule('Nowhere', 'Alberta', [store({ sports: ['Pokemon'] })]);
    expect(capsule).toContain('1 Pokémon card shop');
    expect(capsule).not.toContain('1 Pokémon card shops');
  });

  it('uses plural grammar and lands in a 35-65 word range for a typical multi-shop city', () => {
    const shops = [
      store({ slug: 'a', name: 'Andys', sports: ['Pokemon'], rating: 4.8, reviewCount: 172 }),
      store({ slug: 'b', name: 'Celly', sports: ['Pokemon'], rating: 4.9, reviewCount: 110 }),
      store({ slug: 'c', name: 'Collectors', sports: ['Pokemon'], rating: 4.4, reviewCount: 35 }),
    ];
    const capsule = pokemonCityCapsule('Toronto', 'Ontario', shops);
    expect(capsule).toContain('3 Pokémon card shops');
    const wordCount = capsule.trim().split(/\s+/).length;
    expect(wordCount).toBeGreaterThanOrEqual(35);
    expect(wordCount).toBeLessThanOrEqual(65);
  });

  it('never claims a rating fact when no shop in the city has one', () => {
    const capsule = pokemonCityCapsule('Nowhere', 'Alberta', [store({ sports: ['Pokemon'], rating: undefined })]);
    expect(capsule).not.toContain('stars');
  });

  it('names the top-rated shop when a rating exists', () => {
    const shops = [
      store({ slug: 'a', name: 'Low', sports: ['Pokemon'], rating: 4.0, reviewCount: 50 }),
      store({ slug: 'b', name: 'Winner', sports: ['Pokemon'], rating: 4.9, reviewCount: 88 }),
    ];
    const capsule = pokemonCityCapsule('Calgary', 'Alberta', shops);
    expect(capsule).toContain('Winner');
    expect(capsule).toContain('4.9 stars');
  });

  it('does not crown a sub-threshold 5.0-from-1-review shop when an eligible 4.9/200 shop exists', () => {
    const shops = [
      store({ slug: 'fluke', name: 'Fluke', sports: ['Pokemon'], rating: 5.0, reviewCount: 1 }),
      store({ slug: 'real', name: 'RealDeal', sports: ['Pokemon'], rating: 4.9, reviewCount: 200 }),
    ];
    const capsule = pokemonCityCapsule('Calgary', 'Alberta', shops);
    expect(capsule).toContain('RealDeal');
    expect(capsule).toContain('4.9 stars');
    expect(capsule).not.toContain('Fluke');
  });

  it('never claims a rank when every rated shop is below MIN_REVIEWS_FOR_TOP', () => {
    const shops = [
      store({ slug: 'fluke-a', name: 'FlukeA', sports: ['Pokemon'], rating: 5.0, reviewCount: 1 }),
      store({ slug: 'fluke-b', name: 'FlukeB', sports: ['Pokemon'], rating: 5.0, reviewCount: 2 }),
    ];
    const capsule = pokemonCityCapsule('Calgary', 'Alberta', shops);
    expect(capsule).not.toContain('ranks first');
    expect(capsule).not.toContain('Fluke');
  });

  it('never contains fabricated price digits', () => {
    const shops = [store({ sports: ['Pokemon'], rating: 4.5, reviewCount: 200 })];
    const capsule = pokemonCityCapsule('Calgary', 'Alberta', shops);
    expect(capsule).not.toContain('$');
  });
});

describe('pokemonCityFaqs', () => {
  it('generates exactly 3 questions', () => {
    const faqs = pokemonCityFaqs('Calgary', 'Alberta', [store({ sports: ['Pokemon'] })], 'https://x/alberta/calgary/');
    expect(faqs).toHaveLength(3);
  });

  it('uses singular grammar and names the shop directly for a one-shop city', () => {
    const faqs = pokemonCityFaqs(
      'Calgary',
      'Alberta',
      [store({ name: 'Solo Shop', sports: ['Pokemon'] })],
      'https://x/alberta/calgary/',
    );
    expect(faqs[0]?.answer).toContain('Solo Shop is the Pokémon card shop we track');
  });

  it('caps named shops at 3 with "and N more" for larger cities', () => {
    const shops = Array.from({ length: 5 }, (_, i) =>
      store({ slug: `s${i}`, name: `Shop${i}`, sports: ['Pokemon'], rating: 5 - i * 0.1, reviewCount: 100 - i }),
    );
    const faqs = pokemonCityFaqs('Toronto', 'Ontario', shops, 'https://x/ontario/toronto/');
    expect(faqs[0]?.answer).toContain('Shop0, Shop1, Shop2, and 2 more');
  });

  it('names the top-rated shop by rating and calls out ratings-not-stock', () => {
    const shops = [
      store({ slug: 'a', name: 'Low', sports: ['Pokemon'], rating: 4.0 }),
      store({ slug: 'b', name: 'Winner', sports: ['Pokemon'], rating: 4.9, reviewCount: 88 }),
    ];
    const faqs = pokemonCityFaqs('Calgary', 'Alberta', shops, 'https://x/alberta/calgary/');
    expect(faqs[1]?.answer).toContain('Winner');
    expect(faqs[1]?.answer).toContain('4.9 stars');
    expect(faqs[1]?.answer).toContain('not verified card inventory or stock');
    expect(faqs[1]?.link).toBeUndefined();
  });

  it('does not crown a sub-threshold 5.0-from-1-review shop as best when an eligible 4.9/200 shop exists', () => {
    const shops = [
      store({ slug: 'fluke', name: 'Fluke', sports: ['Pokemon'], rating: 5.0, reviewCount: 1 }),
      store({ slug: 'real', name: 'RealDeal', sports: ['Pokemon'], rating: 4.9, reviewCount: 200 }),
    ];
    const faqs = pokemonCityFaqs('Calgary', 'Alberta', shops, 'https://x/alberta/calgary/');
    expect(faqs[1]?.answer).toContain('RealDeal');
    expect(faqs[1]?.answer).not.toContain('Fluke');
  });

  it('answers the best-shop question honestly with a link when every rated shop is below the review threshold', () => {
    const shops = [
      store({ slug: 'fluke-a', name: 'FlukeA', sports: ['Pokemon'], rating: 5.0, reviewCount: 1 }),
      store({ slug: 'fluke-b', name: 'FlukeB', sports: ['Pokemon'], rating: 5.0, reviewCount: 2 }),
    ];
    const faqs = pokemonCityFaqs('Calgary', 'Alberta', shops, 'https://x/alberta/calgary/');
    expect(faqs[1]?.answer).toContain("can't name a top pick");
    expect(faqs[1]?.link).toEqual({ href: 'https://x/alberta/calgary/', label: 'Calgary shop directory' });
  });

  it('answers the best-shop question honestly with a link when no shop has a rating', () => {
    const faqs = pokemonCityFaqs(
      'Calgary',
      'Alberta',
      [store({ sports: ['Pokemon'], rating: undefined })],
      'https://x/alberta/calgary/',
    );
    expect(faqs[1]?.answer).toContain("can't name a top pick");
    expect(faqs[1]?.link).toEqual({ href: 'https://x/alberta/calgary/', label: 'Calgary shop directory' });
  });

  it('answers yes on buy/trade when a shop lists Buys or Trades Singles', () => {
    const faqs = pokemonCityFaqs(
      'Calgary',
      'Alberta',
      [store({ name: 'Trader Shop', sports: ['Pokemon'], services: ['Buys'] })],
      'https://x/alberta/calgary/',
    );
    expect(faqs[2]?.answer).toContain('Yes');
    expect(faqs[2]?.answer).toContain('Trader Shop');
    expect(faqs[2]?.link).toBeUndefined();
  });

  it('recognizes Trades Singles case-insensitively for the buy/trade question', () => {
    const faqs = pokemonCityFaqs(
      'Calgary',
      'Alberta',
      [store({ name: 'Singles Shop', sports: ['Pokemon'], services: ['Trades Singles'] })],
      'https://x/alberta/calgary/',
    );
    expect(faqs[2]?.answer).toContain('Yes');
    expect(faqs[2]?.answer).toContain('Singles Shop');
  });

  it('answers the buy/trade question honestly with a link when no shop buys or trades', () => {
    const faqs = pokemonCityFaqs(
      'Calgary',
      'Alberta',
      [store({ sports: ['Pokemon'], services: [] })],
      'https://x/alberta/calgary/',
    );
    expect(faqs[2]?.answer).toContain('None');
    expect(faqs[2]?.link).toEqual({ href: 'https://x/alberta/calgary/', label: 'Calgary shop directory' });
  });

  it('never contains fabricated price digits anywhere in the FAQ answers', () => {
    const faqs = pokemonCityFaqs(
      'Calgary',
      'Alberta',
      [store({ sports: ['Pokemon'], rating: 4.5, reviewCount: 200, services: ['Buys'] })],
      'https://x/alberta/calgary/',
    );
    for (const faq of faqs) {
      expect(faq.answer).not.toContain('$');
    }
  });
});
