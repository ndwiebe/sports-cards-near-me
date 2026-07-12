import { expect, test } from '@playwright/test';

test('resellers index renders program explainer or reseller cards', async ({ page }) => {
  const res = await page.goto('/resellers/');
  expect(res?.status()).toBe(200);
  const hasCards = await page.locator('[data-reseller-card]').count();
  if (hasCards === 0) {
    await expect(page.getByText('Verified reseller profiles are coming')).toBeVisible();
  } else {
    await expect(page.locator('[data-reseller-card]').first()).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Become a Verified Reseller' })).toBeVisible();
});

test('nav carries the Resellers link on other pages', async ({ page }) => {
  await page.goto('/guides/');
  await expect(page.locator('header nav a[href="/resellers/"]')).toBeVisible();
});

test('join page explains the bar and offers an application path', async ({ page }) => {
  const res = await page.goto('/resellers/join/');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Become a Verified Reseller' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open the application form|Apply by email/ })).toBeVisible();
});
