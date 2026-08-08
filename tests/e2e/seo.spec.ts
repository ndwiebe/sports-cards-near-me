import { test, expect } from '@playwright/test';
import storesJson from '../../src/data/stores.json' with { type: 'json' };

// Duplicated from src/lib/seo.ts rather than imported: that module does a
// bare `import storesJson from '../data/stores.json'` with no Node import
// attribute, which Vite/Astro accept but Playwright's plain ESM loader
// rejects. tests/e2e/plan4.spec.ts's inline findUpcoming() uses the same
// recompute-don't-import pattern for the equivalent shows.json case.
const MIN_REVIEWS_FOR_TOP = 20;

function parseLd(json: string | null): Record<string, unknown> {
  expect(json, 'ld+json script had content').toBeTruthy();
  return JSON.parse(json ?? '{}') as Record<string, unknown>;
}

test.describe('province page structured data', () => {
  test('has a BreadcrumbList, a city ItemList, a top-shops ItemList, and an FAQPage, all valid JSON', async ({ page }) => {
    await page.goto('/alberta/');
    const scripts = page.locator('script[type="application/ld+json"]');
    const bodies = await scripts.allTextContents();
    const parsed = bodies.map((b) => parseLd(b));

    // Assert on the SET of @type values present rather than a raw script
    // count: the top-shops ItemList only renders once a shop clears the
    // review bar, so a bare count would fail with a confusing mismatch
    // instead of pointing at that as the cause if Alberta's data ever falls
    // below it.
    const types = new Set(parsed.map((p) => p['@type']));
    expect(types).toEqual(new Set(['BreadcrumbList', 'ItemList', 'FAQPage']));

    const breadcrumb = parsed.find((p) => p['@type'] === 'BreadcrumbList');
    const itemLists = parsed.filter((p) => p['@type'] === 'ItemList');
    const faqPage = parsed.find((p) => p['@type'] === 'FAQPage');
    expect(breadcrumb).toBeTruthy();
    expect(faqPage).toBeTruthy();

    // How many ItemLists render is itself data-dependent (city list always,
    // top-shops list only once a shop clears the review bar) — compute the
    // expected count from the live data the same way the page does, rather
    // than hardcoding it.
    const hasTopShops = (storesJson as { province: string; rating?: number; reviewCount?: number }[]).some(
      (s) => s.province === 'AB' && s.rating !== undefined && (s.reviewCount ?? 0) >= MIN_REVIEWS_FOR_TOP,
    );
    expect(itemLists).toHaveLength(hasTopShops ? 2 : 1);

    const items = breadcrumb?.['itemListElement'] as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[1]?.['name']).toBe('Alberta');

    const questions = faqPage?.['mainEntity'] as Array<Record<string, unknown>>;
    expect(questions).toHaveLength(4);
  });

  test('renders a computed answer capsule', async ({ page }) => {
    await page.goto('/alberta/');
    const capsule = page.locator('[data-answer-capsule]');
    await expect(capsule).toBeVisible();
    await expect(capsule).toContainText('Alberta');
  });

  // "Highest-Ranked", not "Top-Rated": the ranking is a weighted score (Bayesian +
  // review volume), so the first-ranked shop is routinely NOT the highest star
  // rating — Alberta's is a 4.7 while 5.0s clear the same bar. Asserting the
  // heading text here also pins the wording that a 2026-08-08 review found
  // shipping a false claim into FAQ structured data.
  test('surfaces the province\'s highest-ranked shops, not just a city list', async ({ page }) => {
    await page.goto('/alberta/');
    await expect(page.getByRole('heading', { name: 'Highest-Ranked Shops in Alberta', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Top-Rated Shops/, level: 2 })).toHaveCount(0);
  });

  test('renders a server-rendered FAQ section matching the JSON-LD question count', async ({ page }) => {
    await page.goto('/alberta/');
    await expect(page.getByRole('heading', { name: 'FAQ', level: 2 })).toBeVisible();
    const questions = page.locator('dl dt');
    await expect(questions).toHaveCount(4);
  });
});

test.describe('city page structured data', () => {
  test('has exactly BreadcrumbList, ItemList, and FAQPage, all valid JSON', async ({ page }) => {
    await page.goto('/alberta/calgary/');
    const scripts = page.locator('script[type="application/ld+json"]');
    await expect(scripts).toHaveCount(3);

    const bodies = await scripts.allTextContents();
    const parsed = bodies.map((b) => parseLd(b));
    const breadcrumb = parsed.find((p) => p['@type'] === 'BreadcrumbList');
    const itemList = parsed.find((p) => p['@type'] === 'ItemList');
    const faqPage = parsed.find((p) => p['@type'] === 'FAQPage');
    expect(breadcrumb).toBeTruthy();
    expect(itemList).toBeTruthy();
    expect(faqPage).toBeTruthy();

    const crumbs = breadcrumb?.['itemListElement'] as Array<Record<string, unknown>>;
    expect(crumbs).toHaveLength(3);
    expect(crumbs[0]?.['name']).toBe('Home');
    expect(crumbs[1]?.['name']).toBe('Alberta');
    expect(crumbs[2]?.['name']).toBe('Calgary');

    const questions = faqPage?.['mainEntity'] as Array<Record<string, unknown>>;
    expect(questions).toHaveLength(3);
  });

  test('renders a computed answer capsule element', async ({ page }) => {
    await page.goto('/alberta/calgary/');
    const capsule = page.locator('[data-answer-capsule]');
    await expect(capsule).toBeVisible();
    await expect(capsule).toContainText('Calgary');
  });

  test('renders a server-rendered FAQ section matching the JSON-LD question count', async ({ page }) => {
    await page.goto('/alberta/calgary/');
    await expect(page.getByRole('heading', { name: 'FAQ', level: 2 })).toBeVisible();
    const questions = page.locator('dl dt');
    await expect(questions).toHaveCount(3);
  });

  test('shows the daily-refresh disclosure line', async ({ page }) => {
    await page.goto('/alberta/calgary/');
    await expect(page.getByText('Directory data refreshed daily.')).toBeVisible();
  });
});
