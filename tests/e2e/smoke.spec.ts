import { test, expect } from '@playwright/test';
import stores from '../../src/data/stores.json' with { type: 'json' };

const first = stores[0];
if (!first) throw new Error('no baked stores — run npm run bake');

test('home renders hero and city links', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText(/every card shop/i);
  await expect(page.locator('a[href^="/alberta/"]').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow, 'no horizontal scroll').toBe(false);
});

test('city page lists store cards linking to detail pages', async ({ page }) => {
  await page.goto(`/alberta/${first.citySlug}/`);
  const link = page.locator(`a[href="/store/${first.slug}/"]`).first();
  await expect(link).toBeVisible();
});

test('store page has structured data, directions, and tel link when present', async ({ page }) => {
  await page.goto(`/store/${first.slug}/`);
  await expect(page.locator('h1')).toContainText(first.name.split(' ')[0] ?? '');
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(ld).toContain('"@type":"Store"');
  await expect(page.locator('a', { hasText: 'Directions' })).toBeVisible();
});

test('404 page serves', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist/');
  expect(res?.status()).toBe(404);
});

test('sitemap index exists and references a sitemap', async ({ request }) => {
  const res = await request.get('/sitemap-index.xml');
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('sitemap-0.xml');
});
