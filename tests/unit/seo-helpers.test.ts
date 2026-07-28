import { describe, expect, it } from 'vitest';
import {
  breadcrumbListLd,
  cityAnswerCapsule,
  cityFaqs,
  faqPageLd,
  itemListLd,
  ldJson,
  MIN_REVIEWS_FOR_TOP,
  provinceAnswerCapsule,
  topRatedStore,
  weightedRating,
  corpusMeanRating,
  byWeightedRankIn,
} from '../../src/lib/seo';
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

describe('ldJson', () => {
  it('escapes < to prevent script-breakout XSS', () => {
    const out = ldJson({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c/script>\\u003cscript>alert(1)\\u003c/script>');
  });

  it('round-trips valid JSON', () => {
    const payload = { a: 1, b: [1, 2, 3] };
    expect(JSON.parse(ldJson(payload))).toEqual(payload);
  });
});

describe('breadcrumbListLd', () => {
  it('numbers positions from 1 and preserves order', () => {
    const ld = breadcrumbListLd([
      { name: 'Home', url: 'https://x/' },
      { name: 'Alberta', url: 'https://x/alberta/' },
      { name: 'Calgary', url: 'https://x/alberta/calgary/' },
    ]);
    expect(ld['@type']).toBe('BreadcrumbList');
    const items = ld['itemListElement'] as Array<Record<string, unknown>>;
    expect(items).toHaveLength(3);
    expect(items.map((i) => i['position'])).toEqual([1, 2, 3]);
    expect(items[2]?.['name']).toBe('Calgary');
    expect(items[2]?.['item']).toBe('https://x/alberta/calgary/');
  });
});

describe('itemListLd', () => {
  it('caps items when a cap is given', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ name: `Store ${i}`, url: `https://x/${i}/` }));
    const ld = itemListLd(items, 25);
    const list = ld['itemListElement'] as Array<Record<string, unknown>>;
    expect(list).toHaveLength(25);
    expect(list[24]?.['position']).toBe(25);
  });

  it('does not cap when no cap is given', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ name: `City ${i}`, url: `https://x/${i}/` }));
    const ld = itemListLd(items);
    expect((ld['itemListElement'] as unknown[]).length).toBe(30);
  });
});

describe('faqPageLd', () => {
  it('maps question/answer pairs into schema.org shape', () => {
    const ld = faqPageLd([{ question: 'Q1?', answer: 'A1.' }]);
    expect(ld['@type']).toBe('FAQPage');
    const entities = ld['mainEntity'] as Array<Record<string, unknown>>;
    expect(entities[0]?.['name']).toBe('Q1?');
    expect((entities[0]?.['acceptedAnswer'] as Record<string, unknown>)['text']).toBe('A1.');
  });
});

describe('cityAnswerCapsule', () => {
  it('produces a single paragraph in the 40-60 word range for a typical city', () => {
    const stores = [
      store({ slug: 'a', name: 'Andys', rating: 4.8, reviewCount: 172 }),
      store({ slug: 'b', name: 'Celly', rating: 4.9, reviewCount: 110 }),
      store({ slug: 'c', name: 'Collectors', rating: 4.4, reviewCount: 35 }),
      store({ slug: 'd', name: 'Eastridge', rating: 4.5, reviewCount: 389 }),
      store({ slug: 'e', name: 'Maple Leaf', rating: 4, reviewCount: 114 }),
      store({ slug: 'f', name: 'Olympic', rating: 4.7, reviewCount: 74 }),
      store({ slug: 'g', name: 'Overtime', rating: 4.5, reviewCount: 42 }),
      store({ slug: 'h', name: 'Sentry Box', rating: 4.5, reviewCount: 285 }),
    ];
    const capsule = cityAnswerCapsule('Calgary', 'Alberta', stores);
    const wordCount = capsule.trim().split(/\s+/).length;
    expect(wordCount).toBeGreaterThanOrEqual(35);
    expect(wordCount).toBeLessThanOrEqual(65);
    expect(capsule).toContain('Calgary, Alberta has 8 sports card shops');
    expect(capsule).toContain('map');
  });

  it('never claims a fact for cities with no rating data', () => {
    const stores = [store({ slug: 'a', name: 'No Rating Shop' })];
    const capsule = cityAnswerCapsule('Nowhere', 'Alberta', stores);
    expect(capsule).not.toContain('rating');
    expect(capsule).toContain('1 sports card shop');
  });

  it('mentions computed tags when services/sports are present', () => {
    const stores = [store({ slug: 'a', name: 'Grader', services: ['Grading Services'], sports: ['Hockey'] })];
    const capsule = cityAnswerCapsule('Tagtown', 'Alberta', stores);
    expect(capsule).toContain('Grading Services');
    expect(capsule).toContain('Hockey');
  });
});

describe('provinceAnswerCapsule', () => {
  it('names the single biggest city by store count', () => {
    const capsule = provinceAnswerCapsule('Alberta', [
      { city: 'Calgary', citySlug: 'calgary', stores: [store({}), store({}), store({})] },
      { city: 'Edmonton', citySlug: 'edmonton', stores: [store({})] },
    ]);
    expect(capsule).toContain('Alberta has 4 sports card shops listed across 2 cities');
    expect(capsule).toContain('Calgary has the most with 3 shops');
  });

  it('handles a tie honestly instead of naming one city as uniquely biggest', () => {
    const capsule = provinceAnswerCapsule('Alberta', [
      { city: 'Calgary', citySlug: 'calgary', stores: [store({})] },
      { city: 'Edmonton', citySlug: 'edmonton', stores: [store({})] },
    ]);
    expect(capsule).toContain('2 cities tie for the most, each with 1 shop');
  });

  it('handles a province with zero stores without dividing by zero or naming a city', () => {
    const capsule = provinceAnswerCapsule('Nunavut', [{ city: 'Iqaluit', citySlug: 'iqaluit', stores: [] }]);
    expect(capsule).toContain('0 sports card shops');
    expect(capsule).not.toContain('has the most');
  });
});

describe('topRatedStore', () => {
  it('picks the highest rating among stores meeting MIN_REVIEWS_FOR_TOP', () => {
    const stores = [
      store({ slug: 'a', name: 'A', rating: 4.5, reviewCount: 20 }),
      store({ slug: 'b', name: 'B', rating: 4.9, reviewCount: 300 }),
    ];
    expect(topRatedStore(stores)?.name).toBe('B');
  });

  it('does not crown a sub-threshold 5.0-from-1-review store over an eligible 4.9/200 store', () => {
    const stores = [
      store({ slug: 'fluke', name: 'Fluke', rating: 5.0, reviewCount: 1 }),
      store({ slug: 'real', name: 'RealDeal', rating: 4.9, reviewCount: 200 }),
    ];
    expect(topRatedStore(stores)?.name).toBe('RealDeal');
  });

  it('returns undefined when every rated store is below MIN_REVIEWS_FOR_TOP', () => {
    const stores = [
      store({ slug: 'fluke-a', name: 'FlukeA', rating: 5.0, reviewCount: 1 }),
      store({ slug: 'fluke-b', name: 'FlukeB', rating: 5.0, reviewCount: 2 }),
    ];
    expect(topRatedStore(stores)).toBeUndefined();
  });

  it('treats a missing reviewCount as zero, below the threshold', () => {
    const stores = [store({ slug: 'no-count', name: 'NoCount', rating: 5.0 })];
    expect(topRatedStore(stores)).toBeUndefined();
  });

  it('is exactly at the threshold boundary — MIN_REVIEWS_FOR_TOP reviews qualifies', () => {
    const stores = [store({ slug: 'boundary', name: 'Boundary', rating: 4.6, reviewCount: MIN_REVIEWS_FOR_TOP })];
    expect(topRatedStore(stores)?.name).toBe('Boundary');
  });
});

describe('cityFaqs', () => {
  it('generates exactly 3 questions', () => {
    const faqs = cityFaqs('Calgary', 'Alberta', 'https://x/alberta/', [store({})], 'calgary');
    expect(faqs).toHaveLength(3);
  });

  it('names the top-rated store in the count answer when ratings exist', () => {
    const stores = [
      store({ slug: 'a', name: 'Low', rating: 4.0, reviewCount: 50 }),
      store({ slug: 'b', name: 'Winner', rating: 4.9, reviewCount: 200 }),
    ];
    const faqs = cityFaqs('Calgary', 'Alberta', 'https://x/alberta/', stores, 'calgary');
    expect(faqs[0]?.answer).toContain('Winner');
    expect(faqs[0]?.answer).toContain('4.9 stars');
  });

  it('omits a top-rated claim when no store in the city has a rating', () => {
    const faqs = cityFaqs('Calgary', 'Alberta', 'https://x/alberta/', [store({ rating: undefined })], 'calgary');
    expect(faqs[0]?.answer).not.toContain('highest-rated');
  });

  it('does not crown a sub-threshold 5.0-from-1-review store when an eligible 4.9/200 store exists', () => {
    const stores = [
      store({ slug: 'fluke', name: 'Fluke', rating: 5.0, reviewCount: 1 }),
      store({ slug: 'real', name: 'RealDeal', rating: 4.9, reviewCount: 200 }),
    ];
    const faqs = cityFaqs('Calgary', 'Alberta', 'https://x/alberta/', stores, 'calgary');
    expect(faqs[0]?.answer).toContain('RealDeal');
    expect(faqs[0]?.answer).toContain('4.9 stars');
    expect(faqs[0]?.answer).not.toContain('Fluke');
  });

  it('drops the highest-rated claim when every rated store is below MIN_REVIEWS_FOR_TOP', () => {
    const stores = [
      store({ slug: 'fluke-a', name: 'FlukeA', rating: 5.0, reviewCount: 1 }),
      store({ slug: 'fluke-b', name: 'FlukeB', rating: 5.0, reviewCount: 2 }),
    ];
    const faqs = cityFaqs('Calgary', 'Alberta', 'https://x/alberta/', stores, 'calgary');
    expect(faqs[0]?.answer).not.toContain('highest-rated');
    expect(faqs[0]?.answer).not.toContain('Fluke');
  });

  it('answers yes with names and links the sell page when a store lists Buys', () => {
    const faqs = cityFaqs(
      'Calgary',
      'Alberta',
      'https://x/alberta/',
      [store({ name: 'Buyer Shop', services: ['Buys'] })],
      'calgary',
    );
    const buysFaq = faqs[1]!;
    expect(buysFaq.answer).toContain('Yes');
    expect(buysFaq.answer).toContain('Buyer Shop');
    expect(buysFaq.link).toEqual({ href: '/sell/calgary/', label: 'See shops that buy in Calgary' });
  });

  it('answers honestly and links the province page when no store buys collections', () => {
    const faqs = cityFaqs('Calgary', 'Alberta', 'https://x/alberta/', [store({ services: [] })], 'calgary');
    const buysFaq = faqs[1]!;
    expect(buysFaq.answer).toContain('None');
    expect(buysFaq.link).toEqual({ href: 'https://x/alberta/', label: 'Alberta page' });
  });

  it('answers yes for Pokemon when a sports tag matches case-insensitively, and links the pokemon page', () => {
    const faqs = cityFaqs(
      'Calgary',
      'Alberta',
      'https://x/alberta/',
      [store({ name: 'Poke Shop', sports: ['Pokemon'] })],
      'calgary',
    );
    const pokemonFaq = faqs[2]!;
    expect(pokemonFaq.answer).toContain('Yes');
    expect(pokemonFaq.answer).toContain('Poke Shop');
    expect(pokemonFaq.link).toEqual({ href: '/pokemon/calgary/', label: 'See Pokémon shops in Calgary' });
  });

  it('answers honestly and links the province page when no store carries Pokemon', () => {
    const faqs = cityFaqs('Calgary', 'Alberta', 'https://x/alberta/', [store({ sports: [] })], 'calgary');
    const pokemonFaq = faqs[2]!;
    expect(pokemonFaq.answer).toContain('None');
    expect(pokemonFaq.link).toEqual({ href: 'https://x/alberta/', label: 'Alberta page' });
  });

  it('produces the same question/answer array used for both visible copy and JSON-LD', () => {
    const faqs = cityFaqs('Calgary', 'Alberta', 'https://x/alberta/', [store({})], 'calgary');
    const ld = faqPageLd(faqs);
    const entities = ld['mainEntity'] as Array<Record<string, unknown>>;
    expect(entities).toHaveLength(faqs.length);
    faqs.forEach((faq, i) => {
      expect(entities[i]?.['name']).toBe(faq.question);
      expect((entities[i]?.['acceptedAnswer'] as Record<string, unknown>)['text']).toBe(faq.answer);
    });
  });
});

// --- Bayesian weighting -----------------------------------------------------
// The motivating real case: Edmonton's Dave's Card Shop (5.0 from 22 reviews)
// outranked Froggers (4.9 from 267) under raw-rating sorting. Volume is evidence;
// a thin perfect score should not beat a well-evidenced near-perfect one.

describe('weightedRating', () => {
  it('pulls a low-review rating toward the corpus mean', () => {
    const mean = 4.6;
    const thin = weightedRating(5.0, 2, mean);
    expect(thin).toBeGreaterThan(mean);
    expect(thin).toBeLessThan(5.0);
  });

  it('barely moves a rating backed by many reviews', () => {
    const mean = 4.6;
    expect(weightedRating(4.9, 1000, mean)).toBeCloseTo(4.9, 1);
  });

  it('returns the corpus mean for a shop with zero reviews', () => {
    expect(weightedRating(5.0, 0, 4.6)).toBeCloseTo(4.6, 5);
  });

  it('ranks 4.9-from-267 above 5.0-from-22 (the case that motivated this)', () => {
    const mean = 4.6063;
    expect(weightedRating(4.9, 267, mean)).toBeGreaterThan(weightedRating(5.0, 22, mean));
  });

  it('still prefers the higher rating when review counts are comparable', () => {
    const mean = 4.6;
    expect(weightedRating(4.9, 200, mean)).toBeGreaterThan(weightedRating(4.7, 200, mean));
  });
});

describe('corpusMeanRating', () => {
  it('averages only rated stores, ignoring unrated ones', () => {
    const stores = [
      store({ slug: 'a', name: 'A', rating: 5.0, reviewCount: 10 }),
      store({ slug: 'b', name: 'B', rating: 4.0, reviewCount: 10 }),
      store({ slug: 'c', name: 'C' }),
    ];
    expect(corpusMeanRating(stores)).toBeCloseTo(4.5, 5);
  });

  it('returns 0 when nothing is rated, rather than NaN', () => {
    expect(corpusMeanRating([store({ slug: 'a', name: 'A' })])).toBe(0);
  });
});

describe('byWeightedRankIn', () => {
  const wellReviewed = store({ slug: 'frog', name: 'Froggers', rating: 4.9, reviewCount: 267 });
  const thinPerfect = store({ slug: 'daves', name: "Dave's", rating: 5.0, reviewCount: 22 });
  const belowBar = store({ slug: 'new', name: 'Newcomer', rating: 5.0, reviewCount: 3 });
  const unrated = store({ slug: 'unrated', name: 'Unrated' });

  it('puts the well-reviewed 4.9 ahead of the thin 5.0', () => {
    const corpus = [thinPerfect, wellReviewed];
    const sorted = [...corpus].sort(byWeightedRankIn(corpus));
    expect(sorted.map((s) => s.name)).toEqual(['Froggers', "Dave's"]);
  });

  it('keeps sub-threshold and unrated shops listed, just never on top', () => {
    const corpus = [unrated, belowBar, thinPerfect, wellReviewed];
    const sorted = [...corpus].sort(byWeightedRankIn(corpus));
    expect(sorted.map((s) => s.name)).toEqual(['Froggers', "Dave's", 'Newcomer', 'Unrated']);
    expect(sorted).toHaveLength(4);
  });
});

describe('topRatedStore with weighting', () => {
  it('crowns the better-evidenced shop, not the thin perfect score', () => {
    const stores = [
      store({ slug: 'daves', name: "Dave's", rating: 5.0, reviewCount: 22 }),
      store({ slug: 'frog', name: 'Froggers', rating: 4.9, reviewCount: 267 }),
    ];
    expect(topRatedStore(stores)?.name).toBe('Froggers');
  });

  it('still ignores shops below MIN_REVIEWS_FOR_TOP entirely', () => {
    const stores = [
      store({ slug: 'thin', name: 'Thin', rating: 5.0, reviewCount: MIN_REVIEWS_FOR_TOP - 1 }),
      store({ slug: 'ok', name: 'Qualified', rating: 4.2, reviewCount: MIN_REVIEWS_FOR_TOP }),
    ];
    expect(topRatedStore(stores)?.name).toBe('Qualified');
  });
});
