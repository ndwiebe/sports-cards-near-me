import storesJson from '../data/stores.json';
import type { Store } from './types';
import { PROVINCES } from './types';

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
export function collectTags(stores: Store[]): string[] {
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

/** The named sports a shop can carry, plus the catch-all.
 *
 * `Sports` was added to the sheet's vocabulary 2026-08-05 for a specific reason:
 * a shop's own website can prove it sells sports cards without ever naming a
 * sport, and until this existed there was nowhere to record that. 15 shops were
 * in exactly that position — known sports-card sellers filed as TCG-only,
 * because "we know they sell sports cards but not which" had no representation.
 *
 * Do NOT infer a specific sport from a brand name to avoid using this. Two spot
 * checks found "Topps" on a page selling *Pokémon* Topps sets, and Upper Deck
 * also prints Marvel — the brand evidences sports cards, not which sport. The
 * catch-all is the honest answer in those cases.
 */
export const SPORT_CATEGORIES = [
  'hockey',
  'baseball',
  'basketball',
  'football',
  'soccer',
  'golf',
  'sports',
] as const;

/** Whether a shop evidences sports-card retail at all — a named sport or the
 * `Sports` catch-all. This is the sports/TCG question, deliberately separate
 * from *which* sport, and it is what any ranking tier should read. */
export function carriesSportsCards(store: Store): boolean {
  return store.sports.some((t) =>
    (SPORT_CATEGORIES as readonly string[]).includes(t.trim().toLowerCase()),
  );
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

/**
 * How much raw review VOLUME counts, on top of the Bayesian evidence discount.
 *
 * Nathan's call, 2026-07-30: "often the more reviews the better it actually is
 * regardless of rating number — weight number of reviews more heavily." Bayesian
 * shrinkage alone only stops a thin score being *overstated*; it never treats a
 * big review count as positive evidence in its own right. This does.
 *
 * log10 so the effect is strong at the bottom and flattens at the top: 20 -> 300
 * reviews matters far more than 300 -> 600. At 0.35, a 4.7 with 365 reviews beats
 * a 5.0 with 22 — the Edmonton case that prompted the change — while two shops
 * with similar volume are still separated by rating.
 *
 * Chosen over a milder 0.15 after modelling both on live data: 0.15 changed the
 * crowned shop in 9 of 86 contested cities, 0.35 in 24, and Nathan picked the
 * stronger reading of his own instruction.
 */
export const VOLUME_WEIGHT = 0.35;

/** The score that orders shops: Bayesian rating plus a volume term.
 * Only ever applied to shops clearing MIN_REVIEWS_FOR_TOP — below that a shop is
 * listed but deliberately not ranked. */
export function rankScore(
  rating: number,
  reviewCount: number,
  corpusMean: number,
  priorWeight: number = MIN_REVIEWS_FOR_TOP,
): number {
  const v = Math.max(0, reviewCount);
  return weightedRating(rating, v, corpusMean, priorWeight) + VOLUME_WEIGHT * Math.log10(Math.max(v, 1));
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

/** Every store eligible to be crowned "top-rated" (a rating plus at least
 * MIN_REVIEWS_FOR_TOP reviews behind it), ordered by the same Bayesian-weighted
 * score `topRatedStore` uses, best first. Shared by `topRatedStore` (takes the
 * first) and `topRatedStores` (takes several) so both read the identical
 * ranking rather than two implementations that could drift apart. */
function rankedEligibleStores(stores: Store[], corpusMean?: number): Store[] {
  const eligible = stores.filter(
    (s) => s.rating !== undefined && (s.reviewCount ?? 0) >= MIN_REVIEWS_FOR_TOP,
  );
  if (eligible.length === 0) return [];
  const mean = corpusMean ?? DIRECTORY_MEAN_RATING;
  const score = (s: Store): number => rankScore(s.rating ?? 0, s.reviewCount ?? 0, mean);
  return [...eligible].sort(
    (a, b) =>
      score(b) - score(a) ||
      (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
      a.name.localeCompare(b.name),
  );
}

/** The store most deserving of being crowned "top-rated": highest Bayesian-weighted
 * score among shops carrying a rating and at least MIN_REVIEWS_FOR_TOP reviews.
 * Shrinks toward DIRECTORY_MEAN_RATING by default so every city is judged against the
 * same national baseline; pass `corpusMean` only to score against a different corpus.
 * Returns undefined when no store qualifies. */
export function topRatedStore(stores: Store[], corpusMean?: number): Store | undefined {
  return rankedEligibleStores(stores, corpusMean)[0];
}

/** Up to `n` stores worth crowning "top-rated", same eligibility and ordering as
 * `topRatedStore` (a rating plus MIN_REVIEWS_FOR_TOP+ reviews, Bayesian-weighted
 * score). Used where a page surfaces a short list rather than a single pick —
 * e.g. a province page naming its handful of best-reviewed shops rather than
 * just one. Returns an empty array, never undefined entries, when nothing
 * qualifies — same "no claim at all" rule as topRatedStore's undefined. */
export function topRatedStores(stores: Store[], n: number, corpusMean?: number): Store[] {
  return rankedEligibleStores(stores, corpusMean).slice(0, n);
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
    s.rating === undefined ? 0 : rankScore(s.rating, s.reviewCount ?? 0, mean);
  return (a, b) => {
    const tierDiff = tier(a) - tier(b);
    if (tierDiff !== 0) return tierDiff;
    // Only shops clearing MIN_REVIEWS_FOR_TOP are RANKED. Below that a shop is
    // still listed — removing it would delete a real business from its town page
    // — but it is ordered by volume then name, never by rating, so a 5.0 from
    // three reviews cannot present as better than a 3.9 from nineteen.
    if (tier(a) !== 0) {
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || a.name.localeCompare(b.name);
    }
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
  // A city whose only shop has closed still has a page, because the URL is indexed and
  // "card shops in X" is still a real question. Answering it with "X has 0 sports card
  // shops listed" is technically true and useless; say what happened and hand them on.
  if (stores.length === 0) {
    return (
      `${city}, ${provinceName} has no card shop currently open — the one we listed has ` +
      `permanently closed. The nearest open shops are listed below.`
    );
  }
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

/** Computed answer capsule for a province page: shop total, city count, the biggest
 * city, and — when one exists — the province's top-rated shop. That last clause
 * only appears once a shop actually clears MIN_REVIEWS_FOR_TOP; provinces where
 * nothing does simply don't get the sentence, never a weaker or hedged claim. */
export function provinceAnswerCapsule(provinceName: string, cities: CityGroup[]): string {
  const stores = cities.flatMap((c) => c.stores);
  const total = stores.length;
  const shopWord = total === 1 ? 'shop' : 'shops';
  const cityWord = cities.length === 1 ? 'city' : 'cities';
  const base = `${provinceName} has ${total} sports card ${shopWord} listed across ${cities.length} ${cityWord} on Sports Cards Near Me.`;

  const max = cities.reduce((m, c) => Math.max(m, c.stores.length), 0);
  const leaders = cities.filter((c) => c.stores.length === max);
  const shopWordMax = max === 1 ? 'shop' : 'shops';
  const leaderClause =
    max === 0 || cities.length === 1
      ? undefined
      : leaders.length === 1
        ? `${leaders[0]!.city} has the most with ${max} ${shopWordMax}.`
        : `${leaders.length} cities tie for the most, each with ${max} ${shopWordMax}.`;

  // "Ranks first", never "is the top-rated". topRatedStore returns the highest
  // WEIGHTED score (Bayesian + review volume), which is deliberately not the
  // highest star rating — Alberta's first-ranked shop is a 4.7 while 5.0s clear
  // the same bar. Calling that "top-rated" is a false claim about a named
  // business, and it was going into FAQ structured data, i.e. to Google.
  const top = topRatedStore(stores);
  const topClause =
    top !== undefined
      ? `${top.name} in ${top.city} ranks first on our weighted score, which counts review volume alongside the star average — ${top.rating} stars from ${top.reviewCount} reviews.`
      : undefined;

  return [base, leaderClause, topClause].filter((s): s is string => s !== undefined).join(' ');
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
      ? `${city} has ${total} sports card ${shopWord} listed on Sports Cards Near Me, with ${top.name} ranking first at ${top.rating} stars from ${top.reviewCount} reviews.`
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

/**
 * Four computed FAQ entries for a province page — same shape as `cityFaqs`, one
 * level up. Every answer is derived from `cities`; a province with no shop
 * clearing MIN_REVIEWS_FOR_TOP gets an honest "our data gap" answer for the
 * "rated highest" question rather than naming a shop that hasn't earned it.
 */
export function provinceFaqs(provinceName: string, cities: CityGroup[]): FaqItem[] {
  const stores = cities.flatMap((c) => c.stores);
  const total = stores.length;
  const shopWord = total === 1 ? 'shop' : 'shops';
  const cityWord = cities.length === 1 ? 'city' : 'cities';
  const countAnswer = `${provinceName} has ${total} sports card ${shopWord} listed on Sports Cards Near Me, across ${cities.length} ${cityWord}.`;

  const top = topRatedStore(stores);
  const ratedFaq: FaqItem =
    top !== undefined
      ? {
          question: `Which ${provinceName} card shop ranks first?`,
          answer: `${top.name} in ${top.city} ranks first among ${provinceName} shops clearing our ${MIN_REVIEWS_FOR_TOP}-review bar, at ${top.rating} stars from ${top.reviewCount} Google reviews. We rank on a weighted score that counts how many people reviewed a shop, not the star average alone, so this is not always the highest star rating in the province.`,
          link: { href: `/store/${top.slug}/`, label: `See ${top.name}'s listing` },
        }
      : {
          question: `Which ${provinceName} card shop ranks first?`,
          answer: `No shop in ${provinceName} has yet crossed our ${MIN_REVIEWS_FOR_TOP}-review bar for a "top-rated" crown — that's our data gap, not a judgment on any shop here. Browse every listing by city below instead.`,
        };

  const buyers = hasTag(stores, (t) => t === 'buys');
  const buysFaq: FaqItem =
    buyers.length > 0
      ? {
          question: `Do any ${provinceName} card shops buy collections?`,
          answer: `Yes — ${namesList(buyers)} ${buyers.length === 1 ? 'lists' : 'list'} buying collections as a service in ${provinceName}.`,
          link: { href: '/sell/', label: 'Browse shops that buy collections' },
        }
      : {
          question: `Do any ${provinceName} card shops buy collections?`,
          answer: `None of the ${provinceName} shops listed here currently advertise buying collections. Check our national sell hub for shops that do buy in other provinces.`,
          link: { href: '/sell/', label: 'Browse shops that buy collections' },
        };

  const pokemonShops = hasTag(stores, (t) => t === 'pokemon');
  const pokemonFaq: FaqItem =
    pokemonShops.length > 0
      ? {
          question: `Do ${provinceName} shops sell Pokémon cards?`,
          answer: `Yes — ${namesList(pokemonShops)} ${pokemonShops.length === 1 ? 'carries' : 'carry'} Pokémon cards in ${provinceName}.`,
          link: { href: '/pokemon/', label: 'Browse Pokémon shops' },
        }
      : {
          question: `Do ${provinceName} shops sell Pokémon cards?`,
          answer: `None of the ${provinceName} shops listed here currently tag Pokémon in their catalog. Check our national Pokémon hub for other provinces that do.`,
          link: { href: '/pokemon/', label: 'Browse Pokémon shops' },
        };

  return [{ question: `How many sports card shops are in ${provinceName}?`, answer: countAnswer }, ratedFaq, buysFaq, pokemonFaq];
}

/**
 * Answer capsule for a single shop page.
 *
 * Store pages were the only major page type without one, while Search Console
 * showed them earning the site's top impressions — on shop-NAME queries
 * ("the hobby spot leduc", "m&l sports cards reviews"), not city queries.
 * Most listed shops have a thin website or none, so this page is often the
 * best structured answer to "who are they" that exists anywhere.
 *
 * Every clause is derived. Nothing is asserted that the data doesn't hold.
 */
export function storeAnswerCapsule(store: Store, provinceName: string): string {
  // A closed shop gets past tense and nothing else. Every sentence below is a
  // present-tense claim — "is a sports card shop", "It holds a 4.7 star rating",
  // "Listings show hockey" — and asserting any of them about a shop that has shut
  // is the same class of error as the weighted-rank-called-a-rating bug that reached
  // 351 pages. The rating in particular is a live-business signal; it stays off.
  if (store.status === 'closed') {
    const where = store.address !== undefined ? ` It was located at ${store.address}.` : '';
    return (
      `${store.name} was a sports card shop in ${store.city}, ${provinceName}. ` +
      `It has permanently closed and no longer appears in our listings.${where}`
    );
  }
  if (store.status === 'online-only') {
    return (
      `${store.name} was a walk-in sports card shop in ${store.city}, ${provinceName}. ` +
      `It has closed its storefront and now sells online only; it no longer appears in our walk-in listings.`
    );
  }
  const parts: string[] = [
    `${store.name} is a sports card shop in ${store.city}, ${provinceName}, listed on Sports Cards Near Me.`,
  ];
  if (store.address !== undefined) parts.push(`It's located at ${store.address}.`);
  if (store.rating !== undefined) {
    parts.push(
      store.reviewCount !== undefined
        ? `It holds a ${store.rating} star Google rating from ${store.reviewCount} reviews.`
        : `It holds a ${store.rating} star Google rating.`,
    );
  }
  const sports = store.sports.slice(0, 4);
  if (sports.length > 0) parts.push(`Listings show ${joinWithAnd(sports)}.`);
  const buys = store.services.some((s) => /^buys$/i.test(s));
  if (buys) parts.push('It buys collections as well as selling.');
  return parts.join(' ');
}

/**
 * FAQ entries for a shop page, and the FAQPage JSON-LD behind it.
 *
 * The questions mirror what people actually search: the shop's name plus
 * "reviews", plus the two things a collector rings ahead to ask — do you buy,
 * and when are you open. A question is omitted entirely rather than answered
 * with a shrug, except for "do you buy", where silence in our data must not
 * read as "no" — a shop that buys but never told us is the common case.
 *
 * `sellPageExists` gates the "shops that buy in {city}" link on the "do you
 * buy" answer: `/sell/${citySlug}/` is only a real page for cities with at
 * least one confirmed buyer (see sellPageExistsForCity in sell.ts). Linking
 * to it unconditionally shipped 194 dead links across cities with none —
 * this parameter is how that stays fixed.
 */
export function storeFaqs(store: Store, provinceName: string, sellPageExists: boolean): FaqItem[] {
  const faqs: FaqItem[] = [];

  if (store.rating !== undefined && store.reviewCount !== undefined) {
    faqs.push({
      question: `Is ${store.name} any good — what do reviews say?`,
      answer: `${store.name} holds a ${store.rating} star Google rating from ${store.reviewCount} reviews${
        store.reviewCount >= MIN_REVIEWS_FOR_TOP
          ? ', enough to clear our 20-review bar for being ranked among a city\'s best'
          : ', which is below our 20-review bar, so we don\'t rank it among a city\'s best yet'
      }. We publish the rating as Google reports it and never accept payment to change it.`,
    });
  }

  const buys = store.services.some((s) => /^buys$/i.test(s));
  faqs.push({
    question: `Does ${store.name} buy sports card collections?`,
    answer: buys
      ? `Yes — ${store.name} does buy collections as well as selling. Call ahead with what you have; most shops price on condition and what they're short of that week.`
      : `We don't have buying listed for ${store.name}. That often means we haven't confirmed it rather than that they won't — it's worth asking.${sellPageExists ? ` Shops we've confirmed as buyers are on our sell page for ${store.city}.` : ''}`,
    ...(sellPageExists && { link: { href: `/sell/${store.citySlug}/`, label: `Shops that buy in ${store.city}` } }),
  });

  if (store.hours !== undefined) {
    faqs.push({
      question: `What are ${store.name}'s hours?`,
      answer: `${store.hours}. Hours change, especially around card shows and holidays — phone ahead if you're travelling for a specific card.`,
    });
  }

  faqs.push({
    question: `Where is ${store.name}?`,
    answer: `${store.address}, in ${store.city}, ${provinceName}. The map on this page will give you directions from where you are.`,
    link: { href: `/${PROVINCES[store.province].slug}/${store.citySlug}/`, label: `All card shops in ${store.city}` },
  });

  return faqs;
}

/* ------------------------------------------------------------------------- *
 * Title and meta-description builders
 *
 * These were inline template literals on their pages until 2026-08-25. They
 * moved here for two reasons: a literal inside an .astro file cannot be unit
 * tested, and one of them had been shipping a false claim to 351 built pages
 * (see rankedFirstPhrase below).
 * ------------------------------------------------------------------------- */

/** Google truncates a result title around here. Not a hard limit — a budget. */
export const TITLE_BUDGET = 60;

/**
 * Store page title.
 *
 * Ordered name → rating → review count → city deliberately. "<shop> reviews" is
 * the highest-volume shop query the directory can actually win (the shop's own
 * site wins its bare name, and rightly), and in the 2026-08-25 Search Console
 * read 76 such queries drew 807 impressions and one click while sitting at
 * positions 6–11. The rating was already here; the words a searcher typed
 * — the shop's name and "reviews" — were not, and the review count that makes
 * a rating mean anything was only in the description.
 *
 * A long shop name can still blow the budget. That is accepted: the name is the
 * business's own and is never abbreviated. Because city sits last, truncation
 * eats the least important part first.
 */
export function storeTitle(store: Store): string {
  if (store.rating === undefined || store.reviewCount === undefined) {
    // Absence-of-data rule: say nothing at all about reviews we do not hold.
    return `${store.name} — Card Shop in ${store.city}, ${store.province}`;
  }
  return `${store.name} — ${store.rating}★, ${store.reviewCount} Reviews · ${store.city}`;
}

/**
 * How to describe the output of topRatedStore() in prose.
 *
 * topRatedStore() returns the highest WEIGHTED score — Bayesian mean plus
 * VOLUME_WEIGHT × log10(reviews), Nathan's 2026-07-30 policy — which is
 * deliberately NOT the highest star rating. Describing it as "top rated" is a
 * false claim about a named business, and it was live in the meta description of
 * 351 built pages (city, province and Pokémon city) until 2026-08-25, having
 * slipped past tests/unit/superlative-claims.test.ts on two regex holes.
 *
 * "Ranks first" is a claim about our ordering, which is ours to make. The method
 * is stated so the number is not left to imply a bare rating claim.
 */
export function rankedFirstPhrase(store: Store, includeCity = false): string {
  const who = includeCity ? `${store.name} in ${store.city}` : store.name;
  if (store.rating === undefined || store.reviewCount === undefined) {
    return `${who} ranks first on our review-weighted score`;
  }
  return `${who} ranks first on our review-weighted score (${store.rating}★ from ${store.reviewCount} reviews)`;
}
