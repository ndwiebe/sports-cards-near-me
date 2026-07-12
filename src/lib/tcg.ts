import { topRatedStore, type FaqItem } from './seo';
import { provincesWithStores, citiesIn } from './stores';
import type { ProvinceCode, Store } from './types';

/** A store counts as a Pokémon shop iff its combined services+sports tags contain exactly 'pokemon'. */
export function isPokemonShop(store: Store): boolean {
  return [...store.services, ...store.sports].some((t) => t.trim().toLowerCase() === 'pokemon');
}

export interface PokemonCityEntry {
  provinceCode: ProvinceCode;
  provinceName: string;
  provinceSlug: string;
  city: string;
  citySlug: string;
}

/** One entry per (province, city) that has at least one Pokémon shop. Exported (not declared
 * inline in a page's frontmatter) because Astro's static-path collection only reliably resolves
 * helpers pulled in via `import`, not module-local function declarations in the same .astro file. */
export function pokemonCityEntries(stores: Store[]): PokemonCityEntry[] {
  const entries: PokemonCityEntry[] = [];
  for (const p of provincesWithStores(stores)) {
    for (const c of citiesIn(stores, p.code)) {
      if (c.stores.some((s) => isPokemonShop(s))) {
        entries.push({
          provinceCode: p.code,
          provinceName: p.name,
          provinceSlug: p.slug,
          city: c.city,
          citySlug: c.citySlug,
        });
      }
    }
  }
  return entries;
}

function compareShops(a: Store, b: Store): number {
  if (a.rating === undefined && b.rating === undefined) {
    // fall through to reviewCount/name tiebreak below
  } else if (a.rating === undefined) {
    return 1;
  } else if (b.rating === undefined) {
    return -1;
  } else {
    const ratingDiff = b.rating - a.rating;
    if (ratingDiff !== 0) return ratingDiff;
  }
  const reviewDiff = (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
  if (reviewDiff !== 0) return reviewDiff;
  return a.name.localeCompare(b.name);
}

/** Pokémon shops in one city, ranked: rating desc (undefined last), reviewCount desc, name. */
export function pokemonShopsInCity(stores: Store[], province: ProvinceCode, citySlug: string): Store[] {
  return stores
    .filter((s) => s.province === province && s.citySlug === citySlug && isPokemonShop(s))
    .sort(compareShops);
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/** Names joined with "and", capped at 3 with "and N more" beyond that. */
function namesList(shops: Store[]): string {
  const names = shops.map((s) => s.name);
  if (names.length <= 3) return joinWithAnd(names);
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  return `${shown.join(', ')}, and ${rest} more`;
}

function hasAnyTag(shops: Store[], predicate: (tag: string) => boolean): Store[] {
  return shops.filter((s) => [...s.services, ...s.sports].some((t) => predicate(t.trim().toLowerCase())));
}

/** Computed 40-60 word answer capsule for a Pokémon city page. Every fact is derived from `shops`. */
export function pokemonCityCapsule(city: string, provinceName: string, shops: Store[]): string {
  const total = shops.length;
  const shopWord = total === 1 ? 'shop' : 'shops';
  const parts: string[] = [
    `${city}, ${provinceName} has ${total} Pokémon card ${shopWord} listed on Sports Cards Near Me, ranked by Google rating and review count.`,
  ];

  const top = topRatedStore(shops);
  if (top !== undefined) {
    parts.push(
      `${top.name} currently ranks first at ${top.rating} stars${top.reviewCount !== undefined ? ` from ${top.reviewCount} reviews` : ''}.`,
    );
  }

  parts.push(
    total === 1
      ? 'See its address, hours, and map pin below.'
      : `Browse the ranked list and interactive map below to compare all ${total} locations near you.`,
  );

  return parts.join(' ');
}

/**
 * Three computed FAQ entries for a Pokémon city page. Same array backs both the visible
 * FAQ section and the FAQPage JSON-LD — no independent copy to drift out of sync.
 */
export function pokemonCityFaqs(city: string, provinceName: string, shops: Store[], cityPageUrl: string): FaqItem[] {
  const total = shops.length;
  const shopWord = total === 1 ? 'shop' : 'shops';

  const whereAnswer =
    total === 1
      ? `${namesList(shops)} is the Pokémon card shop we track in ${city}, ${provinceName}. See its address, hours, and map pin below.`
      : `${city} has ${total} Pokémon card ${shopWord} tracked on Sports Cards Near Me, including ${namesList(shops)}. See the full ranked list and map below.`;
  const whereFaq: FaqItem = { question: `Where can I buy Pokémon cards in ${city}?`, answer: whereAnswer };

  const top = topRatedStore(shops);
  const bestFaq: FaqItem =
    top !== undefined
      ? {
          question: `Which ${city} shop has the best Pokémon selection?`,
          answer: `${top.name} has the highest Google rating among ${city} Pokémon shops, at ${top.rating} stars${top.reviewCount !== undefined ? ` from ${top.reviewCount} reviews` : ''}. That reflects customer ratings, not verified card inventory or stock.`,
        }
      : {
          question: `Which ${city} shop has the best Pokémon selection?`,
          answer: `None of the Pokémon shops we track in ${city} have a public Google rating yet, so we can't name a top pick by rating. Compare the full list below, or see the ${city} shop directory.`,
          link: { href: cityPageUrl, label: `${city} shop directory` },
        };

  const traders = hasAnyTag(shops, (t) => t === 'buys' || t === 'trades singles');
  const tradeFaq: FaqItem =
    traders.length > 0
      ? {
          question: `Do ${city} shops buy or trade Pokémon cards?`,
          answer: `Yes — ${namesList(traders)} ${traders.length === 1 ? 'lists' : 'list'} buying or trading singles as a service in ${city}.`,
        }
      : {
          question: `Do ${city} shops buy or trade Pokémon cards?`,
          answer: `None of the ${city} Pokémon shops listed here currently advertise buying or trading singles as a service. Check the ${city} shop directory for other options.`,
          link: { href: cityPageUrl, label: `${city} shop directory` },
        };

  return [whereFaq, bestFaq, tradeFaq];
}
