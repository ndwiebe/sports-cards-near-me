import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const baked = JSON.parse(readFileSync('src/data/resellers.json', 'utf8')) as unknown[];

test('map payload parses; reseller entries have valid coords and never exceed baked data', async ({ page }) => {
  await page.goto('/');
  const raw = await page.locator('script[data-map-stores]').first().textContent();
  const entries = JSON.parse(raw ?? '[]') as { kind?: string; lat?: number; lng?: number }[];
  expect(entries.length).toBeGreaterThan(0); // stores are always present
  const resellers = entries.filter((e) => e.kind === 'reseller');
  expect(resellers.length).toBeLessThanOrEqual(baked.length);
  for (const e of resellers) {
    expect(typeof e.lat).toBe('number');
    expect(typeof e.lng).toBe('number');
  }
});
