import type { GvizRow } from './sheet';
import { sanitizeText } from './transform';
import { httpUrl } from './stores-build';
import { isoDate } from './shows';
import type { ShowRecord } from './shows';
import type { Store } from './types';
import { RESELLER_FORM_ENTRY, RESELLER_FORM_URL } from './forms';

/**
 * One dealer on one public show roster. Seeded from promoters' own published
 * dealer lists, so the only claims we make are the ones the roster made:
 * this name was on this list for this edition. Nothing here is "verified".
 */
export interface RosterEntry {
  /** Roster page or PDF. Joins to ShowRecord.website or sourceUrl. */
  source: string;
  edition: string;
  captured: string;
  dealer: string;
  booth?: string | undefined;
  blurb?: string | undefined;
  link?: string | undefined;
  /** Sheet override. Blank in the sheet means auto-match by name. */
  storeSlug?: string | undefined;
  /** The sheet said '-': this name must never be linked to a shop. */
  noMatch: boolean;
}

// Rosters tab column order (0-based). The header assertion in
// tests/unit/rosters.test.ts fails loudly if a column is inserted.
// The sheet is world-readable: only publishable fields belong in it.
const COL = {
  source: 0, edition: 1, captured: 2, dealer: 3, booth: 4, blurb: 5, link: 6, storeSlug: 7,
} as const;

const BLURB_MAX = 300;

export function rowToRosterEntry(cells: GvizRow): RosterEntry | null {
  const source = httpUrl(cells[COL.source]?.v);
  const edition = sanitizeText(cells[COL.edition]?.v);
  const captured = isoDate(cells[COL.captured]);
  const dealer = sanitizeText(cells[COL.dealer]?.v);
  if (source === undefined || edition === undefined || captured === undefined || dealer === undefined) return null;

  const slugRaw = sanitizeText(cells[COL.storeSlug]?.v);
  const noMatch = slugRaw === '-';

  return {
    source,
    edition,
    captured,
    dealer,
    booth: sanitizeText(cells[COL.booth]?.v),
    blurb: sanitizeText(cells[COL.blurb]?.v)?.slice(0, BLURB_MAX),
    link: httpUrl(cells[COL.link]?.v),
    storeSlug: noMatch ? undefined : slugRaw,
    noMatch,
  };
}


/**
 * Exact-after-normalization only. A wrong link sends a reader to the wrong
 * shop with our name on it; a missing link costs nothing. Anything fuzzier
 * gets decided by a human in the sheet's Store Slug column.
 */
export function normalizeDealerName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(inc|ltd|ltee|llc)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchStore(entry: RosterEntry, stores: readonly Store[]): Store | undefined {
  if (entry.noMatch) return undefined;
  if (entry.storeSlug !== undefined) return stores.find((s) => s.slug === entry.storeSlug);
  const key = normalizeDealerName(entry.dealer);
  if (key === '') return undefined;
  return stores.find((s) => normalizeDealerName(s.name) === key);
}

export interface ShowRoster {
  source: string;
  edition: string;
  captured: string;
  entries: RosterEntry[];
}

const sameUrl = (a: string, b: string): boolean => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

/**
 * Rosters belong to a show through the URL the promoter published them at:
 * the show's website or sourceUrl. Recurring shows share a website across
 * dates, so an annual expo's page shows the last edition's list, labelled as
 * such — "who usually tables here" is the useful answer between editions.
 */
export function rostersForShow(show: ShowRecord, entries: readonly RosterEntry[]): ShowRoster[] {
  const urls = [show.website, show.sourceUrl].filter((u): u is string => u !== undefined);
  const groups = new Map<string, ShowRoster>();
  for (const entry of entries) {
    if (!urls.some((u) => sameUrl(u, entry.source))) continue;
    const key = `${entry.source}\n${entry.edition}`;
    const g = groups.get(key) ?? { source: entry.source, edition: entry.edition, captured: entry.captured, entries: [] };
    g.entries.push(entry);
    groups.set(key, g);
  }
  return [...groups.values()];
}


/** The existing join form, with the dealer's name and where we saw them filled in. */
export function claimUrl(dealer: string, showName: string, edition: string): string {
  const u = new URL(RESELLER_FORM_URL);
  u.searchParams.set('usp', 'pp_url');
  u.searchParams.set(RESELLER_FORM_ENTRY.displayName, dealer);
  u.searchParams.set(RESELLER_FORM_ENTRY.collectAndSell, `Seen at: ${showName}, ${edition}`);
  return u.toString();
}
