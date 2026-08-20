import { test, expect } from '@playwright/test';

const NEW_GUIDES = [
  { path: '/guides/are-you-running-a-card-business/', heading: 'Are You Running a Card Business, or Just Collecting?' },
  { path: '/guides/sports-card-tax-deductions-canada/', heading: 'What Can You Deduct When You Sell Sports Cards in Canada?' },
  { path: '/guides/record-keeping-for-card-sellers/', heading: 'Record-Keeping for Canadian Card Sellers: What CRA Actually Wants' },
];

for (const guide of NEW_GUIDES) {
  test(`${guide.path} renders with structured data and a Slab Savvy CPA callout`, async ({ page }) => {
    await page.goto(guide.path);
    await expect(page.getByRole('heading', { name: guide.heading, level: 1 })).toBeVisible();

    const scripts = page.locator('script[type="application/ld+json"]');
    const bodies = await scripts.allTextContents();
    const types = new Set(bodies.map((b) => (JSON.parse(b) as { '@type': string })['@type']));
    expect(types).toEqual(new Set(['BreadcrumbList', 'Article', 'FAQPage']));

    await expect(page.locator('a[href="https://slabsavvycpa.com"]').first()).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, 'no horizontal scroll').toBe(false);
  });
}

test('the main tax guide now links to all three new cluster guides and to Slab Savvy CPA', async ({ page }) => {
  await page.goto('/guides/tax-on-selling-sports-cards-canada/');
  await expect(page.locator('a[href="/guides/are-you-running-a-card-business/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/sports-card-tax-deductions-canada/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/record-keeping-for-card-sellers/"]').first()).toBeVisible();
  await expect(page.locator('a[href="https://slabsavvycpa.com"]').first()).toBeVisible();
});

test('the About page links to Slab Savvy CPA', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.locator('a[href="https://slabsavvycpa.com"]').first()).toBeVisible();
});

test('the guides index lists all three new guides', async ({ page }) => {
  await page.goto('/guides/');
  await expect(page.locator('a[href="/guides/are-you-running-a-card-business/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/sports-card-tax-deductions-canada/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/record-keeping-for-card-sellers/"]').first()).toBeVisible();
});
