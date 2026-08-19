import { MIN_REVIEWS_FOR_TOP, byRecommendedRank, topRatedStore, type FaqItem } from './seo';
import type { ProvinceCode, Store } from './types';

/** A store counts as a buyer iff it lists the exact (lowercased, trimmed) service "buys". */
export function isBuyer(store: Store): boolean {
  return store.services.some((s) => s.trim().toLowerCase() === 'buys');
}

/**
 * True iff `/sell/${citySlug}/` is a real page — i.e. some store with this
 * exact citySlug passes isBuyer(). Deliberately citySlug-only, no province
 * argument: it mirrors `/sell/[city]/index.astro`'s getStaticPaths(), which
 * also keys by citySlug alone (the sell route has no province segment in its
 * URL). Anything that links to a sell page must ask this question first —
 * see storeFaqs() in seo.ts, which linked unconditionally before this existed.
 */
export function sellPageExistsForCity(stores: Store[], citySlug: string): boolean {
  return stores.some((s) => s.citySlug === citySlug && isBuyer(s));
}

/** Buyers in one city, ranked the same way every other list on the site is.
 *
 * This deliberately delegates to byRecommendedRank rather than keeping its own
 * comparator: it previously sorted on raw rating, so a 5.0 from three reviews
 * outranked a 4.8 from four hundred — exactly the distortion the weighted
 * ranking exists to prevent. A second comparator is a second thing to forget to
 * fix, so there is only one now. */
export function buyersInCity(stores: Store[], province: ProvinceCode, citySlug: string): Store[] {
  return stores
    .filter((s) => s.province === province && s.citySlug === citySlug && isBuyer(s))
    .sort(byRecommendedRank);
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * Reorders buyers so shops meeting MIN_REVIEWS_FOR_TOP are named ahead of sub-threshold ones,
 * preserving each group's existing rating-desc order. Used only for the NAMED top buyers in
 * copy — the full ranked buyer listing on the page keeps buyersInCity's original order.
 */
function rankForNaming(buyers: Store[]): Store[] {
  const eligible = buyers.filter((s) => (s.reviewCount ?? 0) >= MIN_REVIEWS_FOR_TOP);
  const ineligible = buyers.filter((s) => (s.reviewCount ?? 0) < MIN_REVIEWS_FOR_TOP);
  return [...eligible, ...ineligible];
}

/** Names up to 3 buyers, then "and N more" for the rest — same shape as the other city pages. */
function namesList(stores: Store[]): string {
  const names = stores.map((s) => s.name);
  if (names.length <= 3) return joinWithAnd(names);
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  return `${shown.join(', ')}, and ${rest} more`;
}

/**
 * Computed 40-60 word answer capsule for a sell-city page. Every fact is derived from
 * `buyers` — no fabricated prices, just the count, the top-rated buyer (if one meets
 * MIN_REVIEWS_FOR_TOP), and a pointer to the ranked list on the page.
 */
export function sellCityCapsule(city: string, provinceName: string, buyers: Store[]): string {
  const total = buyers.length;
  if (total === 0) {
    return `No shops in ${city}, ${provinceName} currently list buying collections as a service on Sports Cards Near Me. Check the general ${city} shop directory below — a shop that offers consignment or trade-ins may still take a look at what you have.`;
  }

  const shopWord = total === 1 ? 'shop' : 'shops';
  const listVerb = total === 1 ? 'lists' : 'list';
  const parts: string[] = [
    `${total} sports card ${shopWord} in ${city}, ${provinceName} ${listVerb} buying collections as a service in the Sports Cards Near Me directory.`,
  ];

  const top = topRatedStore(buyers);
  if (top !== undefined) {
    parts.push(`${top.name} ranks first on our weighted score, at ${top.rating} stars.`);
  }

  parts.push(
    total === 1
      ? 'This page lists that shop below, along with its address and services, so you can decide whether to sell to it there.'
      : 'This page ranks all of them below by rating, with addresses, so you can compare before you sell.',
  );
  return parts.join(' ');
}

/**
 * Three computed FAQ entries for a sell-city page. Same array backs both the visible
 * FAQ section and the FAQPage JSON-LD. Honest by construction: no price numbers appear
 * anywhere — value questions point to the selling guide instead of quoting a figure.
 */
export function sellCityFaqs(
  city: string,
  provinceName: string,
  buyers: Store[],
  cityPageUrl: string,
  guideUrl: string,
): FaqItem[] {
  const whereAnswer =
    buyers.length > 0
      ? `${namesList(rankForNaming(buyers))} ${buyers.length === 1 ? 'buys' : 'buy'} sports card collections in ${city}, ${provinceName}, according to Sports Cards Near Me. This page lists them ranked by rating.`
      : `No shops in ${city}, ${provinceName} currently list buying collections as a service on Sports Cards Near Me — check the full ${city} shop directory, since a shop may still buy in person even if it doesn't advertise it.`;

  return [
    {
      question: `Where can I sell sports cards in ${city}?`,
      answer: whereAnswer,
      link: { href: cityPageUrl, label: `${city} shop directory` },
    },
    {
      question: 'How much are my cards worth?',
      answer:
        "There's no single number for a whole collection — value depends on the player, the card's rarity, and its condition, and it can vary a lot even within one binder. Our guide walks through how to sort a collection and tell what's actually worth a closer look before you sell.",
      link: { href: guideUrl, label: 'guide to selling a collection' },
    },
    {
      question: 'Is it better to sell to a shop or online?',
      answer:
        'A local shop is the fastest option and pays on the spot, but the price reflects the fact that the shop still has to resell what it buys from you. Selling it yourself online usually nets more, at the cost of photographing, listing, and shipping every card yourself. Our guide compares the full range of options.',
      link: { href: guideUrl, label: 'guide to selling a collection' },
    },
  ];
}
