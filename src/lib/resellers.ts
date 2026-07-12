import type { GvizCell, GvizRow } from './sheet';
import type { ProvinceCode } from './types';
import { PROVINCES } from './types';
import { sanitizeText, slugify, splitList } from './transform';
import { httpUrl } from './stores-build';
import { isoDate } from './shows';

export interface ResellerRecord {
  slug: string;
  name: string;
  city: string;
  citySlug: string;
  province: ProvinceCode;
  bio?: string | undefined;
  photo?: string | undefined;
  specialties: string[];
  ebay?: string | undefined;
  facebook?: string | undefined;
  instagram?: string | undefined;
  website?: string | undefined;
  contact?: string | undefined;
  verifiedSince?: string | undefined;
}

// Resellers tab column order (0-based). Columns 12 (Evidence) and 13 (Notes)
// are Nathan-private review material: they are deliberately never read, so
// they can never leak into the baked JSON or the public site.
const COL = {
  name: 0, city: 1, province: 2, bio: 3, photo: 4, specialties: 5,
  ebay: 6, facebook: 7, instagram: 8, website: 9, contact: 10,
  status: 11, verifiedDate: 14,
} as const;

const provinceCode = (raw: unknown): ProvinceCode | null => {
  const text = sanitizeText(raw);
  if (text === undefined) return null;
  const code = text.toUpperCase();
  return code in PROVINCES ? (code as ProvinceCode) : null;
};

const isVerified = (cell: GvizCell | null | undefined): boolean =>
  sanitizeText(cell?.v)?.toLowerCase() === 'verified';

export function rowToReseller(cells: GvizRow): ResellerRecord | null {
  if (!isVerified(cells[COL.status])) return null;
  const name = sanitizeText(cells[COL.name]?.v);
  const city = sanitizeText(cells[COL.city]?.v);
  const province = provinceCode(cells[COL.province]?.v);
  if (name === undefined || city === undefined || province === null) return null;

  return {
    slug: slugify(`${name}-${city}`),
    name,
    city,
    citySlug: slugify(city),
    province,
    bio: sanitizeText(cells[COL.bio]?.v),
    photo: httpUrl(cells[COL.photo]?.v),
    specialties: splitList(cells[COL.specialties]?.v),
    ebay: httpUrl(cells[COL.ebay]?.v),
    facebook: httpUrl(cells[COL.facebook]?.v),
    instagram: httpUrl(cells[COL.instagram]?.v),
    website: httpUrl(cells[COL.website]?.v),
    contact: sanitizeText(cells[COL.contact]?.v),
    verifiedSince: isoDate(cells[COL.verifiedDate]),
  };
}
