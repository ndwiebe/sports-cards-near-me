import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import logoSlugs from '../../src/data/logos.json';
import storesJson from '../../src/data/stores.json';
import closedStoresJson from '../../src/data/stores-closed.json';
import type { Store } from '../../src/lib/types';
import { LOGO_SLUGS, hasLogo } from '../../src/lib/logos';

// Cards and store pages render <img src={`/logos/${slug}.webp`}> at build time with
// no client-side fallback (unlike the map pins, which are client-rendered and need
// one) — a broken image is only impossible if this three-way parity actually holds:
// every listed slug has a file, every file is listed, and every slug is a real store.
// This test IS the graceful-degradation guarantee the design note relies on.
const logoFiles = readdirSync('public/logos')
  .filter((f) => f.endsWith('.webp'))
  .map((f) => f.replace(/\.webp$/, ''));

const allSlugs = new Set([
  ...(storesJson as Store[]).map((s) => s.slug),
  ...(closedStoresJson as Store[]).map((s) => s.slug),
]);

// scrape-logos.py runs offline (not in CI) and rewrites logos.json from
// stores.json's slugs at scrape time. A sheet edit since the last run — a
// city correction that changes a slug, or a store removed entirely — can
// leave a stale entry with no live store. Confirmed against real data
// 2026-08-28: these are renames (e.g. common-box-games-beaumont is now
// common-box-games-edmonton) or removals, not typos. Harmless in practice —
// StoreCard/store pages only render an <img> for a slug a REAL store
// actually has, so a stale entry never produces a broken image — but it's
// out of this workstream's reach: fixing it means re-running scrape-logos.py
// or editing logos.json, both off-limits here. Documented instead of hidden
// so it doesn't silently grow: anything stale beyond this list still fails.
const KNOWN_STALE_LOGO_SLUGS = new Set([
  'common-box-games-beaumont',
  'froggers-house-of-cards-and-autograph-gallery-edmonton',
  'game-breakers-sports-cards-collectibles-ottawa',
  'hallmark-cards-gifts-sault-ste-marie',
  'krown-the-shine-shop-timmins',
  'lakeland-sports-cards-cold-lake',
  'much-hobby-online-shopping-markham',
  'overtime-sports-cards-grading-calgary',
  'taps-games-beaumont',
  'the-card-goat-lethbridge',
  'yeg-nhlhockeystickers-com-beaumont',
]);

describe('logos.json <-> public/logos/*.webp <-> stores', () => {
  it('every slug in logos.json has a matching file in public/logos/', () => {
    const fileSet = new Set(logoFiles);
    const missing = (logoSlugs as string[]).filter((slug) => !fileSet.has(slug));
    expect(missing).toEqual([]);
  });

  it('every file in public/logos/ has a logos.json entry', () => {
    const listed = new Set(logoSlugs as string[]);
    const orphaned = logoFiles.filter((slug) => !listed.has(slug));
    expect(orphaned).toEqual([]);
  });

  it('every slug in logos.json matches a store in stores.json or stores-closed.json, beyond the known-stale set', () => {
    const unmatched = (logoSlugs as string[]).filter((slug) => !allSlugs.has(slug));
    const unexpected = unmatched.filter((slug) => !KNOWN_STALE_LOGO_SLUGS.has(slug));
    expect(unexpected, 'new stale logos.json entry not covered by KNOWN_STALE_LOGO_SLUGS').toEqual([]);
  });

  it('has 332 real logo chips, not a placeholder or a partial scrape', () => {
    expect(logoSlugs.length).toBe(332);
    expect(logoFiles.length).toBe(332);
  });
});

describe('hasLogo / LOGO_SLUGS', () => {
  it('hasLogo mirrors the raw slug list', () => {
    for (const slug of logoSlugs as string[]) expect(hasLogo(slug)).toBe(true);
    expect(hasLogo('not-a-real-shop-slug')).toBe(false);
  });

  it('LOGO_SLUGS has the same size as logos.json (no duplicates hiding a mismatch)', () => {
    expect(LOGO_SLUGS.size).toBe((logoSlugs as string[]).length);
  });
});
