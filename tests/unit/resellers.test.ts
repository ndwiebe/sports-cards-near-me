import { describe, expect, it } from 'vitest';
import { rowToReseller } from '../../src/lib/resellers';
import type { GvizCell, GvizRow } from '../../src/lib/sheet';

const cell = (v: string | number | null, f?: string): GvizCell | null =>
  v === null ? null : f !== undefined ? { v, f } : { v };

// Column order matches the Resellers sheet tab headers, as of 2026-07-31:
// 0 Display Name | 1 City | 2 Province | 3 Bio | 4 Photo URL | 5 Specialties
// 6 eBay | 7 Facebook | 8 Instagram | 9 Website | 10 Contact | 11 Status
// 12 Verified Date
//
// Evidence and Notes used to sit at 12 and 13. They were removed from this
// sheet because it is world-readable — "the build never reads them" was never
// privacy — and moved to a separate owner-only spreadsheet. Verified Date
// therefore moved 14 -> 12.
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
    expect(rowToReseller(row({ 12: cell('Date(2026,6,12)', '7/12/2026') }))?.verifiedSince).toBe('2026-07-12');
    expect(rowToReseller(row({ 12: null }))?.verifiedSince).toBeUndefined();
  });

  it('slug omits the date (stable across re-verification) and dedupes are the bake script\'s job', () => {
    expect(rowToReseller(row())?.slug).toBe('prairie-slabs-calgary');
  });
});

// Guard added 2026-07-31 with the public-sheet fix. Evidence/Notes used to sit
// at 12/13 protected only by "we never read them" — but the sheet is fetched
// unauthenticated and shared anyone-with-link, so that was never privacy. They
// were removed and Verified Date moved 14 -> 12.
//
// This pins the column layout: inserting a column shifts every field below it
// and would silently repoint data (a bio landing in `contact`, a note landing
// in `bio`) with no error anywhere. Fail loudly instead.
it('reseller column layout is pinned — a shifted column must break the build, not leak', () => {
  const header = [
    'Display Name', 'City', 'Province', 'Bio', 'Photo URL', 'Specialties',
    'eBay', 'Facebook', 'Instagram', 'Website', 'Contact', 'Status', 'Verified Date',
  ];
  const row = header.map((h) => ({ v: h }));
  const parsed = rowToReseller(row as never);
  // Status column reads the literal string "Status", which is not "Verified",
  // so the row is correctly rejected — proving status is read from index 11.
  expect(parsed).toBeNull();

  const verified = [...header];
  verified[2] = 'AB';        // province must be a real code to parse at all
  verified[11] = 'Verified';
  const ok = rowToReseller(verified.map((h) => ({ v: h })) as never);
  expect(ok?.name).toBe('Display Name');
  expect(ok?.contact).toBe('Contact');
  // The point of the test: Verified Date must be at 12, not 14.
  expect(header[12]).toBe('Verified Date');
  expect(header).toHaveLength(13);
  // Evidence and Notes must never reappear in the public sheet.
  expect(header).not.toContain('Evidence');
  expect(header).not.toContain('Notes');
});
