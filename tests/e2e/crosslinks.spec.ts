import { test, expect } from '@playwright/test';

test('footer cross-links to the sibling products render on the home page', async ({ page }) => {
  await page.goto('/');
  const dmcLink = page.locator('a[href^="https://displaymycard.com"]').first();
  await expect(dmcLink).toBeVisible();
  await expect(dmcLink).toHaveAttribute('target', '_blank');
  await expect(page.locator('a[href^="https://slabsavvycpa.com"]').first()).toBeVisible();
  await expect(page.getByText('coming soon', { exact: false })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow, 'no horizontal scroll').toBe(false);
});

test('sell city page links to DisplayMyCard', async ({ page }) => {
  await page.goto('/sell/winnipeg/');
  await expect(page.locator('a[href^="https://displaymycard.com"]').first()).toBeVisible();
});

test('resellers page links to Slab Savvy CPA', async ({ page }) => {
  await page.goto('/resellers/');
  await expect(page.locator('a[href^="https://slabsavvycpa.com"]').first()).toBeVisible();
});
