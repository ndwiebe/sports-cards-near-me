import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import resellersJson from '../../src/data/resellers.json';
import { MIN_RESELLERS_TO_INDEX, resellersTooThinToIndex } from '../../src/lib/resellers';

/**
 * `/resellers/` and `/resellers/join/` returned 200, sat in the sitemap, and read
 * "Verified reseller profiles are coming" — a coming-soon page actively submitted
 * for indexing, which Google's helpful-content guidance calls out. They now carry
 * noindex and leave the sitemap while the network is empty, and reverse themselves
 * once it is seeded, so nobody has to remember to undo a flag.
 */
describe('reseller page indexing', () => {
  it('is thin while empty, and indexable once seeded', () => {
    expect(resellersTooThinToIndex(0)).toBe(true);
    expect(resellersTooThinToIndex(MIN_RESELLERS_TO_INDEX - 1)).toBe(true);
    expect(resellersTooThinToIndex(MIN_RESELLERS_TO_INDEX)).toBe(false);
    expect(resellersTooThinToIndex(50)).toBe(false);
  });

  it('matches the live data — today the network is empty', () => {
    expect((resellersJson as unknown[]).length).toBe(0);
    expect(resellersTooThinToIndex((resellersJson as unknown[]).length)).toBe(true);
  });

  it('both pages ask Base for a conditional noindex, never a hardcoded one', () => {
    for (const f of ['src/pages/resellers/index.astro', 'src/pages/resellers/join/index.astro']) {
      const src = readFileSync(f, 'utf8');
      expect(src, `${f} should pass noindex={thin}`).toContain('noindex={thin}');
      expect(src).toContain('resellersTooThinToIndex');
      // A hardcoded noindex would never come back on once the network is seeded.
      expect(src, `${f} hardcodes noindex`).not.toMatch(/noindex=\{true\}|noindex\s*\/?>/);
    }
  });

  it('the sitemap filter threshold matches the library constant', () => {
    // astro.config.mjs cannot import from src/lib (TS, unbuilt), so the 5 is
    // duplicated there. This test is what stops the two drifting apart.
    const cfg = readFileSync('astro.config.mjs', 'utf8');
    const m = /resellersJson\.length >= (\d+)/.exec(cfg);
    expect(m, 'sitemap filter threshold not found in astro.config.mjs').not.toBeNull();
    expect(Number(m![1])).toBe(MIN_RESELLERS_TO_INDEX);
  });
});
