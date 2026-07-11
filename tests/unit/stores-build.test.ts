import { describe, it, expect } from 'vitest';
import { rowToStore, dedupeSlugs, assertCountSane } from '../../src/lib/stores-build';
import type { GvizRow } from '../../src/lib/sheet';
import type { Store } from '../../src/lib/types';

const cell = (v: string | number | null) => (v === null ? null : { v });
const row = (over: Partial<Record<number, string | number | null>> = {}): GvizRow => {
  const base: (string | number | null)[] = [
    '203 Collectibles LTD.', 'Edmonton', '2331 66 St NW Unit 312, Edmonton, AB T6K 4B5',
    '4.8\n(33)', '', '780-555-0100', 'https://www.203collectibles.com/', null,
    'Buys;Sells', 'Hockey;Pokemon', 53.4808, -113.4938,
  ];
  return base.map((v, i) => cell(i in over ? (over[i] ?? null) : v));
};

describe('rowToStore', () => {
  it('maps a real row', () => {
    const s = rowToStore(row());
    expect(s).toMatchObject({
      slug: '203-collectibles-ltd-edmonton',
      name: '203 Collectibles LTD.',
      city: 'Edmonton',
      citySlug: 'edmonton',
      province: 'AB',
      rating: 4.8,
      reviewCount: 33,
      services: ['Buys', 'Sells'],
      sports: ['Hockey', 'Pokemon'],
      lat: 53.4808,
      lng: -113.4938,
    });
    expect(s?.hours).toBeUndefined(); // icon-glyph junk stripped to nothing
  });
  it('rejects rows missing coordinates or name or province', () => {
    expect(rowToStore(row({ 10: null }))).toBeNull();
    expect(rowToStore(row({ 0: null }))).toBeNull();
    expect(rowToStore(row({ 2: '123 Nowhere St' }))).toBeNull();
  });
  it('drops non-http(s) website/social values', () => {
    expect(rowToStore(row({ 6: 'javascript:alert(1)' }))?.website).toBeUndefined();
    expect(rowToStore(row({ 7: 'ftp://example.com' }))?.social).toBeUndefined();
    expect(rowToStore(row())?.website).toBe('https://www.203collectibles.com/');
  });
});

describe('dedupeSlugs', () => {
  it('suffixes duplicates deterministically', () => {
    const mk = (slug: string): Store => ({
      slug, name: 'x', city: 'y', citySlug: 'y', address: 'a', province: 'AB',
      services: [], sports: [], lat: 0, lng: 0,
    });
    const out = dedupeSlugs([mk('a'), mk('a'), mk('b'), mk('a')]);
    expect(out.map((s) => s.slug)).toEqual(['a', 'a-2', 'b', 'a-3']);
  });
});

describe('assertCountSane', () => {
  it('passes normal growth', () => {
    expect(() => assertCountSane(69, 69)).not.toThrow();
    expect(() => assertCountSane(70, null)).not.toThrow();
  });
  it('fails absolute floor and big drops', () => {
    expect(() => assertCountSane(1, null)).toThrow();
    expect(() => assertCountSane(50, 69)).toThrow();
  });
});
