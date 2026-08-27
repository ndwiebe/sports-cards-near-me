import { distanceKm } from './map-data';
import type { ProvinceCode, Store } from './types';

/**
 * Distance-ranked neighbours, for the "more shops near here" and "nearby cities"
 * blocks.
 *
 * Why this exists: store pages carry 67% of the site's impressions and linked
 * nowhere except their own breadcrumb, and no city page linked to any other
 * city. Both page types were dead ends, so the relevance they earn had nowhere
 * to flow — including to the guides, which sit on page two for want of inbound
 * links.
 *
 * maxKm defaults to 75 deliberately. Canada has shops with no neighbour for
 * hundreds of kilometres; "nearby" has to mean nearby or the block is a lie.
 * Callers render nothing when the list comes back empty.
 */
const DEFAULT_LIMIT = 5;
const DEFAULT_MAX_KM = 75;
const DEFAULT_CITY_MAX_KM = 150;

export function nearestStores(
  all: Store[],
  origin: Store,
  opts: { limit?: number; maxKm?: number } = {},
): Store[] {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const maxKm = opts.maxKm ?? DEFAULT_MAX_KM;
  return all
    .filter((s) => s.slug !== origin.slug)
    .map((s) => ({ store: s, km: distanceKm(origin.lat, origin.lng, s.lat, s.lng) }))
    .filter((x) => x.km <= maxKm)
    .sort((a, b) => a.km - b.km || a.store.slug.localeCompare(b.store.slug))
    .slice(0, limit)
    .map((x) => x.store);
}

export interface NearbyCity {
  city: string;
  citySlug: string;
  province: ProvinceCode;
  count: number;
  km: number;
}

interface CityCentre {
  city: string;
  citySlug: string;
  province: ProvinceCode;
  count: number;
  lat: number;
  lng: number;
}

/** Mean position of a city's shops — good enough to rank neighbours by.
 *
 * Grouped by (province, citySlug), not citySlug alone. src/data/stores.json
 * has "Stratford, ON" (2 shops) and "Stratford, PE" (1 shop) — different real
 * places 3000+ km apart that happen to share a citySlug. citiesIn() in
 * src/lib/stores.ts already scopes by province before grouping by slug; this
 * used to group by slug alone and silently averaged both Stratfords into one
 * fake centre near neither.
 */
function cityCentres(all: Store[]): CityCentre[] {
  const acc = new Map<string, { c: CityCentre; latSum: number; lngSum: number }>();
  for (const s of all) {
    const key = `${s.province}::${s.citySlug}`;
    const entry = acc.get(key);
    if (entry === undefined) {
      acc.set(key, {
        c: { city: s.city, citySlug: s.citySlug, province: s.province, count: 1, lat: 0, lng: 0 },
        latSum: s.lat,
        lngSum: s.lng,
      });
    } else {
      entry.c.count += 1;
      entry.latSum += s.lat;
      entry.lngSum += s.lng;
    }
  }
  return [...acc.values()].map(({ c, latSum, lngSum }) => ({
    ...c,
    lat: latSum / c.count,
    lng: lngSum / c.count,
  }));
}

export function nearestCities(
  all: Store[],
  originProvince: ProvinceCode,
  citySlug: string,
  opts: { limit?: number; maxKm?: number } = {},
): NearbyCity[] {
  const limit = opts.limit ?? 6;
  const maxKm = opts.maxKm ?? DEFAULT_CITY_MAX_KM;
  const centres = cityCentres(all);
  const origin = centres.find((c) => c.province === originProvince && c.citySlug === citySlug);
  if (origin === undefined) return [];
  return centres
    .filter((c) => !(c.province === originProvince && c.citySlug === citySlug))
    .map((c) => ({
      city: c.city,
      citySlug: c.citySlug,
      province: c.province,
      count: c.count,
      km: distanceKm(origin.lat, origin.lng, c.lat, c.lng),
    }))
    .filter((c) => c.km <= maxKm)
    .sort((a, b) => a.km - b.km || a.citySlug.localeCompare(b.citySlug))
    .slice(0, limit);
}

export function nearestStoresToCity(
  all: Store[],
  originProvince: ProvinceCode,
  citySlug: string,
  opts: { limit?: number; maxKm?: number } = {},
): Store[] {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const maxKm = opts.maxKm ?? DEFAULT_CITY_MAX_KM;
  const origin = cityCentres(all).find((c) => c.province === originProvince && c.citySlug === citySlug);
  if (origin === undefined) return [];
  return all
    .filter((s) => !(s.province === originProvince && s.citySlug === citySlug))
    .map((s) => ({ store: s, km: distanceKm(origin.lat, origin.lng, s.lat, s.lng) }))
    .filter((x) => x.km <= maxKm)
    .sort((a, b) => a.km - b.km || a.store.slug.localeCompare(b.store.slug))
    .slice(0, limit)
    .map((x) => x.store);
}
