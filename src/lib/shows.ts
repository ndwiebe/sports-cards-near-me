import type { GvizCell, GvizRow } from './sheet';
import type { ProvinceCode } from './types';
import { PROVINCES } from './types';
import { sanitizeText, slugify } from './transform';
import { httpUrl } from './stores-build';

export interface ShowRecord {
  slug: string;
  name: string;
  city: string;
  citySlug: string;
  province: ProvinceCode;
  venue?: string | undefined;
  address?: string | undefined;
  startDate: string;
  endDate?: string | undefined;
  hours?: string | undefined;
  admission?: string | undefined;
  website?: string | undefined;
  sourceUrl?: string | undefined;
  recurring?: string | undefined;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const GVIZ_DATE_RE = /^Date\((\d{4}),(\d{1,2}),(\d{1,2})/;

// Start/End Date sheet cells are native Sheets date cells: gviz reports `v`
// as a locale-independent "Date(y,m0,d)" constructor string (month
// 0-indexed) — the ground truth — while `f` is the sheet's locale-formatted
// display text (e.g. "7/10/2026" vs "10/7/2026" depending on locale), which
// is NOT guaranteed to be ISO. Parse `v`'s Date(...) constructor first, as
// the primary path; fall back to ISO text on `f` then `v` for cells that
// are plain text instead of native Sheets dates.
const isoDate = (cell: GvizCell | null | undefined): string | undefined => {
  const raw = sanitizeText(cell?.v);
  const match = raw?.match(GVIZ_DATE_RE);
  const year = match?.[1];
  const month = match?.[2];
  const day = match?.[3];
  if (year !== undefined && month !== undefined && day !== undefined) {
    const mm = String(Number(month) + 1).padStart(2, '0');
    const dd = day.padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }
  const formatted = sanitizeText(cell?.f);
  if (formatted !== undefined && ISO_DATE_RE.test(formatted)) return formatted;
  return raw !== undefined && ISO_DATE_RE.test(raw) ? raw : undefined;
};

const provinceCode = (raw: unknown): ProvinceCode | null => {
  const text = sanitizeText(raw);
  if (text === undefined) return null;
  const code = text.toUpperCase();
  return code in PROVINCES ? (code as ProvinceCode) : null;
};

export function rowToShow(cells: GvizRow): ShowRecord | null {
  const name = sanitizeText(cells[0]?.v);
  const city = sanitizeText(cells[1]?.v);
  const province = provinceCode(cells[2]?.v);
  const startDate = isoDate(cells[5]);
  if (name === undefined || city === undefined || province === null || startDate === undefined) return null;

  return {
    slug: slugify(`${name}-${city}-${startDate}`),
    name,
    city,
    citySlug: slugify(city),
    province,
    venue: sanitizeText(cells[3]?.v),
    address: sanitizeText(cells[4]?.v),
    startDate,
    endDate: isoDate(cells[6]),
    hours: sanitizeText(cells[7]?.v),
    admission: sanitizeText(cells[8]?.v),
    website: httpUrl(cells[9]?.v),
    sourceUrl: httpUrl(cells[10]?.v),
    recurring: sanitizeText(cells[11]?.v),
  };
}
