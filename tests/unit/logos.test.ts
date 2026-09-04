import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import logoSlugs from '../../src/data/logos.json';
import storesJson from '../../src/data/stores.json';
import closedStoresJson from '../../src/data/stores-closed.json';
import logosRejected from '../../src/data/logos-rejected.json';
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

  // Was an allowance for 11 stale entries left by city-slug renames. Cleared
  // 2026-08-28: 5 were renames whose shop still exists (the file was moved, so
  // those shops got their logo back) and 6 were shops no longer in the directory
  // (deleted). No allowance now — any orphan is a real failure.
  it('every slug in logos.json matches a store in stores.json or stores-closed.json', () => {
    const unmatched = (logoSlugs as string[]).filter((slug) => !allSlugs.has(slug));
    expect(unmatched, 'logos.json entry pointing at no store — a rename or a removal').toEqual([]);
  });

  // A floor, not an exact count: the number moves whenever a shop is added,
  // removed or rescraped, and pinning it exactly makes routine data work fail a
  // test for no reason. The point is catching a placeholder or a partial scrape.
  it('has a real set of logo chips, not a placeholder or a partial scrape', () => {
    expect(logoSlugs.length).toBeGreaterThan(300);
    expect(logoFiles.length).toBe(logoSlugs.length);
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

// logos-rejected.json is the only place a human "no, that's not a real logo" judgement
// survives -- scripts/scrape-logos.py rewrites logos.json from whatever is on disk, so a
// hand-deleted file alone is silently re-downloaded on the next run.
//
// Note what is deliberately NOT asserted here: that a rejected slug is absent from
// logos.json. Rejections are keyed on (slug, source URL), not slug, precisely so a shop
// whose bad candidate was refused can still get a good logo from a different URL. That
// happened for real on 2026-09-03 -- gamesland-canada-edmonton and
// imperial-garden-sports-collectibles-grande-prairie both had a sliced 32px icon rejected,
// and the scraper then fell through to the shop's proper og:image wordmark. Failing on
// "slug in both files" would have thrown away the better logo to satisfy the rule.
describe('logos-rejected.json', () => {
  const entries = logosRejected.rejected as Array<{
    slug: string;
    url: string;
    reason: string;
    date: string;
  }>;

  it('every rejection carries the four fields the scraper and a future human both need', () => {
    const incomplete = entries.filter(
      (r) => !r.slug?.trim() || !r.url?.trim() || !r.reason?.trim() || !r.date?.trim(),
    );
    expect(incomplete).toEqual([]);
  });

  it('rejects are keyed on a real shop, so a renamed slug surfaces instead of silently rotting', () => {
    const known = new Set(
      [...(storesJson as Store[]), ...(closedStoresJson as Store[])].map((s) => s.slug),
    );
    expect(entries.map((r) => r.slug).filter((slug) => !known.has(slug))).toEqual([]);
  });

  it('holds no duplicate slug+url pairs', () => {
    const keys = entries.map((r) => `${r.slug}\u0000${r.url}`);
    expect(keys.length).toBe(new Set(keys).size);
  });
});
