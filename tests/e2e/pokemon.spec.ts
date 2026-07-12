import { test, expect } from '@playwright/test';

function parseLd(json: string | null): Record<string, unknown> {
  expect(json, 'ld+json script had content').toBeTruthy();
  return JSON.parse(json ?? '{}') as Record<string, unknown>;
}

test.describe('pokemon hub page', () => {
  test('loads with an H1 and at least one city link', async ({ page }) => {
    const response = await page.goto('/pokemon/');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pokémon');
    const cityLinks = page.locator('a[href^="/pokemon/"]:not([href="/pokemon/"])');
    expect(await cityLinks.count()).toBeGreaterThan(0);
  });
});

test.describe('pokemon city page (Toronto)', () => {
  test('loads with H1, at least one store link, answer capsule, and valid structured data', async ({ page }) => {
    const response = await page.goto('/pokemon/toronto/');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pokémon');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Toronto');

    const storeLinks = page.locator('a[href^="/store/"]');
    expect(await storeLinks.count()).toBeGreaterThan(0);

    const capsule = page.locator('[data-answer-capsule]');
    await expect(capsule).toBeVisible();
    await expect(capsule).toContainText('Toronto');

    const scripts = page.locator('script[type="application/ld+json"]');
    await expect(scripts).toHaveCount(3);
    const bodies = await scripts.allTextContents();
    const parsed = bodies.map((b) => parseLd(b));

    const faqPage = parsed.find((p) => p['@type'] === 'FAQPage');
    expect(faqPage).toBeTruthy();
    const questions = faqPage?.['mainEntity'] as Array<Record<string, unknown>>;
    expect(questions).toHaveLength(3);

    expect(parsed.find((p) => p['@type'] === 'BreadcrumbList')).toBeTruthy();
    expect(parsed.find((p) => p['@type'] === 'ItemList')).toBeTruthy();
  });
});
