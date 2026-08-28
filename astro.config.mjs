// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import redirectMap from './src/data/redirects.json' with { type: 'json' };
import resellersJson from './src/data/resellers.json' with { type: 'json' };
import closedStoresJson from './src/data/stores-closed.json' with { type: 'json' };

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
        return RESELLERS_INDEXABLE || !/\/resellers\/(join\/)?$/.test(path);
      },
    }),
  ],
});
