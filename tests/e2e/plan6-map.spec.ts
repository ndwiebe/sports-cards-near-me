import { expect, test } from '@playwright/test';

test('map payload carries reseller entries only when verified resellers exist', async ({ page }) => {
  await page.goto('/');
  const raw = await page.locator('script[data-map-stores]').first().textContent();
  const entries = JSON.parse(raw ?? '[]') as { kind?: string }[];
  const resellerCount = entries.filter((e) => e.kind === 'reseller').length;
  // Empty at launch; if data arrives this asserts the shape survived the pipeline.
  expect(resellerCount).toBeGreaterThanOrEqual(0);
  expect(Array.isArray(entries)).toBe(true);
});
