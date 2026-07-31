import { describe, expect, it } from 'vitest';
import { storeAnswerCapsule, storeFaqs } from '../../src/lib/seo';
import type { Store } from '../../src/lib/types';

// Store pages were the only major page type with no answer capsule and no FAQ,
// while Search Console showed them earning the site's top impressions on
// shop-name queries ("the hobby spot leduc", "m&l sports cards reviews").
// These helpers close that gap.
const store = (over: Partial<Store> = {}): Store => ({
  slug: 'waynes-sports-cards-edmonton', name: "Wayne's Sports Cards", city: 'Edmonton',
  citySlug: 'edmonton', address: '17020 90 Ave NW, Edmonton, AB', province: 'AB',
  rating: 4.7, reviewCount: 340, hours: undefined, phone: undefined,
  website: undefined, social: undefined, services: ['Sells', 'Buys'],
  sports: ['Hockey', 'Pokemon'], lat: 53.5, lng: -113.6, ...over,
} as Store);

describe('storeAnswerCapsule', () => {
  it('names the shop, its city and its rating — the facts a shop-name search wants', () => {
    const c = storeAnswerCapsule(store(), 'Alberta');
    expect(c).toContain("Wayne's Sports Cards");
    expect(c).toContain('Edmonton');
    expect(c).toContain('4.7');
    expect(c).toContain('340');
  });

  it('never invents a rating when the shop has none', () => {
    const c = storeAnswerCapsule(store({ rating: undefined, reviewCount: undefined }), 'Alberta');
    expect(c).toContain("Wayne's Sports Cards");
    expect(c).not.toMatch(/star|rating|review/i);
  });

  it('states what the shop deals in when that is known', () => {
    expect(storeAnswerCapsule(store(), 'Alberta')).toMatch(/hockey/i);
  });
});

describe('storeFaqs', () => {
  it('answers the "reviews" question, because that is what people actually type', () => {
    const f = storeFaqs(store(), 'Alberta');
    const reviews = f.find((x) => /review|rated/i.test(x.question));
    expect(reviews).toBeDefined();
    expect(reviews?.answer).toContain('340');
  });

  it('answers whether the shop buys collections, from real services data', () => {
    const buys = storeFaqs(store(), 'Alberta').find((x) => /buy/i.test(x.question));
    expect(buys?.answer).toMatch(/does buy|buys/i);
  });

  it('says plainly when buying is not recorded, rather than implying they do not', () => {
    const s = store({ services: ['Sells'] });
    const buys = storeFaqs(s, 'Alberta').find((x) => /buy/i.test(x.question));
    expect(buys?.answer).toMatch(/don't have|not listed|no information/i);
    expect(buys?.answer).not.toMatch(/does not buy|doesn't buy/i);
  });

  it('omits the ratings question entirely for an unrated shop — no empty scaffolding', () => {
    const f = storeFaqs(store({ rating: undefined, reviewCount: undefined }), 'Alberta');
    expect(f.find((x) => /rated|review/i.test(x.question))).toBeUndefined();
  });

  it('every entry has a real question and answer', () => {
    for (const f of storeFaqs(store(), 'Alberta')) {
      expect(f.question.length).toBeGreaterThan(8);
      expect(f.answer.length).toBeGreaterThan(20);
    }
  });
});
