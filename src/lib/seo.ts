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

function topRatedStore(stores: Store[]): Store | undefined {
  const rated = stores.filter((s) => s.rating !== undefined);
  if (rated.length === 0) return undefined;
  const sorted = [...rated].sort((a, b) => {
    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;
    const reviewDiff = (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    if (reviewDiff !== 0) return reviewDiff;
    return a.name.localeCompare(b.name);
  });
  return sorted[0]!;
}

function namesList(stores: Store[]): string {
  const names = stores.map((s) => s.name);
  if (names.length <= 3) return joinWithAnd(names);
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  return `${joinWithAnd(shown)}, and ${rest} more`;
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
      rated.length === total
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
  if (max === 0) return base;
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
export function cityFaqs(city: string, provinceName: string, provinceUrl: string, stores: Store[]): FaqItem[] {
  const total = stores.length;
  const shopWord = total === 1 ? 'shop' : 'shops';
  const top = topRatedStore(stores);
  const countAnswer =
    top !== undefined
      ? `${city} has ${total} sports card ${shopWord} listed on Sports Cards Near Me, with ${top.name} currently the highest-rated at ${top.rating} stars.`
      : `${city} has ${total} sports card ${shopWord} listed on Sports Cards Near Me.`;

  const buyers = hasTag(stores, (t) => t === 'buys');
  const buysFaq: FaqItem =
    buyers.length > 0
      ? {
          question: `Do any ${city} card shops buy collections?`,
          answer: `Yes — ${namesList(buyers)} ${buyers.length === 1 ? 'lists' : 'list'} buying collections as a service in ${city}.`,
        }
      : {
          question: `Do any ${city} card shops buy collections?`,
          answer: `None of the ${city} shops listed here currently advertise buying collections. Check the ${provinceName} page for other cities that do.`,
          link: { href: provinceUrl, label: `${provinceName} page` },
        };

  const pokemonShops = hasTag(stores, (t) => t === 'pokemon');
  const pokemonFaq: FaqItem =
    pokemonShops.length > 0
      ? {
          question: `Do ${city} shops sell Pokémon cards?`,
          answer: `Yes — ${namesList(pokemonShops)} ${pokemonShops.length === 1 ? 'carries' : 'carry'} Pokémon cards in ${city}.`,
        }
      : {
          question: `Do ${city} shops sell Pokémon cards?`,
          answer: `None of the ${city} shops listed here currently tag Pokémon in their catalog. Check the ${provinceName} page for other cities that do.`,
          link: { href: provinceUrl, label: `${provinceName} page` },
        };

  return [{ question: `How many sports card shops are in ${city}?`, answer: countAnswer }, buysFaq, pokemonFaq];
}
