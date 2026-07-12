import { describe, expect, it } from 'vitest';
import { rowToReseller } from '../../src/lib/resellers';
import type { GvizCell, GvizRow } from '../../src/lib/sheet';

const cell = (v: string | number | null, f?: string): GvizCell | null =>
  v === null ? null : f !== undefined ? { v, f } : { v };

// Column order matches the Resellers sheet tab headers:
// 0 Display Name | 1 City | 2 Province | 3 Bio | 4 Photo URL | 5 Specialties
// 6 eBay | 7 Facebook | 8 Instagram | 9 Website | 10 Contact | 11 Status
// 12 Evidence | 13 Notes | 14 Verified Date
const row = (over: Partial<Record<number, GvizCell | null>> = {}): GvizRow => {
  const base: (GvizCell | null)[] = [
    cell('Prairie Slabs'),
    cell('Calgary'),
    cell('AB'),
    cell('Hockey and vintage, mostly pre-2000.'),
    cell('https://example.com/avatar.webp'),
    cell('hockey; vintage'),
    cell('https://www.ebay.ca/usr/prairieslabs'),
    cell('https://facebook.com/prairieslabs'),
    null,
    null,
    cell('prairieslabs@example.com'),
    cell('Verified'),
    cell('https://www.ebay.ca/fdbk/feedback_profile/prairieslabs'), // Evidence — PRIVATE
    cell('Met at Calgary Expo, solid.'),                            // Notes — PRIVATE
    cell('Date(2026,6,12)', '2026-07-12'),
  ];
  return base.map((c, i) => (i in over ? (over[i] ?? null) : c));
};

describe('rowToReseller', () => {
  it('maps a Verified row to a complete record', () => {
    const r = rowToReseller(row());
    expect(r).toMatchObject({
      slug: 'prairie-slabs-calgary',
      name: 'Prairie Slabs',
      city: 'Calgary',
      citySlug: 'calgary',
      province: 'AB',
      bio: 'Hockey and vintage, mostly pre-2000.',
      photo: 'https://example.com/avatar.webp',
      specialties: ['hockey', 'vintage'],
      ebay: 'https://www.ebay.ca/usr/prairieslabs',
      facebook: 'https://facebook.com/prairieslabs',
      contact: 'prairieslabs@example.com',
      verifiedSince: '2026-07-12',
    });
    expect(r?.instagram).toBeUndefined();
    expect(r?.website).toBeUndefined();
  });

  it('NEVER carries Evidence or Notes into the record (Nathan-private columns)', () => {
    const r = rowToReseller(row());
    const serialized = JSON.stringify(r);
    expect(serialized).not.toContain('fdbk');
    expect(serialized).not.toContain('Met at Calgary Expo');
  });

  it('drops rows whose Status is not Verified', () => {
    expect(rowToReseller(row({ 11: cell('Pending') }))).toBeNull();
    expect(rowToReseller(row({ 11: cell('Rejected') }))).toBeNull();
    expect(rowToReseller(row({ 11: null }))).toBeNull();
  });

  it('accepts Status with case/whitespace variance', () => {
    expect(rowToReseller(row({ 11: cell('  verified ') }))).not.toBeNull();
    expect(rowToReseller(row({ 11: cell('VERIFIED') }))).not.toBeNull();
  });

  it('drops rows missing name, city, or province', () => {
    expect(rowToReseller(row({ 0: null }))).toBeNull();
    expect(rowToReseller(row({ 1: null }))).toBeNull();
    expect(rowToReseller(row({ 2: cell('Texas') }))).toBeNull();
  });

  it('rejects non-http(s) link values', () => {
    expect(rowToReseller(row({ 6: cell('javascript:alert(1)') }))?.ebay).toBeUndefined();
    expect(rowToReseller(row({ 9: cell('ftp://example.com') }))?.website).toBeUndefined();
  });

  it('parses the gviz Date() constructor for Verified Date, ignoring locale display text', () => {
    expect(rowToReseller(row({ 14: cell('Date(2026,6,12)', '7/12/2026') }))?.verifiedSince).toBe('2026-07-12');
    expect(rowToReseller(row({ 14: null }))?.verifiedSince).toBeUndefined();
  });

  it('slug omits the date (stable across re-verification) and dedupes are the bake script\'s job', () => {
    expect(rowToReseller(row())?.slug).toBe('prairie-slabs-calgary');
  });
});
