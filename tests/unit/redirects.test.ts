import { describe, expect, it } from 'vitest';
import redirectMap from '../../src/data/redirects.json';
import storesJson from '../../src/data/stores.json';
import showsJson from '../../src/data/shows.json';
import type { Store } from '../../src/lib/types';
import type { ShowRecord } from '../../src/lib/shows';

const stores = storesJson as Store[];
const shows = showsJson as ShowRecord[];
const liveStoreSlugs = new Set(stores.map((s) => s.slug));
const liveShowSlugs = new Set(shows.map((s) => s.slug));
const liveCityPaths = new Set(stores.map((s) => {
  const provinceSlugs: Record<string, string> = {
    AB: 'alberta', BC: 'british-columbia', MB: 'manitoba', NB: 'new-brunswick',
    NL: 'newfoundland-and-labrador', NS: 'nova-scotia', NT: 'northwest-territories',
    ON: 'ontario', PE: 'prince-edward-island', QC: 'quebec', SK: 'saskatchewan',
  };
  return `/${provinceSlugs[s.province]}/${s.citySlug}/`;
}));

const entries = Object.entries(redirectMap).filter(([from]) => !from.startsWith('_'));

describe('redirect map', () => {
  it('has entries (the slug trap has already fired once in production)', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  // 2026-08-27: this check used to look only at /store/ paths. A Plan-14 redirect keyed
  // on a show's CURRENT slug while the sheet hadn't been re-baked yet — Astro's redirects
  // config wins over the generated page, so the build silently swapped a live show page
  // (one of them that weekend) for a redirect stub. Caught by an Opus review before push,
  // not by this test, because /shows/ paths weren't covered. Extending rather than routing
  // around it, per that review.
  it('never shadows a live page — a redirect from a URL that exists would hide a real shop or show', () => {
    for (const [from] of entries) {
      const storeSlug = from.match(/^\/store\/(.+)\/$/)?.[1];
      if (storeSlug !== undefined) {
        expect(liveStoreSlugs.has(storeSlug), `${from} is a LIVE store page and must not be redirected`).toBe(false);
      }
      const showSlug = from.match(/^\/shows\/(.+)\/$/)?.[1];
      if (showSlug !== undefined) {
        expect(liveShowSlugs.has(showSlug), `${from} is a LIVE show page and must not be redirected`).toBe(false);
      }
    }
  });

  it('every target resolves to a live store, show, or city page — a redirect into a 404 is worse than the 404', () => {
    for (const [from, to] of entries) {
      const storeSlug = (to as string).match(/^\/store\/(.+)\/$/)?.[1];
      const showSlug = (to as string).match(/^\/shows\/(.+)\/$/)?.[1];
      const ok = storeSlug !== undefined
        ? liveStoreSlugs.has(storeSlug)
        : showSlug !== undefined
          ? liveShowSlugs.has(showSlug)
          : liveCityPaths.has(to as string) || to === '/';
      expect(ok, `${from} -> ${to} points at nothing that exists`).toBe(true);
    }
  });

  it('no redirect chains — every hop must land in one step', () => {
    const froms = new Set(entries.map(([from]) => from));
    for (const [from, to] of entries) {
      expect(froms.has(to as string), `${from} -> ${to} would need a second hop`).toBe(false);
    }
  });
});
