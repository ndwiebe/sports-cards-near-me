import { describe, expect, it } from 'vitest';
import storesJson from '../../src/data/stores.json';
import type { Store } from '../../src/lib/types';
import { rankedFirstPhrase, storeTitle, TITLE_BUDGET } from '../../src/lib/seo';

const stores = storesJson as Store[];

/**
 * Store titles were rewritten on 2026-08-25 off the Search Console read: 76
 * "<shop> reviews" queries drew 807 impressions and one click at positions 6–11.
 * The rating was already in the title; the query's own words — the shop name and
 * "Reviews" — and the review count that gives a rating meaning were not.
 */
describe('storeTitle', () => {
  const rated = stores.filter((s) => s.rating !== undefined && s.reviewCount !== undefined);
  const unrated = stores.filter((s) => s.rating === undefined || s.reviewCount === undefined);

  it('puts the query words first: shop name, then rating, then review count', () => {
    const s = rated[0]!;
    const t = storeTitle(s);
    expect(t.startsWith(s.name)).toBe(true);
    expect(t).toContain(`${s.rating}★`);
    expect(t).toContain(`${s.reviewCount} Reviews`);
    expect(t.indexOf('★')).toBeLessThan(t.indexOf('Reviews'));
  });

  it('says nothing about reviews for a shop whose reviews we do not hold', () => {
    for (const s of unrated) {
      const t = storeTitle(s);
      expect(t, `${s.name} has no rating but its title mentions reviews`).not.toMatch(/review|★/i);
    }
  });

  it('never abbreviates the business name, and puts city last so truncation eats that first', () => {
    for (const s of stores) {
      const t = storeTitle(s);
      expect(t.startsWith(s.name), `${s.name} was altered in its own title`).toBe(true);
      if (s.rating !== undefined && s.reviewCount !== undefined) {
        expect(t.lastIndexOf(s.city)).toBeGreaterThan(t.indexOf('Reviews'));
      }
    }
  });

  it('spends almost nothing on scaffolding — only real names and places cost length', () => {
    // The first draft of this test asserted that only a long shop NAME could bust
    // the budget. Wrong: Saint-Jean-sur-Richelieu and Saint-Bruno-de-Montarville
    // bust it on the CITY, which is genuine data and sits last precisely so it
    // truncates first. What the template must be held to is its own overhead.
    const SCAFFOLD_BUDGET = 26; // " — 4.7★, 1454 Reviews · "
    for (const s of stores) {
      if (s.rating === undefined || s.reviewCount === undefined) continue;
      const fixed =
        storeTitle(s).length -
        s.name.length -
        s.city.length -
        String(s.rating).length -
        String(s.reviewCount).length;
      expect(
        fixed,
        `${s.name}: the template itself spends ${fixed} characters around the real data`,
      ).toBeLessThanOrEqual(SCAFFOLD_BUDGET);
    }
  });

  it('keeps the median title inside the budget', () => {
    const lens = stores.map((s) => storeTitle(s).length).sort((a, b) => a - b);
    const median = lens[Math.floor(lens.length / 2)];
    expect(median, `median store title is ${median} chars`).toBeLessThanOrEqual(TITLE_BUDGET);
  });
});

/**
 * topRatedStore() returns the highest WEIGHTED score, not the highest star
 * rating. Prose describing it said "Top rated:" on 351 built pages until
 * 2026-08-25. This locks the replacement wording.
 */
describe('rankedFirstPhrase', () => {
  const s = stores.find((x) => x.rating !== undefined && x.reviewCount !== undefined)!;

  it('claims an ordering, never a rating', () => {
    const p = rankedFirstPhrase(s);
    expect(p).toContain('ranks first');
    expect(p).not.toMatch(/top[\s-]rated|highest[\s-]rated|best[\s-]rated/i);
  });

  it('states the method, so the star number cannot read as a rating claim', () => {
    expect(rankedFirstPhrase(s)).toContain('review-weighted score');
  });

  it('still states the method when we hold no rating for the shop', () => {
    const bare = { ...s, rating: undefined, reviewCount: undefined } as Store;
    const p = rankedFirstPhrase(bare);
    expect(p).toContain('ranks first on our review-weighted score');
    expect(p).not.toMatch(/★|reviews\)/);
  });

  it('can name the city for province-level pages', () => {
    expect(rankedFirstPhrase(s, true)).toContain(`${s.name} in ${s.city}`);
  });
});

/**
 * A meta description is allowed to run past Google's ~160-character cut — what is
 * NOT allowed is for the part that answers the searcher's question to fall past
 * it. One shop name in the directory is 58 characters, so the ranks-first mention
 * cannot always fit; the sentence saying what the page is always must.
 */
describe('city meta description', () => {
  const DESC_CUT = 160;
  it('gets what the page IS into the first sentence, inside the cut', () => {
    for (const s of stores.slice(0, 50)) {
      const lead = `All 12 card shops in ${s.city}, ${s.province} — Google ratings, map and directions, rebuilt daily.`;
      expect(lead.length, `lead sentence for ${s.city} is ${lead.length} chars`).toBeLessThanOrEqual(DESC_CUT);
    }
  });
});
