import type { ProvinceCode } from './types';
import { PROVINCES } from './types';

export function parseRating(raw: unknown): { rating?: number | undefined; reviewCount?: number | undefined } {
  if (typeof raw === 'number') return { rating: raw, reviewCount: undefined };
  if (typeof raw !== 'string') return { rating: undefined, reviewCount: undefined };
  const m = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:\(([0-9,]+)\))?/);
  if (!m || m[1] === undefined) return { rating: undefined, reviewCount: undefined };
  const count = m[2] !== undefined ? Number(m[2].replace(/,/g, '')) : undefined;
  return { rating: Number(m[1]), reviewCount: count };
}

export function sanitizeText(raw: unknown): string | undefined {
  if (typeof raw === 'number') return String(raw);
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw
    .replace(/[\u{E000}-\u{F8FF}]/gu, '') // icon-font private-use glyphs
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned === '' ? undefined : cleaned;
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const PROVINCE_RE = /\b(AB|BC|MB|NB|NL|NS|NT|ON|PE|QC|SK|YT)\b/g;

export function deriveProvince(address: string): ProvinceCode | null {
  const matches = [...address.matchAll(PROVINCE_RE)];
  const last = matches.at(-1);
  if (!last) return null;
  const code = last[1] as ProvinceCode;
  return code in PROVINCES ? code : null;
}

export function splitList(raw: unknown): string[] {
  const text = sanitizeText(raw);
  if (text === undefined) return [];
  return text
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}
