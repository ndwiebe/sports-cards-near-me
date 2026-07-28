import storesJson from '../data/stores.json';
import type { Store } from './types';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface ListItemLink {
  name: string;
  url: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  link?: { href: string; label: string };
}

export interface CityGroup {
  city: string;
  citySlug: string;
  stores: Store[];
}

/** Resolves a site-relative path to an absolute URL using Astro.site as the base. */
export function absoluteUrl(site: URL | undefined, path: string): string {
  return new URL(path, site).href;
}

/** Serializes a JSON-LD payload using the repo's sanctioned set:html escape. */
export function ldJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function breadcrumbListLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function itemListLd(items: ListItemLink[], cap?: number): Record<string, unknown> {
  const capped = cap !== undefined ? items.slice(0, cap) : items;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: capped.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function faqPageLd(items: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/** Unique services+sports tags present among the stores, case-insensitively deduped, A-Z. */
function collectTags(stores: Store[]): string[] {
  const seen = new Map<string, string>();
  for (const s of stores) {
    for (const t of [...s.services, ...s.sports]) {
      const key = t.trim().toLowerCase();
      if (key.length > 0 && !seen.has(key)) seen.set(key, t.trim());
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

function hasTag(stores: Store[], predicate: (tag: string) => boolean): Store[] {
  return stores.filter((s) => [...s.services, ...s.sports].some((t) => predicate(t.trim().toLowerCase())));
}

/** A shop needs at least this many Google reviews to be crowned "best"/"top-rated"/
 * "highest-rated" or named as a top pick. Shops below this still get listed, just not crowned —
 * it keeps a single 5-star review from one relative from outranking a shop with hundreds. */
export const MIN_REVIEWS_FOR_TOP = 20;

/**
 * Bayesian ("shrunk") rating — the score that decides who gets crowned.
 *
 * A raw average treats 5.0-from-22-reviews as better than 4.9-from-267, which is
 * the wrong answer: the second shop has vastly more evidence behind a nearly
 * identical score. This blends each shop's own rating toward the directory-wide
 * mean, weighted by how much evidence it actually has:
 *
 *   score = (v / (v + m)) * R  +  (m / (v + m)) * C
 *
 * where R is the shop's rating, v its review count, C the mean rating across every
 * rated shop, and m (MIN_REVIEWS_FOR_TOP) the prior weight — effectively "every shop
 * starts out treated as if it already had m reviews at the directory average."
 * A shop with few reviews sits close to C; evidence pulls it toward its true rating.
 * Same method IMDb uses for its Top 250.
 */
export function weightedRating(
  rating: number,
  reviewCount: number,
  corpusMean: number,
  priorWeight: number = MIN_REVIEWS_FOR_TOP,
): number {
  const v = Math.max(0, reviewCount);
  if (v + priorWeight === 0) return corpusMean;
  return (v / (v + priorWeight)) * rating + (priorWeight / (v + priorWeight)) * corpusMean;
}

/** Mean rating across every rated store — the prior that `weightedRating` shrinks toward.
 * Falls back to 0 when nothing is rated, which makes weightedRating a no-op rather than NaN. */
export function corpusMeanRating(stores: Store[]): number {
  const rated = stores.filter((s) => s.rating !== undefined);
  if (rated.length === 0) return 0;
  return rated.reduce((sum, s) => sum + (s.rating ?? 0), 0) / rated.length;
}

/**
 * Directory-wide mean rating — the DEFAULT prior for every weighted ranking.
 *
 * This deliberately comes from the whole directory rather than whatever slice is
 * being sorted. Shrinking a two-shop city list toward its own two-shop average is
 * meaningless: if both shops are ~4.95, the prior is ~4.95 and thin evidence stops
 * being penalised at all. Judging every shop against the same national baseline is
 * what makes "4.9 from 267 reviews beats 5.0 from 22" hold everywhere.
 */
export const DIRECTORY_MEAN_RATING = corpusMeanRating(storesJson as Store[]);

/** The store most deserving of being crowned "top-rated": highest Bayesian-weighted
 * score among shops carrying a rating and at least MIN_REVIEWS_FOR_TOP reviews.
 * Shrinks toward DIRECTORY_MEAN_RATING by default so every city is judged against the
 * same national baseline; pass `corpusMean` only to score against a different corpus.
 * Returns undefined when no store qualifies. */
export function topRatedStore(stores: Store[], corpusMean?: number): Store | undefined {
  const eligible = stores.filter(
    (s) => s.rating !== undefined && (s.reviewCount ?? 0) >= MIN_REVIEWS_FOR_TOP,
  );
  if (eligible.length === 0) return undefined;
  const mean = corpusMean ?? DIRECTORY_MEAN_RATING;
  const score = (s: Store): number => weightedRating(s.rating ?? 0, s.reviewCount ?? 0, mean);
  const sorted = [...eligible].sort(
    (a, b) =>
      score(b) - score(a) ||
      (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
      a.name.localeCompare(b.name),
  );
  return sorted[0]!;
}

/** Sort comparator for rating-ordered shop lists that must still show everyone.
 * Shops eligible to be crowned (rated with >= MIN_REVIEWS_FOR_TOP reviews) rank
 * first, ordered by Bayesian-weighted score so review volume counts as evidence
 * rather than only raw rating; rated-but-sub-threshold shops next; unrated last.
 * Nobody is hidden — a thin 5.0 just can't lead the list over a well-reviewed 4.9.
 *
 * Shrinks toward DIRECTORY_MEAN_RATING, so this is safe to use on any filtered slice. */
export function byRecommendedRank(a: Store, b: Store): number {
  return byWeightedRankIn([a, b])(a, b);
}

/** Comparator factory: same ranking as `byRecommendedRank`, with an explicit corpus.
 * Only reach for this when a list should be judged against something other than the
 * directory-wide mean (the default) — e.g. scoring within a single province. */
export function byWeightedRankIn(
  corpus: Store[],
  corpusMean?: number,
): (a: Store, b: Store) => number {
  const mean = corpusMean ?? (corpus.length > 0 ? DIRECTORY_MEAN_RATING : 0);
  const tier = (s: Store): number =>
    s.rating === undefined ? 2 : (s.reviewCount ?? 0) >= MIN_REVIEWS_FOR_TOP ? 0 : 1;
  const score = (s: Store): number =>
    s.rating === undefined ? 0 : weightedRating(s.rating, s.reviewCount ?? 0, mean);
  return (a, b) => {
    const tierDiff = tier(a) - tier(b);
    if (tierDiff !== 0) return tierDiff;
    return (
      score(b) - score(a) ||
      (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
      a.name.localeCompare(b.name)
    );
  };
}

function namesList(stores: Store[]): string {
  const names = stores.map((s) => s.name);
  if (names.length <= 3) return joinWithAnd(names);
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  return `${shown.join(', ')}, and ${rest} more`;
}

/** Computed 40-60 word answer capsule for a city page. Every fact is derived from `stores`. */
export function cityAnswerCapsule(city: string, provinceName: string, stores: Store[]): string {
  const total = stores.length;
  const shopWord = total === 1 ? 'shop' : 'shops';
  const parts: string[] = [
    `${city}, ${provinceName} has ${total} sports card ${shopWord} listed on Sports Cards Near Me.`,
  ];

  const tags = collectTags(stores).slice(0, 3);
  if (tags.length > 0) {
    parts.push(`Local listings include ${joinWithAnd(tags)}.`);
  }

  const rated = stores.filter((s) => s.rating !== undefined);
  if (rated.length > 0) {
    const avg = Math.round((rated.reduce((sum, s) => sum + (s.rating ?? 0), 0) / rated.length) * 10) / 10;
    parts.push(
      total === 1
        ? `Its Google rating is ${avg} out of 5.`
        : rated.length === total
          ? `All ${total} carry a public Google rating, averaging ${avg} out of 5.`
          : `${rated.length} of them carry a public Google rating, averaging ${avg} out of 5.`,
    );
  }

  parts.push('Use the interactive map on this page to compare locations and get directions to the shop nearest you.');
  return parts.join(' ');
}

/** Computed answer capsule for a province page: shop total, city count, and the biggest city. */
export function provinceAnswerCapsule(provinceName: string, cities: CityGroup[]): string {
  const total = cities.reduce((n, c) => n + c.stores.length, 0);
  const shopWord = total === 1 ? 'shop' : 'shops';
  const cityWord = cities.length === 1 ? 'city' : 'cities';
  const base = `${provinceName} has ${total} sports card ${shopWord} listed across ${cities.length} ${cityWord} on Sports Cards Near Me.`;

  const max = cities.reduce((m, c) => Math.max(m, c.stores.length), 0);
  if (max === 0 || cities.length === 1) return base;
  const leaders = cities.filter((c) => c.stores.length === max);
  const shopWordMax = max === 1 ? 'shop' : 'shops';
  const leaderClause =
    leaders.length === 1
      ? `${leaders[0]!.city} has the most with ${max} ${shopWordMax}.`
      : `${leaders.length} cities tie for the most, each with ${max} ${shopWordMax}.`;
  return `${base} ${leaderClause}`;
}

/**
 * Three computed FAQ entries for a city page. Same array backs both the visible
 * FAQ section and the FAQPage JSON-LD — no independent copy to drift out of sync.
 */
export function cityFaqs(
  city: string,
  provinceName: string,
  provinceUrl: string,
  stores: Store[],
  citySlug: string,
): FaqItem[] {
  const total = stores.length;
  const shopWord = total === 1 ? 'shop' : 'shops';
  const top = topRatedStore(stores);
  const countAnswer =
    top !== undefined
      ? `${city} has ${total} sports card ${shopWord} listed on Sports Cards Near Me, with ${top.name} currently the highest-rated at ${top.rating} stars.`
      : `${city} has ${total} sports card ${shopWord} listed on Sports Cards Near Me.`;

  const buyers = hasTag(stores, (t) => t === 'buys');
  const sellUrl = `/sell/${citySlug}/`;
  const buysFaq: FaqItem =
    buyers.length > 0
      ? {
          question: `Do any ${city} card shops buy collections?`,
          answer: `Yes — ${namesList(buyers)} ${buyers.length === 1 ? 'lists' : 'list'} buying collections as a service in ${city}.`,
          link: { href: sellUrl, label: `See shops that buy in ${city}` },
        }
      : {
          question: `Do any ${city} card shops buy collections?`,
          answer: `None of the ${city} shops listed here currently advertise buying collections. Check the ${provinceName} page for other cities that do.`,
          link: { href: provinceUrl, label: `${provinceName} page` },
        };

  const pokemonShops = hasTag(stores, (t) => t === 'pokemon');
  const pokemonUrl = `/pokemon/${citySlug}/`;
  const pokemonFaq: FaqItem =
    pokemonShops.length > 0
      ? {
          question: `Do ${city} shops sell Pokémon cards?`,
          answer: `Yes — ${namesList(pokemonShops)} ${pokemonShops.length === 1 ? 'carries' : 'carry'} Pokémon cards in ${city}.`,
          link: { href: pokemonUrl, label: `See Pokémon shops in ${city}` },
        }
      : {
          question: `Do ${city} shops sell Pokémon cards?`,
          answer: `None of the ${city} shops listed here currently tag Pokémon in their catalog. Check the ${provinceName} page for other cities that do.`,
          link: { href: provinceUrl, label: `${provinceName} page` },
        };

  return [{ question: `How many sports card shops are in ${city}?`, answer: countAnswer }, buysFaq, pokemonFaq];
}
