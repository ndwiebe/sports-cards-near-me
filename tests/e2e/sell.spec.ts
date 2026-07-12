import { test, expect } from '@playwright/test';

function parseLd(json: string | null): Record<string, unknown> {
  expect(json, 'ld+json script had content').toBeTruthy();
  return JSON.parse(json ?? '{}') as Record<string, unknown>;
}

test.describe('sell hub page', () => {
  test('responds 200 with the hub H1 and at least one city link', async ({ page }) => {
    const response = await page.goto('/sell/');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Sell Your Sports Cards in Canada', level: 1 })).toBeVisible();

    const cityLinks = page.locator('a[href^="/sell/"]:not([href="/sell/"])');
    expect(await cityLinks.count()).toBeGreaterThan(0);
  });

  test('renders a computed answer capsule', async ({ page }) => {
    await page.goto('/sell/');
    await expect(page.locator('[data-answer-capsule]')).toBeVisible();
  });
});

test.describe('sell city page (Winnipeg)', () => {
  test('responds 200 with the city H1 and at least one store link', async ({ page }) => {
    const response = await page.goto('/sell/winnipeg/');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Sell Sports Cards in Winnipeg', level: 1 })).toBeVisible();

    const storeLinks = page.locator('a[href^="/store/"]');
    expect(await storeLinks.count()).toBeGreaterThan(0);
  });

  test('renders a computed answer capsule', async ({ page }) => {
    await page.goto('/sell/winnipeg/');
    const capsule = page.locator('[data-answer-capsule]');
    await expect(capsule).toBeVisible();
    await expect(capsule).toContainText('Winnipeg');
  });

  test('has exactly BreadcrumbList, ItemList, and FAQPage, all valid JSON, with 3 FAQ questions', async ({ page }) => {
    await page.goto('/sell/winnipeg/');
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

    const questions = faqPage?.['mainEntity'] as Array<Record<string, unknown>>;
    expect(questions).toHaveLength(3);
  });

  test('renders a server-rendered FAQ section matching the JSON-LD question count', async ({ page }) => {
    await page.goto('/sell/winnipeg/');
    await expect(page.getByRole('heading', { name: 'FAQ', level: 2 })).toBeVisible();
    await expect(page.locator('dl dt')).toHaveCount(3);
  });
});
