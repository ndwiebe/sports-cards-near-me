import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const readSource = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), 'utf8');

it('adds noindex robots metadata to the 404 page only', () => {
  const layout = readSource('../../src/layouts/Base.astro');
  const notFoundPage = readSource('../../src/pages/404.astro');
  const homePage = readSource('../../src/pages/index.astro');

  expect(layout).toMatch(/noindex\s*&&\s*<meta name="robots" content="noindex" \/>/);
  expect(notFoundPage).toMatch(/<Base\b[^>]*\bnoindex\b[^>]*>/);
  expect(homePage).not.toMatch(/<Base\b[^>]*\bnoindex\b[^>]*>/);
});
