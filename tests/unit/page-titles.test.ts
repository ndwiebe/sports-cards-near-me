import { describe, expect, it } from 'vitest';
import storesJson from '../../src/data/stores.json';
import type { ProvinceCode, Store } from '../../src/lib/types';
import { PROVINCES } from '../../src/lib/types';
import {
  cityDescription,
  cityTitle,
  MIN_REVIEWS_FOR_TOP,
  openSundayCount,
  provinceDescription,
  provinceTitle,
  rankedFirstPhrase,
  storeTitle,
  TITLE_BUDGET,
  topRatedSportsCardStore,
  type CityGroup,
} from '../../src/lib/seo';

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

  function realCityGroups(): { city: string; provinceName: string; stores: Store[] }[] {
    const byKey = new Map<string, { city: string; provinceName: string; stores: Store[] }>();
    for (const s of stores) {
      const key = `${s.province}/${s.citySlug}`;
      const g = byKey.get(key) ?? { city: s.city, provinceName: PROVINCES[s.province].name, stores: [] as Store[] };
      g.stores.push(s);
      byKey.set(key, g);
    }
    return [...byKey.values()];
  }

  it('gets what the page IS into the first sentence, inside the cut', () => {
    for (const g of realCityGroups()) {
      const desc = cityDescription(g.city, g.provinceName, g.stores, false);
      const marker = 'rebuilt daily.';
      const lead = desc.slice(0, desc.indexOf(marker) + marker.length);
      expect(lead.length, `lead sentence for ${g.city} is ${lead.length} chars`).toBeLessThanOrEqual(DESC_CUT);
    }
  });
});

/**
 * Round 2 (2026-09-23): city title/description built from the two real facts
 * round 1 didn't use — the crowned shop's star number and how many shops open
 * Sundays. Written off the 2026-09-23 Search Console read
 * (docs/research/2026-09-23-title-round1-ctr.md), which found Toronto, London,
 * Ottawa, Mississauga, Edmonton and Markham all still under 1.2% CTR on round 1's
 * generic "Rated & Mapped" suffix.
 */
describe('cityTitle', () => {
  const AB = 'AB' as ProvinceCode;
  const rated = (over: Partial<Store>): Store => ({
    slug: 's', name: 'Shop', city: 'City', citySlug: 'city', address: '1 St',
    province: AB, services: [], sports: [], lat: 0, lng: 0, ...over,
  });

  it('says "Nearest Open Shops" for a city with none open, never a count', () => {
    expect(cityTitle('Penticton', 'BC', [], true)).toBe('Card Shops in Penticton, BC — Nearest Open Shops');
  });

  it('never claims a ranking for a lone shop, which cannot be ranked', () => {
    const t = cityTitle('Leduc', 'AB', [rated({ rating: 4.9, reviewCount: 500 })], false);
    expect(t).toBe('1 Card Shop in Leduc, AB — Address, Map & Directions');
    expect(t).not.toMatch(/★|Sunday/);
  });

  it('adds the crowned shop\'s star number as "Highest-Ranked", never "Top/Best Rated"', () => {
    const top = topRatedSportsCardStore(stores)!;
    const second = rated({ name: 'Second Shop', slug: 'second-shop' });
    const t = cityTitle(top.city, 'ON', [top, second], false);
    expect(t).toContain(`${top.rating}★ Highest-Ranked`);
    expect(t).not.toMatch(/(?:top|best|highest)[\s-]rated/i);
  });

  it('adds the Sunday-open count only when at least one shop actually opens Sundays', () => {
    const sundayShop = rated({ rating: 4.5, reviewCount: 25, hours: 'Sunday: 12:00 – 5:00 PM' });
    const noSundayShop = rated({ name: 'Two', slug: 't', rating: 4.5, reviewCount: 25, hours: 'Sunday: Closed' });
    expect(cityTitle('City', 'AB', [sundayShop, noSundayShop], false)).toContain('1 Open Sunday');
    const bothClosed = rated({ name: 'Three', slug: 'th', rating: 4.5, reviewCount: 25, hours: 'Sunday: Closed' });
    expect(cityTitle('City', 'AB', [noSundayShop, bothClosed], false)).not.toContain('Sunday');
  });

  it('falls back to round 1\'s wording for a crownless city (nothing clears the review bar)', () => {
    const unranked = rated({ rating: 4.9, reviewCount: MIN_REVIEWS_FOR_TOP - 1 });
    const t = cityTitle('City', 'AB', [unranked, rated({ name: 'Two', slug: 't' })], false);
    expect(t).toBe('2 Card Shops in City, AB — Rated & Mapped, Updated Daily');
  });

  it('keeps the median title for the real dataset inside budget', () => {
    const byKey = new Map<string, Store[]>();
    for (const s of stores) {
      const key = `${s.province}/${s.citySlug}`;
      byKey.set(key, [...(byKey.get(key) ?? []), s]);
    }
    const lens = [...byKey.entries()]
      .map(([key, group]) => {
        const [, citySlug] = key.split('/');
        const city = group.find((s) => s.citySlug === citySlug)?.city ?? citySlug!;
        return cityTitle(city, group[0]!.province, group, false).length;
      })
      .sort((a, b) => a - b);
    const median = lens[Math.floor(lens.length / 2)]!;
    expect(median, `median city title is ${median} chars`).toBeLessThanOrEqual(TITLE_BUDGET);
  });
});

describe('cityDescription', () => {
  it('says the true thing for a city with nothing open', () => {
    const d = cityDescription('Bracebridge', 'Ontario', [], true);
    expect(d).toContain('No card shop is currently open in Bracebridge, Ontario');
  });

  it('leads with the shop count and place, "near you" not literal "near me"', () => {
    const top = topRatedSportsCardStore(stores)!;
    const d = cityDescription(top.city, PROVINCES[top.province].name, [top], false);
    expect(d).toMatch(/^Find all 1 card shop near you in/);
    expect(d).not.toContain('near me');
  });

  it('folds in the ranks-first phrase and the Sunday count as supporting facts, not the lead', () => {
    const top = topRatedSportsCardStore(stores)!;
    const sundayTop = { ...top, hours: 'Sunday: 12:00 – 4:00 PM' };
    const d = cityDescription(sundayTop.city, PROVINCES[sundayTop.province].name, [sundayTop], false);
    expect(d).toContain('ranks first on our review-weighted score');
    expect(d).toContain('opens Sundays');
  });
});

describe('provinceTitle / provinceDescription', () => {
  const group = (over: Partial<CityGroup> = {}): CityGroup => ({
    city: 'City', citySlug: 'city', stores: [], ...over,
  });

  it('falls back to round 1\'s wording when nothing crowns a shop province-wide', () => {
    const cities = [group({ stores: [{
      slug: 's', name: 'Shop', city: 'City', citySlug: 'city', address: '1 St',
      province: 'AB' as ProvinceCode, services: [], sports: [], lat: 0, lng: 0,
    }] })];
    expect(provinceTitle('Alberta', cities)).toBe('1 Card Shop in Alberta — Rated by City, Updated Daily');
  });

  it('names the crowned shop\'s star number as "Highest-Ranked" for a real province', () => {
    const abStores = stores.filter((s) => s.province === 'AB');
    const cities = [group({ stores: abStores })];
    const top = topRatedSportsCardStore(abStores);
    if (top?.rating !== undefined) {
      expect(provinceTitle('Alberta', cities)).toContain(`${top.rating}★ Highest-Ranked`);
    }
  });

  it('description leads with the shop count across cities, "near you"', () => {
    const cities = [group({ stores: stores.filter((s) => s.province === 'NS') })];
    const total = cities[0]!.stores.length;
    expect(provinceDescription('Nova Scotia', cities)).toMatch(
      new RegExp(`^Find ${total} card shops near you across 1 city in Nova Scotia`),
    );
  });
});

describe('openSundayCount', () => {
  it('counts only the shops with a real Sunday window', () => {
    const withSunday = { hours: 'Sunday: 12:00 – 5:00 PM' } as Store;
    const withoutSunday = { hours: 'Sunday: Closed' } as Store;
    expect(openSundayCount([withSunday, withoutSunday, withSunday])).toBe(2);
  });
});
