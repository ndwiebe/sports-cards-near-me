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
  // Store pages now carry three JSON-LD blocks (Store, BreadcrumbList,
  // FAQPage), so a bare locator matches all three and Playwright's strict mode
  // rightly refuses. Assert on the combined set instead of assuming one block.
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = blocks.map((b) => JSON.parse(b)['@type']);
  expect(types).toContain('Store');
  expect(types).toContain('BreadcrumbList');
  expect(types).toContain('FAQPage');
  await expect(page.locator('[data-answer-capsule]')).toBeVisible();
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

test('map island degrades cleanly without a token', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  const shell = page.locator('#map-slot .map-shell');
  await expect(shell).toHaveAttribute('data-map-state', /^(on|off)$/);
  const state = await shell.getAttribute('data-map-state');
  test.skip(state === 'on', 'token present in this build — off-state not exercised');
  await expect(shell).toHaveAttribute('data-map-state', 'off');
  await expect(shell.locator('.map-fallback')).toBeVisible();
  const box = await shell.boundingBox();
  expect(box?.height ?? 0, 'off-state shell collapses instead of leaving a void').toBeLessThan(150);
  expect(errors).toEqual([]);
});

test('city filters narrow the list', async ({ page }) => {
  await page.goto(`/alberta/${first.citySlug}/`);
  const count = page.locator('[data-results-count]');
  const before = Number(await count.textContent());
  await page.locator('[data-filter-search]').fill('zzzz-no-store-matches-this');
  await expect(count).toHaveText('0');
  await page.locator('[data-filter-search]').fill('');
  await expect(count).toHaveText(String(before));
});

test('city tag filter toggles the result count', async ({ page }) => {
  await page.goto('/alberta/edmonton/');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  const count = page.locator('[data-results-count]');
  const initial = Number(await count.textContent());
  const tag = page.locator('[data-filter-tag]').first();

  await tag.click();
  expect(Number(await count.textContent())).toBeLessThanOrEqual(initial);
  await tag.click();
  await expect(count).toHaveText(String(initial));
  expect(errors).toEqual([]);
});

test('mobile map/list toggle switches panels', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 1280) > 500, 'mobile-only behavior');
  await page.goto(`/alberta/${first.citySlug}/`);
  await expect(page.locator('[data-store-list]')).toBeVisible();
  await page.locator('button[data-view="map"]').click();
  await expect(page.locator('[data-store-list]')).toBeHidden();
  await expect(page.locator('[data-city-map]')).toBeVisible();
});

test.describe('nearest shops', () => {
  test.use({ geolocation: { latitude: 53.5461, longitude: -113.4938 }, permissions: ['geolocation'] });
  test('geolocate reveals a nearest-shops list with distances', async ({ page }) => {
    await page.goto('/');
    const shell = page.locator('#map-slot .map-shell');
    await expect(shell).toHaveAttribute('data-map-state', /^(on|off)$/);
    const state = await shell.getAttribute('data-map-state');
    test.skip(state !== 'on', 'geolocate wires with a token build');
    await page.locator('[data-geolocate]').first().click();
    await expect(page.locator('[data-nearest-list] a').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-nearest-list]')).toContainText('km');
  });
});

// The city H1 was literally just the city name ("Toronto") on 248 pages that
// target "card shops in <city>" — Search Console's #2 query is "card shop near
// me". Pin the fix so it can't silently regress to a bare place name.
test('city page H1 names what the page is, not just the city', async ({ page }) => {
  await page.goto(`/alberta/${first.citySlug}/`);
  const h1 = await page.locator('h1').textContent();
  expect(h1).toMatch(/sports card shops in/i);
  expect(h1).toContain(first.city);
});

// "Highest rated" is only shown where a shop actually clears the 20-review bar.
// Where it appears it must name a real shop and link to it; where it doesn't,
// the page must make no ranking claim at all rather than a hedged one.
test('city top-rated module is either a real linked claim or absent', async ({ page }) => {
  await page.goto(`/alberta/${first.citySlug}/`);
  const mod = page.locator('[data-top-rated]');
  if (await mod.count() > 0) {
    await expect(mod.locator('a[href^="/store/"]')).toBeVisible();
    await expect(mod).toContainText('20+ reviews');
    await expect(mod).toContainText('nobody pays');
  } else {
    await expect(page.locator('body')).not.toContainText('Highest rated:');
  }
});
