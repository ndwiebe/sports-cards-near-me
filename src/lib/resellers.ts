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

// Resellers tab column order (0-based).
//
// Evidence and Notes USED to sit at 12 and 13, guarded only by "we never read
// them". That guard was at the wrong layer: the sheet is fetched with no
// authentication (see sheet.ts) and is shared anyone-with-link, while the link
// itself is committed to a public repo — so not reading a column never made it
// private. Anyone could request those columns directly.
//
// Both columns were removed from this sheet on 2026-07-31 and now live in a
// separate, genuinely private spreadsheet (owner-only; anonymous fetch returns
// 401). Verified Date consequently moved from index 14 to 12.
//
// RULE: this sheet is world-readable. Only publishable fields belong in it.
// Anything private goes in the private spreadsheet, never here. The header
// assertion in tests/unit/resellers.test.ts fails loudly if a column is
// inserted, because a silent shift would repoint every field below it.
const COL = {
  name: 0, city: 1, province: 2, bio: 3, photo: 4, specialties: 5,
  ebay: 6, facebook: 7, instagram: 8, website: 9, contact: 10,
  status: 11, verifiedDate: 12,
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
