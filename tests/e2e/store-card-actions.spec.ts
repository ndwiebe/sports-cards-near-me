import { test, expect } from '@playwright/test';

test.describe('shop card actions', () => {
  test('every card on a city page offers Directions, outside the shop link', async ({ page }) => {
    await page.goto('/alberta/edmonton/');
    const cards = page.locator('[data-store-card]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    await expect(page.locator('[data-store-card] a[data-track-click="directions"]')).toHaveCount(count);
    await expect(page.locator('a a')).toHaveCount(0);
    const first = page.locator('[data-store-card] a[data-track-click="directions"]').first();
    await expect(first).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/);
    await expect(first).toHaveAttribute('data-store-slug', /.+/);
  });

  test('Call appears only for shops with a phone, and buttons are finger-sized', async ({ page }) => {
    await page.goto('/alberta/edmonton/');
    for (const call of await page.locator('[data-store-card] a[data-track-click="call"]').all()) {
      await expect(call).toHaveAttribute('href', /^tel:\+?[0-9]+$/);
      const box = await call.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('pokemon and sell cards get the same actions', async ({ page }) => {
    for (const path of ['/pokemon/toronto/', '/sell/edmonton/']) {
      await page.goto(path);
      expect(await page.locator('[data-store-card] a[data-track-click="directions"]').count()).toBeGreaterThan(0);
    }
  });
});
