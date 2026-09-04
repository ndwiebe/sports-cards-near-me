import { describe, expect, it } from 'vitest';
import { bySportsCardRank, isConfirmedTcgOnly, topRatedSportsCardStore, byRecommendedRank } from '../../src/lib/seo';
import type { Store } from '../../src/lib/types';

const shop = (name: string, sports: string[], rating = 4.8, reviewCount = 300): Store => ({
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  city: 'Testville',
  citySlug: 'testville',
  address: '1 Test St, Testville, AB T0T 0T0',
  province: 'AB',
  rating,
  reviewCount,
  services: [],
  sports,
  lat: 51,
  lng: -114,
});

describe('isConfirmedTcgOnly', () => {
  it('is true only with positive TCG evidence and no sports evidence', () => {
    expect(isConfirmedTcgOnly(shop('Poke Shop', ['Pokemon']))).toBe(true);
    expect(isConfirmedTcgOnly(shop('Magic Shop', ['Magic', 'Yu-Gi-Oh']))).toBe(true);
  });

  it('is false when the shop also evidences sports cards', () => {
    expect(isConfirmedTcgOnly(shop('Both', ['Pokemon', 'Hockey']))).toBe(false);
    expect(isConfirmedTcgOnly(shop('Sports', ['Baseball']))).toBe(false);
  });

  // The rule Nathan chose on 2026-09-04, and the reason the whole helper exists:
  // 78 shops carry no category data at all and no amount of scanning closes that gap.
  it('is FALSE for a shop with no category data — silence is never evidence', () => {
    expect(isConfirmedTcgOnly(shop('Unknown', []))).toBe(false);
  });

  // "Other" is not a sports tag: 146 of the 352 shops carrying it ALSO carry an
  // explicit sports tag, so this data records sports outright when it exists.
  it('treats "Other" as neither sports nor TCG evidence', () => {
    expect(isConfirmedTcgOnly(shop('Games Cafe', ['Pokemon', 'Other']))).toBe(true);
    expect(isConfirmedTcgOnly(shop('Just Other', ['Other']))).toBe(false);
  });
});

describe('bySportsCardRank', () => {
  it('sorts a confirmed TCG-only shop below a sports shop it would otherwise outrank', () => {
    const cafe = shop('Board Game Cafe', ['Pokemon', 'Other'], 4.9, 513);
    const specialist = shop('Card Specialist', ['Hockey'], 4.6, 120);
    expect([cafe, specialist].sort(byRecommendedRank)[0]?.name).toBe('Board Game Cafe');
    expect([cafe, specialist].sort(bySportsCardRank)[0]?.name).toBe('Card Specialist');
  });

  it('leaves an uncategorised shop in its normal place', () => {
    const unknown = shop('No Data', [], 4.9, 500);
    const specialist = shop('Card Specialist', ['Hockey'], 4.6, 120);
    expect([specialist, unknown].sort(bySportsCardRank)[0]?.name).toBe('No Data');
  });

  it('still ranks two TCG-only shops against each other normally', () => {
    const strong = shop('Strong TCG', ['Pokemon'], 4.9, 500);
    const weak = shop('Weak TCG', ['Magic'], 4.2, 40);
    expect([weak, strong].sort(bySportsCardRank)[0]?.name).toBe('Strong TCG');
  });
});

describe('topRatedSportsCardStore', () => {
  it('does not crown a TCG-only shop even when it scores highest', () => {
    const list = [shop('Poke Palace', ['Pokemon'], 4.9, 600), shop('Hockey Hut', ['Hockey'], 4.5, 90)];
    expect(topRatedSportsCardStore(list)?.name).toBe('Hockey Hut');
  });

  it('crowns nobody rather than the wrong shop when only TCG shops qualify', () => {
    expect(topRatedSportsCardStore([shop('Poke Palace', ['Pokemon'], 4.9, 600)])).toBeUndefined();
  });

  it('will crown an uncategorised shop — absence of data is not a disqualification', () => {
    expect(topRatedSportsCardStore([shop('No Data', [], 4.9, 600)])?.name).toBe('No Data');
  });
});
