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

/** Mean position of a city's shops — good enough to rank neighbours by. */
function cityCentres(all: Store[]): CityCentre[] {
  const acc = new Map<string, { c: CityCentre; latSum: number; lngSum: number }>();
  for (const s of all) {
    const entry = acc.get(s.citySlug);
    if (entry === undefined) {
      acc.set(s.citySlug, {
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
  citySlug: string,
  opts: { limit?: number; maxKm?: number } = {},
): NearbyCity[] {
  const limit = opts.limit ?? 6;
  const maxKm = opts.maxKm ?? 150;
  const centres = cityCentres(all);
  const origin = centres.find((c) => c.citySlug === citySlug);
  if (origin === undefined) return [];
  return centres
    .filter((c) => c.citySlug !== citySlug)
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
