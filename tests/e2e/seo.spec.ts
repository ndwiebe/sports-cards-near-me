import { test, expect } from '@playwright/test';

function parseLd(json: string | null): Record<string, unknown> {
  expect(json, 'ld+json script had content').toBeTruthy();
  return JSON.parse(json ?? '{}') as Record<string, unknown>;
}

test.describe('province page structured data', () => {
  test('has a BreadcrumbList, a city ItemList, a top-shops ItemList, and an FAQPage, all valid JSON', async ({ page }) => {
    await page.goto('/alberta/');
    const scripts = page.locator('script[type="application/ld+json"]');
    await expect(scripts).toHaveCount(4);

    const bodies = await scripts.allTextContents();
    const parsed = bodies.map((b) => parseLd(b));
    const breadcrumb = parsed.find((p) => p['@type'] === 'BreadcrumbList');
    const itemLists = parsed.filter((p) => p['@type'] === 'ItemList');
    const faqPage = parsed.find((p) => p['@type'] === 'FAQPage');
    expect(breadcrumb).toBeTruthy();
    expect(itemLists).toHaveLength(2);
    expect(faqPage).toBeTruthy();

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

  test('surfaces the province\'s top-rated shops, not just a city list', async ({ page }) => {
    await page.goto('/alberta/');
    await expect(page.getByRole('heading', { name: 'Top-Rated Shops in Alberta', level: 2 })).toBeVisible();
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
