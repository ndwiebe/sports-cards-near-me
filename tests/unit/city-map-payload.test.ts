import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const cityPage = readFileSync(
  new URL('../../src/pages/[province]/[city]/index.astro', import.meta.url),
  'utf8',
);

it('reads the store payload from the city map island', () => {
  expect(cityPage).toMatch(
    /const mapShell = document\.querySelector<HTMLElement>\('\[data-city-map\] \.map-shell'\);\s+const raw = mapShell\?\.querySelector\('script\[data-map-stores\]'\)/,
  );
  expect(cityPage).not.toContain("document.querySelector('script[data-map-stores]')");
});
