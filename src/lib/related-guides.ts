import { GUIDES, type GuideMeta } from './guides';
import type { ProvinceCode, Store } from './types';

/**
 * Tag-driven guide selection for store and city pages.
 *
 * Why this exists: the 14 guides earn roughly double the reach per page of any
 * other page type on the site and still sit at median position 16.5 — page two.
 * The reason is inbound links: guides link generously outward to /sell/ and
 * /pokemon/ and to each other, and almost nothing links back. The 689 store
 * pages offered exactly one guide link, conditional on the shop tagging grading;
 * the 247 city pages offered none. This closes that loop from the two biggest
 * page groups on the site.
 *
 * Capped at three. More links on a template dilutes each one and turns the
 * block into navigation furniture readers skip.
 */
const MAX_RELATED = 3;

const bySlug = new Map(GUIDES.map((g) => [g.slug, g]));

/** Ordered so the earliest match wins a slot; the fallbacks fill what's left. */
const TAG_RULES: { match: (tag: string) => boolean; guides: string[] }[] = [
  { match: (t) => t.includes('grading'), guides: ['card-grading-companies-canada', 'card-grading-101'] },
  { match: (t) => t === 'buys', guides: ['selling-your-collection', 'tax-on-selling-sports-cards-canada'] },
  {
    match: (t) => ['pokemon', 'magic', 'one piece', 'lorcana', 'yu-gi-oh'].includes(t),
    guides: ['pokemon-tcg-shops-canada'],
  },
  { match: (t) => t === 'hockey', guides: ['are-old-hockey-cards-worth-anything'] },
  { match: (t) => t === 'breaks' || t === 'breaking' || t === 'trade nights', guides: ['your-first-card-show'] },
];

/** Shown to a shop or city whose tags matched nothing, so the block is never empty. */
const FALLBACKS = [
  'how-much-are-my-sports-cards-worth',
  'card-grading-101',
  'how-to-spot-fake-sports-cards',
];

const CITY_BEST_OF: Record<string, string> = {
  edmonton: 'best-card-shops-edmonton',
  calgary: 'best-card-shops-calgary',
};

const PROVINCE_BEST_OF: Partial<Record<ProvinceCode, string>> = {
  AB: 'best-card-shops-alberta',
};

function resolve(slugs: string[]): GuideMeta[] {
  const out: GuideMeta[] = [];
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    const guide = bySlug.get(slug);
    if (guide === undefined) continue; // a guide was renamed or removed
    seen.add(slug);
    out.push(guide);
    if (out.length === MAX_RELATED) break;
  }
  return out;
}

/** Every services + sports tag on the shops, lowercased and trimmed. */
function tagsOf(stores: Store[]): string[] {
  return stores.flatMap((s) => [...s.services, ...s.sports]).map((t) => t.trim().toLowerCase());
}

function matched(tags: string[]): string[] {
  const hits: string[] = [];
  for (const rule of TAG_RULES) {
    if (tags.some((t) => rule.match(t))) hits.push(...rule.guides);
  }
  return hits;
}

export function relatedGuidesForStore(store: Store): GuideMeta[] {
  return resolve([...matched(tagsOf([store])), ...FALLBACKS]);
}

export function relatedGuidesForCity(
  stores: Store[],
  province: ProvinceCode,
  citySlug: string,
): GuideMeta[] {
  const bestOf = CITY_BEST_OF[citySlug] ?? PROVINCE_BEST_OF[province];
  const lead = bestOf !== undefined ? [bestOf] : [];
  return resolve([...lead, ...matched(tagsOf(stores)), ...FALLBACKS]);
}
