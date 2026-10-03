import { test, expect } from '@playwright/test';
test('held Uxbridge page remains reachable without scheduled-event claims', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const response = await page.goto('/shows/uxbridge-sports-card-show-stouffville-2026-10-03/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('alert')).toContainText('Schedule unconfirmed');
  await expect(page.getByRole('alert')).toContainText('verify before travelling');
  await expect(page).toHaveTitle(/Schedule Unconfirmed/);
  expect(await page.locator('script[type="application/ld+json"]').allTextContents()).not.toEqual(expect.arrayContaining([expect.stringContaining('EventScheduled')]));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
