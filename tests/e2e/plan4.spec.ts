import { test, expect } from '@playwright/test';
import shows from '../../src/data/shows.json' with { type: 'json' };

function findUpcoming(buildDate: Date): (typeof shows)[number] | undefined {
  const today = new Date(buildDate.getFullYear(), buildDate.getMonth(), buildDate.getDate());
  return shows.find((s) => {
    const [y, m, d] = (s.endDate ?? s.startDate).split('-').map(Number);
    const end = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
    return end.getTime() >= today.getTime();
  });
}

test('shows index returns 200 and shows an upcoming show or the empty state', async ({ page }) => {
  const res = await page.goto('/shows/');
  expect(res?.status()).toBe(200);
  const upcoming = findUpcoming(new Date());
  if (upcoming) {
    await expect(page.locator('body')).toContainText(upcoming.name);
  } else {
    await expect(page.locator('body')).toContainText('No upcoming shows listed yet');
  }
});

test('nav has a Shows link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href="/shows/"]').first()).toBeVisible();
});

test('show detail page has Event structured data', async ({ page }) => {
  const first = shows[0];
  if (!first) {
    test.skip(true, 'no baked shows');
    return;
  }
  await page.goto(`/shows/${first.slug}/`);
  await expect(page.locator('h1')).toContainText(first.name.split(' ')[0] ?? '');
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(ld).toContain('"@type":"Event"');
});

test('guides index returns 200 with both guide cards', async ({ page }) => {
  const res = await page.goto('/guides/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('a[href="/guides/psa-grading-submissions-canada/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/best-card-shops-alberta/"]').first()).toBeVisible();
});

test('nav has a Guides link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href="/guides/"]').first()).toBeVisible();
});

test('PSA grading guide has an h1 and internal store links', async ({ page }) => {
  const res = await page.goto('/guides/psa-grading-submissions-canada/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();
  const storeLinks = page.locator('a[href^="/store/"]');
  expect(await storeLinks.count()).toBeGreaterThanOrEqual(3);
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(ld).toContain('"@type":"Article"');
});

test('Alberta guide has an h1 and internal store/city links', async ({ page }) => {
  const res = await page.goto('/guides/best-card-shops-alberta/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();
  const storeLinks = page.locator('a[href^="/store/"]');
  const cityLinks = page.locator('a[href^="/alberta/"]');
  expect((await storeLinks.count()) + (await cityLinks.count())).toBeGreaterThanOrEqual(3);
});

test('guides index shows all five guide cards', async ({ page }) => {
  const res = await page.goto('/guides/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('a[href="/guides/your-first-card-show/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/selling-your-collection/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/card-grading-101/"]').first()).toBeVisible();
});

test('first card show guide has an h1, the shows calendar link, and 3+ internal links', async ({ page }) => {
  const res = await page.goto('/guides/your-first-card-show/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('main a[href="/shows/"]').first()).toBeVisible();
  const storeLinks = page.locator('main a[href^="/store/"]');
  const cityLinks = page.locator('main a[href^="/alberta/"], main a[href^="/british-columbia/"], main a[href^="/ontario/"]');
  expect((await storeLinks.count()) + (await cityLinks.count())).toBeGreaterThanOrEqual(3);
  const internalLinks = page.locator('main a[href^="/"]');
  expect(await internalLinks.count()).toBeGreaterThanOrEqual(3);
});

test('selling your collection guide has an h1 and 3+ internal links', async ({ page }) => {
  const res = await page.goto('/guides/selling-your-collection/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();
  const storeLinks = page.locator('main a[href^="/store/"]');
  const cityLinks = page.locator('main a[href^="/alberta/"], main a[href^="/british-columbia/"], main a[href^="/ontario/"]');
  expect((await storeLinks.count()) + (await cityLinks.count())).toBeGreaterThanOrEqual(3);
  const internalLinks = page.locator('main a[href^="/"]');
  expect(await internalLinks.count()).toBeGreaterThanOrEqual(3);
});

test('card grading 101 guide has an h1 and 3+ internal links', async ({ page }) => {
  const res = await page.goto('/guides/card-grading-101/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();
  const internalLinks = page.locator('main a[href^="/"]');
  expect(await internalLinks.count()).toBeGreaterThanOrEqual(3);
});
