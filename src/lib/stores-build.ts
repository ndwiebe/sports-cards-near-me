import type { GvizRow } from './sheet';
import type { Store } from './types';
import { parseRating, sanitizeText, slugify, deriveProvince, splitList } from './transform';

const num = (c: GvizRow[number]): number | null =>
  c !== null && typeof c.v === 'number' ? c.v : null;

export const httpUrl = (raw: unknown): string | undefined => {
  const text = sanitizeText(raw);
  return text !== undefined && /^https?:\/\//i.test(text) ? text : undefined;
};

export function rowToStore(cells: GvizRow): Store | null {
  const name = sanitizeText(cells[0]?.v);
  const city = sanitizeText(cells[1]?.v);
  const address = sanitizeText(cells[2]?.v);
  const lat = num(cells[10] ?? null);
  const lng = num(cells[11] ?? null);
  if (name === undefined || city === undefined || address === undefined || lat === null || lng === null) return null;
  const province = deriveProvince(address);
  if (province === null) return null;
  const { rating, reviewCount } = parseRating(cells[3]?.v);
  const status = parseStatus(cells[12]?.v);
  return {
    slug: slugify(`${name}-${city}`),
    name,
    city,
    citySlug: slugify(city),
    address,
    province,
    rating,
    reviewCount,
    hours: sanitizeText(cells[4]?.v),
    phone: sanitizeText(cells[5]?.v),
    website: httpUrl(cells[6]?.v),
    social: httpUrl(cells[7]?.v),
    services: splitList(cells[8]?.v),
    sports: splitList(cells[9]?.v),
    lat,
    lng,
    ...(status !== undefined ? { status } : {}),
    // Column 13 (`Unverified Note`) -- optional and additive, same as Status: a
    // sheet without the column yields undefined, which renders nothing.
    ...(sanitizeText(cells[13]?.v) !== undefined ? { unverifiedNote: sanitizeText(cells[13]?.v) } : {}),
  };
}

// Column 12 (`Status`) — optional and additive. A sheet without the column yields
// undefined here, which reads as open, so this is safe to ship before the column
// exists. Only the exact values below count: anything else (blank, "open", a typo,
// a stray note) leaves the shop listed, because the failure that matters is
// unlisting a live business, not listing a dead one for another month.
export function parseStatus(raw: unknown): 'closed' | 'online-only' | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim().toLowerCase();
  if (v === 'closed') return 'closed';
  if (v === 'online-only' || v === 'online only') return 'online-only';
  return undefined;
}

/** Split baked stores into the listed set and the unlisted set (closed or
 * online-only — either way the shop no longer has a walk-in storefront to
 * list), preserving order. */
export function splitStores(stores: Store[]): { open: Store[]; closed: Store[] } {
  return {
    open: stores.filter((s) => s.status === undefined),
    closed: stores.filter((s) => s.status !== undefined),
  };
}

export function dedupeSlugs(stores: Store[]): Store[] {
  const seen = new Map<string, number>();
  return stores.map((s) => {
    const n = (seen.get(s.slug) ?? 0) + 1;
    seen.set(s.slug, n);
    return n === 1 ? s : { ...s, slug: `${s.slug}-${n}` };
  });
}

export function assertCountSane(next: number, prev: number | null): void {
  if (next < 50) throw new Error(`bake guard: only ${next} stores (< 50 floor)`);
  if (prev !== null && next < Math.floor(prev * 0.9)) {
    throw new Error(`bake guard: ${next} stores is a >10% drop from previous ${prev}`);
  }
}
