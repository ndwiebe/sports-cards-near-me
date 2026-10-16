// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import redirectMap from './src/data/redirects.json' with { type: 'json' };
import resellersJson from './src/data/resellers.json' with { type: 'json' };
import closedStoresJson from './src/data/stores-closed.json' with { type: 'json' };
import storesJson from './src/data/stores.json' with { type: 'json' };
import showsJson from './src/data/shows.json' with { type: 'json' };

// Old published URLs -> current homes. Slugs derive from name+city, so a rename,
// city correction, or duplicate removal silently kills a URL Google has indexed
// (21 of them existed by 2026-08-07, one screenshotted live as a 404). On a
// static build Astro emits these as meta-refresh pages with a canonical link,
// which is the redirect GitHub Pages can serve.
const redirects = Object.fromEntries(
  Object.entries(redirectMap).filter(([from]) => !from.startsWith('_')),
);

// Keep the coming-soon reseller pages out of the sitemap while the network is
// empty. They still carry noindex and stay reachable for people — this just stops
// us actively submitting a page that says "profiles are coming" for indexing.
// Mirrors MIN_RESELLERS_TO_INDEX in src/lib/resellers.ts; kept as a literal here
// because astro.config.mjs cannot import from src/lib (TS, not built yet).
const RESELLERS_INDEXABLE = resellersJson.length >= 5;

const CLOSED_STORE_PATHS = new Set(closedStoresJson.map((s) => `/store/${s.slug}/`));

// PRD Phase 3 (2026-09-23): a Pokémon city page with exactly one shop is the
// same doorway-page shape as a thin general city page — noindex it, drop it
// from the sitemap, same as the closed-store rule above. Mirrors
// pokemonCityTooThinToIndex/MIN_POKEMON_SHOPS_TO_INDEX in src/lib/tcg.ts; kept
// as a literal here for the same reason RESELLERS_INDEXABLE is: astro.config.mjs
// cannot import from src/lib (TS, not built yet). Grouped by citySlug only,
// matching how the page itself resolves Astro.params.city.
const MIN_POKEMON_SHOPS_TO_INDEX = 2;
const pokemonShopCountByCitySlug = new Map();
for (const s of storesJson) {
  const tags = [...(s.services ?? []), ...(s.sports ?? [])].map((t) => String(t).trim().toLowerCase());
  if (!tags.includes('pokemon')) continue;
  pokemonShopCountByCitySlug.set(s.citySlug, (pokemonShopCountByCitySlug.get(s.citySlug) ?? 0) + 1);
}
const THIN_POKEMON_CITY_PATHS = new Set(
  [...pokemonShopCountByCitySlug.entries()]
    .filter(([, count]) => count < MIN_POKEMON_SHOPS_TO_INDEX)
    .map(([citySlug]) => `/pokemon/${citySlug}/`),
);

// Province show calendars with fewer than MIN_SHOWS_TO_INDEX_PROVINCE_HUB shows
// are noindexed (doorway rule — see src/lib/shows.ts); keep them out of the
// sitemap too. Literals for the same reason as above. The slug table mirrors
// PROVINCES in src/lib/types.ts; a province missing from it is simply never
// filtered, which errs toward submitting the page, not hiding it.
const MIN_SHOWS_TO_INDEX_PROVINCE_HUB = 3;
const PROVINCE_SLUGS = {
  AB: 'alberta', BC: 'british-columbia', MB: 'manitoba', NB: 'new-brunswick',
  NL: 'newfoundland-and-labrador', NS: 'nova-scotia', NT: 'northwest-territories', ON: 'ontario',
  PE: 'prince-edward-island', QC: 'quebec', SK: 'saskatchewan', YT: 'yukon',
};
const showCountByProvince = new Map();
for (const s of showsJson) showCountByProvince.set(s.province, (showCountByProvince.get(s.province) ?? 0) + 1);
const THIN_PROVINCE_SHOW_HUB_PATHS = new Set(
  [...showCountByProvince.entries()]
    .filter(([code, count]) => count < MIN_SHOWS_TO_INDEX_PROVINCE_HUB && code in PROVINCE_SLUGS)
    .map(([code]) => `/shows/${PROVINCE_SLUGS[code]}/`),
);

export default defineConfig({
  site: 'https://sportscardsnearme.ca',

  redirects,

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    // Closed shops keep a reachable page but are not submitted for indexing — the
    // page carries noindex, and a sitemap entry would be us actively asking Google
    // to index a shop we know has shut. Same shape as the reseller rule above.
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        if (CLOSED_STORE_PATHS.has(path)) return false;
        if (THIN_POKEMON_CITY_PATHS.has(path)) return false;
        if (THIN_PROVINCE_SHOW_HUB_PATHS.has(path)) return false;
        return RESELLERS_INDEXABLE || !/\/resellers\/(join\/)?$/.test(path);
      },
    }),
  ],
});
