import { test, expect } from '@playwright/test';

const NEW_GUIDES = [
  { path: '/guides/beckett-grading-canada/', heading: 'Beckett (BGS) Grading for Canadian Collectors' },
  { path: '/guides/sgc-cgc-grading-canada/', heading: 'SGC & CGC Card Grading for Canadian Collectors' },
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

test('the grading comparison guide links to both new grading guides', async ({ page }) => {
  await page.goto('/guides/card-grading-companies-canada/');
  await expect(page.locator('a[href="/guides/beckett-grading-canada/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/sgc-cgc-grading-canada/"]').first()).toBeVisible();
});

test('the Beckett guide and the SGC/CGC guide cross-link to each other and to the comparison guide', async ({ page }) => {
  await page.goto('/guides/beckett-grading-canada/');
  await expect(page.locator('a[href="/guides/sgc-cgc-grading-canada/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/card-grading-companies-canada/"]').first()).toBeVisible();

  await page.goto('/guides/sgc-cgc-grading-canada/');
  await expect(page.locator('a[href="/guides/beckett-grading-canada/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/card-grading-companies-canada/"]').first()).toBeVisible();
});

test('the guides index lists both new grading guides', async ({ page }) => {
  await page.goto('/guides/');
  await expect(page.locator('a[href="/guides/beckett-grading-canada/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/sgc-cgc-grading-canada/"]').first()).toBeVisible();
});
