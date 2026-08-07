// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import redirectMap from './src/data/redirects.json' with { type: 'json' };

// Old published URLs -> current homes. Slugs derive from name+city, so a rename,
// city correction, or duplicate removal silently kills a URL Google has indexed
// (21 of them existed by 2026-08-07, one screenshotted live as a 404). On a
// static build Astro emits these as meta-refresh pages with a canonical link,
// which is the redirect GitHub Pages can serve.
const redirects = Object.fromEntries(
  Object.entries(redirectMap).filter(([from]) => !from.startsWith('_')),
);

export default defineConfig({
  site: 'https://sportscardsnearme.ca',

  redirects,

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [sitemap()],
});
