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

// Start/End Date sheet cells are native Sheets date cells: gviz reports `v`
// as a "Date(y,m,d)" constructor string and `f` as the locale-formatted
// display text, which is ISO YYYY-MM-DD because the column is formatted
// that way. Prefer `f`; fall back to `v` in case a cell is plain text.
const isoDate = (cell: GvizCell | null | undefined): string | undefined => {
  const formatted = sanitizeText(cell?.f);
  if (formatted !== undefined && ISO_DATE_RE.test(formatted)) return formatted;
  const text = sanitizeText(cell?.v);
  return text !== undefined && ISO_DATE_RE.test(text) ? text : undefined;
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
