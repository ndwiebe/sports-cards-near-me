// tests/unit/rosters.test.ts
import { describe, expect, it } from 'vitest';
import { ROSTER_HEADER, claimUrl, matchStore, normalizeDealerName, rostersForShow, rowToRosterEntry } from '../../src/lib/rosters';
import type { RosterEntry } from '../../src/lib/rosters';
import { RESELLER_FORM_URL } from '../../src/lib/forms';
import type { Store } from '../../src/lib/types';
import type { ShowRecord } from '../../src/lib/shows';
import type { GvizCell, GvizRow } from '../../src/lib/sheet';

const cell = (v: string | number | null, f?: string): GvizCell | null =>
  v === null ? null : f !== undefined ? { v, f } : { v };

// Column order matches the Rosters sheet tab headers, as of 2026-09-29:
// 0 Show URL | 1 Source URL | 2 Edition | 3 Captured | 4 Dealer | 5 Booth | 6 Blurb | 7 Link | 8 Store Slug
const row = (over: Partial<Record<number, GvizCell | null>> = {}): GvizRow => {
  const base: (GvizCell | null)[] = [
    cell('https://sportcardexpotoronto.com/'),
    cell('https://sportcardexpotoronto.com/wp-content/uploads/2026-SCME-APRIL-dealers-list-2pager.pdf'),
    cell('Spring 2026 (Apr 30 – May 3)'),
    cell('Date(2026,8,29)', '2026-09-29'),
    cell('SNORWAX CARDS'),
    cell('5029, 5030'),
    null,
    null,
    null,
  ];
  return base.map((c, i) => (i in over ? (over[i] ?? null) : c));
};

describe('rowToRosterEntry', () => {
  it('maps a complete row', () => {
    expect(rowToRosterEntry(row())).toEqual({
      show: 'https://sportcardexpotoronto.com/',
      source: 'https://sportcardexpotoronto.com/wp-content/uploads/2026-SCME-APRIL-dealers-list-2pager.pdf',
      edition: 'Spring 2026 (Apr 30 – May 3)',
      captured: '2026-09-29',
      dealer: 'SNORWAX CARDS',
      booth: '5029, 5030',
      blurb: undefined,
      link: undefined,
      storeSlug: undefined,
      noMatch: false,
    });
  });

  it('rejects rows missing show, source, edition, captured or dealer', () => {
    expect(rowToRosterEntry(row({ 1: null }))).toBeNull();
    expect(rowToRosterEntry(row({ 2: null }))).toBeNull();
    expect(rowToRosterEntry(row({ 3: null }))).toBeNull();
    expect(rowToRosterEntry(row({ 4: cell('  ') }))).toBeNull();
    expect(rowToRosterEntry(row({ 0: null }))).toBeNull();
  });

  it('rejects a source that is not an http(s) URL', () => {
    expect(rowToRosterEntry(row({ 1: cell('dealers.pdf') }))).toBeNull();
  });

  it("treats a '-' Store Slug as an explicit no-match", () => {
    const r = rowToRosterEntry(row({ 8: cell('-') }));
    expect(r?.storeSlug).toBeUndefined();
    expect(r?.noMatch).toBe(true);
  });

  it('keeps an explicit Store Slug', () => {
    const r = rowToRosterEntry(row({ 8: cell('401-games-toronto') }));
    expect(r?.storeSlug).toBe('401-games-toronto');
    expect(r?.noMatch).toBe(false);
  });

  it('drops a Link that is not http(s) and trims the blurb to 300 chars', () => {
    const r = rowToRosterEntry(row({ 6: cell('x'.repeat(400)), 7: cell('instagram.com/foo') }));
    expect(r?.blurb).toHaveLength(300);
    expect(r?.link).toBeUndefined();
  });
});


const store = (name: string, slug: string): Store => ({
  slug, name, city: 'Toronto', citySlug: 'toronto', address: '1 Front St', province: 'ON',
  services: [], sports: [], lat: 43.6, lng: -79.4,
});

describe('normalizeDealerName', () => {
  it('strips accents, case, punctuation and corporate suffixes', () => {
    expect(normalizeDealerName('Collect-Édition')).toBe('collect edition');
    expect(normalizeDealerName('HOGTOWN CARDS INC')).toBe('hogtown cards');
    expect(normalizeDealerName("Carl’s Cards")).toBe('carl s cards');
    expect(normalizeDealerName('  401   GAMES ')).toBe('401 games');
  });
});

describe('matchStore', () => {
  const stores = [store('401 Games', '401-games-toronto'), store('Sports Cards Plus & Collectibles', 'sports-cards-plus-thunder-bay')];
  const entry = (dealer: string, over: Partial<RosterEntry> = {}): RosterEntry => ({
    show: 'https://x.test/', source: 'https://x.test/list.pdf', edition: '2026', captured: '2026-09-29', dealer, noMatch: false, ...over,
  });

  it('matches on normalized name equality', () => {
    expect(matchStore(entry('401 GAMES'), stores)?.slug).toBe('401-games-toronto');
  });
  it('does not fuzzy-match a near name', () => {
    expect(matchStore(entry('HOBBY PLUS'), stores)).toBeUndefined();
    expect(matchStore(entry('401 GAMES TORONTO'), stores)).toBeUndefined();
  });
  it('honours an explicit Store Slug over the name', () => {
    expect(matchStore(entry('Some Other Name', { storeSlug: 'sports-cards-plus-thunder-bay' }), stores)?.slug)
      .toBe('sports-cards-plus-thunder-bay');
  });
  it('returns undefined for an explicit Store Slug that no longer exists', () => {
    expect(matchStore(entry('401 GAMES', { storeSlug: 'gone-shop' }), stores)).toBeUndefined();
  });
  it("never links when the sheet said '-'", () => {
    expect(matchStore(entry('401 GAMES', { noMatch: true }), stores)).toBeUndefined();
  });
});

describe('rostersForShow', () => {
  const show: ShowRecord = {
    slug: 's', name: 'Sport Card Expo Toronto', city: 'Mississauga', citySlug: 'mississauga', province: 'ON',
    startDate: '2026-11-06', website: 'https://sportcardexpotoronto.com/',
    sourceUrl: 'https://sportcardexpotoronto.com/wp-content/uploads/2026-SCME-APRIL-dealers-list-2pager.pdf',
  };
  const e = (showUrl: string, dealer: string, edition = 'Spring 2026'): RosterEntry =>
    ({ show: showUrl, source: `${showUrl}list.pdf`, edition, captured: '2026-09-29', dealer, noMatch: false });

  it('groups entries whose source equals the show website or sourceUrl, in sheet order', () => {
    const entries = [
      e('https://sportcardexpotoronto.com/wp-content/uploads/2026-SCME-APRIL-dealers-list-2pager.pdf', 'B'),
      e('https://elsewhere.test/', 'Z'),
      e('https://sportcardexpotoronto.com/', 'A', 'Fall 2026'),
    ];
    const r = rostersForShow(show, entries);
    expect(r.map((x) => [x.edition, x.entries.map((y) => y.dealer)])).toEqual([
      ['Spring 2026', ['B']],
      ['Fall 2026', ['A']],
    ]);
  });
  it('joins on the show URL, not the roster PDF address', () => {
    const entry: RosterEntry = { show: 'https://sportcardexpotoronto.com/', source: 'https://sportcardexpotoronto.com/wp-content/x.pdf', edition: 'Spring 2026', captured: '2026-09-29', dealer: 'A', noMatch: false };
    const r = rostersForShow(show, [entry]);
    expect(r).toHaveLength(1);
    expect(r[0]?.source).toBe('https://sportcardexpotoronto.com/wp-content/x.pdf');
  });
  it('ignores a trailing slash difference', () => {
    const r = rostersForShow(show, [e('https://sportcardexpotoronto.com', 'A')]);
    expect(r).toHaveLength(1);
  });
  it('returns [] when nothing matches', () => {
    expect(rostersForShow(show, [e('https://elsewhere.test/', 'Z')])).toEqual([]);
  });
});


describe('claimUrl', () => {
  it('opens the reseller form with name and show pre-filled', () => {
    const u = new URL(claimUrl('Snorwax Cards', 'Sport Card Expo Toronto', 'Spring 2026'));
    expect(`${u.origin}${u.pathname}`).toBe(RESELLER_FORM_URL);
    expect(u.searchParams.get('usp')).toBe('pp_url');
    expect(u.searchParams.get('entry.1276928846')).toBe('Snorwax Cards');
    expect(u.searchParams.get('entry.1802446710')).toBe('Seen at: Sport Card Expo Toronto, Spring 2026');
  });
});

describe('roster column layout and ambiguous names', () => {
  it('a shifted column breaks the mapping instead of leaking into the wrong field', () => {
    const header = ROSTER_HEADER.map((h) => cell(h));
    expect(rowToRosterEntry(header)).toBeNull();
    const data = ROSTER_HEADER.map((h) => cell(h === 'Show URL' || h === 'Source URL' ? 'https://x.example/' : h === 'Captured' ? '2026-09-29' : `v-${h}`));
    expect(rowToRosterEntry(data)?.dealer).toBe('v-Dealer');
    expect(rowToRosterEntry(data)?.booth).toBe('v-Booth');
  });

  it('two shops with the same name match neither, unless Store Slug picks one', () => {
    const mk = (slug: string, city: string): Store => ({ slug, name: 'Big B Comics', city } as unknown as Store);
    const stores = [mk('big-b-comics-barrie', 'Barrie'), mk('big-b-comics-hamilton', 'Hamilton')];
    const base = { dealer: 'BIG B COMICS', noMatch: false } as RosterEntry;
    expect(matchStore(base, stores)).toBeUndefined();
    expect(matchStore({ ...base, storeSlug: 'big-b-comics-hamilton' }, stores)?.city).toBe('Hamilton');
  });
});
