import type { ProvinceCode, Store } from './types';
import { PROVINCES } from './types';

export function provincesWithStores(
  stores: Store[],
): { code: ProvinceCode; name: string; slug: string; count: number }[] {
  const counts = new Map<ProvinceCode, number>();
  for (const s of stores) counts.set(s.province, (counts.get(s.province) ?? 0) + 1);
  return [...counts.entries()]
    .map(([code, count]) => ({ code, ...PROVINCES[code], count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function citiesIn(
  stores: Store[],
  code: ProvinceCode,
): { city: string; citySlug: string; stores: Store[] }[] {
  const groups = new Map<string, { city: string; citySlug: string; stores: Store[] }>();
  for (const s of stores) {
    if (s.province !== code) continue;
    const g = groups.get(s.citySlug) ?? { city: s.city, citySlug: s.citySlug, stores: [] };
    g.stores.push(s);
    groups.set(s.citySlug, g);
  }
  return [...groups.values()].sort((a, b) => a.city.localeCompare(b.city));
}

export function provinceBySlug(
  slug: string,
): { code: ProvinceCode; name: string; slug: string } | null {
  const entry = (Object.entries(PROVINCES) as [ProvinceCode, { name: string; slug: string }][]).find(
    ([, v]) => v.slug === slug,
  );
  return entry ? { code: entry[0], ...entry[1] } : null;
}
