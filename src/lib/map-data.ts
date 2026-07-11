import type { Store } from './types';

export interface MapStore {
  slug: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  rating?: number | undefined;
  logo?: boolean | undefined;
  services: string[];
  sports: string[];
}

export function toMapStores(stores: Store[], logoSlugs?: ReadonlySet<string>): MapStore[] {
  return stores.map((s) => ({
    slug: s.slug,
    name: s.name,
    city: s.city,
    lat: s.lat,
    lng: s.lng,
    ...(s.rating !== undefined && { rating: s.rating }),
    ...(logoSlugs?.has(s.slug) === true && { logo: true }),
    services: s.services,
    sports: s.sports,
  }));
}

export function initialsOf(name: string): string {
  const digits = name.match(/^\d{1,3}/);
  if (digits) return digits[0];
  const words = name.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((w) => (w[0] ?? '').toUpperCase())
      .join('');
  }
  const alnum = name.replace(/[^a-z0-9]/gi, '');
  return alnum === '' ? '?' : alnum.slice(0, 2).toUpperCase();
}
