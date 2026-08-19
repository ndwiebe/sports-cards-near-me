import { describe, expect, it } from 'vitest';
import { relatedGuidesForStore, relatedGuidesForCity } from '../../src/lib/related-guides';
import { GUIDES } from '../../src/lib/guides';
import type { Store } from '../../src/lib/types';

const store = (over: Partial<Store> = {}): Store => ({
  slug: 'a-edmonton', name: 'A', city: 'Edmonton', citySlug: 'edmonton',
  address: '1 Main St, Edmonton, AB', province: 'AB', rating: 4.5, reviewCount: 50,
  hours: undefined, phone: undefined, website: undefined, social: undefined,
  services: [], sports: [], lat: 53.54, lng: -113.49, ...over,
} as Store);

const slugs = (gs: { slug: string }[]): string[] => gs.map((g) => g.slug);

describe('relatedGuidesForStore', () => {
  it('never returns more than three', () => {
    const s = store({ services: ['Buys', 'Grading Services'], sports: ['Pokemon', 'Hockey'] });
    expect(relatedGuidesForStore(s).length).toBeLessThanOrEqual(3);
  });

  it('sends a grading shop to the grading guides', () => {
    const out = slugs(relatedGuidesForStore(store({ services: ['Grading Services'] })));
    expect(out).toContain('card-grading-companies-canada');
  });

  it('sends a buying shop to the selling and tax guides', () => {
    const out = slugs(relatedGuidesForStore(store({ services: ['Buys'] })));
    expect(out).toContain('selling-your-collection');
  });

  it('sends a Pokemon shop to the TCG guide', () => {
    const out = slugs(relatedGuidesForStore(store({ sports: ['Pokemon'] })));
    expect(out).toContain('pokemon-tcg-shops-canada');
  });

  it('sends a hockey shop to the old-hockey-cards guide', () => {
    const out = slugs(relatedGuidesForStore(store({ sports: ['Hockey'] })));
    expect(out).toContain('are-old-hockey-cards-worth-anything');
  });

  it('matches tags case-insensitively, because the sheet vocabulary is inconsistent', () => {
    const out = slugs(relatedGuidesForStore(store({ services: ['Grading services'] })));
    expect(out).toContain('card-grading-companies-canada');
  });

  it('still returns guides for an untagged shop rather than an empty block', () => {
    expect(relatedGuidesForStore(store()).length).toBe(3);
  });

  it('only ever returns guides that actually exist', () => {
    const known = new Set(GUIDES.map((g) => g.slug));
    for (const g of relatedGuidesForStore(store({ services: ['Buys'], sports: ['Pokemon'] }))) {
      expect(known.has(g.slug)).toBe(true);
    }
  });

  it('never repeats a guide', () => {
    const out = slugs(relatedGuidesForStore(store({ services: ['Buys', 'Grading Services'] })));
    expect(new Set(out).size).toBe(out.length);
  });
});

describe('relatedGuidesForCity', () => {
  it('offers the Edmonton best-of guide on the Edmonton page', () => {
    const out = slugs(relatedGuidesForCity([store()], 'AB', 'edmonton'));
    expect(out).toContain('best-card-shops-edmonton');
  });

  it('offers the Alberta best-of guide to a different Alberta city', () => {
    const s = store({ city: 'Red Deer', citySlug: 'red-deer' });
    const out = slugs(relatedGuidesForCity([s], 'AB', 'red-deer'));
    expect(out).toContain('best-card-shops-alberta');
  });

  it('pools the tags of every shop in the city', () => {
    const a = store({ slug: 'a', services: ['Buys'] });
    const b = store({ slug: 'b', sports: ['Pokemon'] });
    const out = slugs(relatedGuidesForCity([a, b], 'ON', 'toronto'));
    expect(out).toContain('selling-your-collection');
  });

  it('never returns more than three', () => {
    const s = store({ services: ['Buys', 'Grading Services'], sports: ['Pokemon', 'Hockey'] });
    expect(relatedGuidesForCity([s], 'AB', 'edmonton').length).toBeLessThanOrEqual(3);
  });
});
