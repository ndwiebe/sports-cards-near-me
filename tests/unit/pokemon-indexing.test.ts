import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import storesJson from '../../src/data/stores.json';
import type { Store } from '../../src/lib/types';
import { MIN_POKEMON_SHOPS_TO_INDEX, pokemonCityEntries, pokemonShopsInCity } from '../../src/lib/tcg';

/**
 * PRD Phase 3 (2026-09-23): "Stop Google indexing (noindex) Pokémon city
 * pages with only one shop, the same doorway-page rule used for city pages."
 * Same shape as tests/unit/resellers-indexing.test.ts.
 */
describe('Pokémon city page indexing', () => {
  it('the page source asks Base for a conditional noindex, never a hardcoded one', () => {
    const f = 'src/pages/pokemon/[city]/index.astro';
    const src = readFileSync(f, 'utf8');
    expect(src, `${f} should pass noindex={thin}`).toContain('noindex={thin}');
    expect(src).toContain('pokemonCityTooThinToIndex');
    // A hardcoded noindex would never come back on once a second shop is added.
    expect(src, `${f} hardcodes noindex`).not.toMatch(/noindex=\{true\}|noindex\s*\/?>/);
  });

  it('the sitemap filter threshold matches the library constant', () => {
    // astro.config.mjs cannot import from src/lib (TS, unbuilt), so the 2 is
    // duplicated there. This test is what stops the two drifting apart.
    const cfg = readFileSync('astro.config.mjs', 'utf8');
    const m = /MIN_POKEMON_SHOPS_TO_INDEX = (\d+)/.exec(cfg);
    expect(m, 'sitemap filter threshold not found in astro.config.mjs').not.toBeNull();
    expect(Number(m![1])).toBe(MIN_POKEMON_SHOPS_TO_INDEX);
  });

  it('at least one real Pokémon city has exactly one shop, so the guard is live, not theoretical', () => {
    const stores = storesJson as Store[];
    const entries = pokemonCityEntries(stores);
    const singleShopCities = entries.filter(
      (e) => pokemonShopsInCity(stores, e.provinceCode, e.citySlug).length < MIN_POKEMON_SHOPS_TO_INDEX,
    );
    expect(singleShopCities.length).toBeGreaterThan(0);
  });
});
