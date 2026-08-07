import { describe, expect, it } from 'vitest';
import redirectMap from '../../src/data/redirects.json';
import storesJson from '../../src/data/stores.json';
import type { Store } from '../../src/lib/types';

const stores = storesJson as Store[];
const liveStoreSlugs = new Set(stores.map((s) => s.slug));
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

  it('never shadows a live page — a redirect from a URL that exists would hide a real shop', () => {
    for (const [from] of entries) {
      const slug = from.match(/^\/store\/(.+)\/$/)?.[1];
      if (slug !== undefined) {
        expect(liveStoreSlugs.has(slug), `${from} is a LIVE store page and must not be redirected`).toBe(false);
      }
    }
  });

  it('every target resolves to a live store or city page — a redirect into a 404 is worse than the 404', () => {
    for (const [from, to] of entries) {
      const storeSlug = (to as string).match(/^\/store\/(.+)\/$/)?.[1];
      const ok = storeSlug !== undefined
        ? liveStoreSlugs.has(storeSlug)
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
