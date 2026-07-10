import { describe, it, expect } from 'vitest';
import { parseRating, sanitizeText, slugify, deriveProvince, splitList } from '../../src/lib/transform';

describe('parseRating', () => {
  it('parses "4.8\\n(33)" from the sheet', () => {
    expect(parseRating('4.8\n(33)')).toEqual({ rating: 4.8, reviewCount: 33 });
  });
  it('parses a bare number', () => {
    expect(parseRating(5)).toEqual({ rating: 5, reviewCount: undefined });
  });
  it('returns empties for junk', () => {
    expect(parseRating(null)).toEqual({ rating: undefined, reviewCount: undefined });
    expect(parseRating('')).toEqual({ rating: undefined, reviewCount: undefined });
  });
});

describe('sanitizeText', () => {
  it('strips Google icon-font glyphs (private-use chars) and trims', () => {
    expect(sanitizeText(' Mon-Fri 9-5 ')).toBe('Mon-Fri 9-5');
  });
  it('returns undefined for empty/null', () => {
    expect(sanitizeText('  ')).toBeUndefined();
    expect(sanitizeText(null)).toBeUndefined();
    expect(sanitizeText('')).toBeUndefined();
  });
});

describe('slugify', () => {
  it('kebab-cases with accents and punctuation removed', () => {
    expect(slugify('203 Collectibles LTD.')).toBe('203-collectibles-ltd');
    expect(slugify('Cartes Montréal & Fils')).toBe('cartes-montreal-fils');
  });
});

describe('deriveProvince', () => {
  it('finds the province code in a full address', () => {
    expect(deriveProvince('2331 66 St NW Unit 312, Edmonton, AB T6K 4B5')).toBe('AB');
  });
  it('uses the last code when a street name collides', () => {
    expect(deriveProvince('12 ON Ave, Winnipeg, MB R3C 4T3')).toBe('MB');
  });
  it('returns null when absent', () => {
    expect(deriveProvince('123 Nowhere St')).toBeNull();
  });
});

describe('splitList', () => {
  it('splits semicolon lists and trims', () => {
    expect(splitList('Buys; Sells;Trades Singles')).toEqual(['Buys', 'Sells', 'Trades Singles']);
  });
  it('returns [] for empty', () => {
    expect(splitList(null)).toEqual([]);
  });
  it('splits comma lists too (sheet formatting varies)', () => {
    expect(splitList('Buys, Sells, Trades Singles')).toEqual(['Buys', 'Sells', 'Trades Singles']);
  });
});
