import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { isUpcoming, showScheduleWarning } from '../../src/lib/shows';
import { PROVINCES } from '../../src/lib/types';
import type { ShowRecord } from '../../src/lib/shows';

const records = JSON.parse(readFileSync(new URL('../../src/data/shows.json', import.meta.url), 'utf8')) as ShowRecord[];
const now = new Date();
const eligible = records.find(s => isUpcoming(s, now) && !showScheduleWarning(s) && s.address?.trim());

test('upcoming show offers an address-specific directions action beside source information', async ({ page }) => {
  expect(eligible, 'Run bake:shows before browser tests: an upcoming addressed show is required.').toBeDefined();
  if (!eligible) return;
  await page.goto(`/shows/${eligible.slug}/`);
  const link = page.getByRole('link', { name: 'Directions', exact: true });
  await expect(link).toBeVisible();
  const url = new URL((await link.getAttribute('href'))!);
  expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
  expect(url.searchParams.get('api')).toBe('1');
  const destination = url.searchParams.get('destination');
  expect(destination).toBe(`${eligible.address!.trim()}, ${eligible.city}, ${PROVINCES[eligible.province].name}, Canada`);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener');
  await expect(page.locator('[data-show-travel-notice]')).toContainText('Confirm the date, hours and venue');
  if (eligible.sourceUrl) await expect(page.getByRole('link', { name: 'Source', exact: true })).toHaveAttribute('href', eligible.sourceUrl);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const [label, show] of [
  ['past', records.find(s => !isUpcoming(s, now) && !showScheduleWarning(s) && s.address)],
  ['held', records.find(s => showScheduleWarning(s))],
  ['missing address', records.find(s => isUpcoming(s, now) && !showScheduleWarning(s) && !s.address?.trim())],
] as const) {
  test(`${label} show does not offer directions to an uncertain or unavailable destination`, async ({ page }) => {
    expect(show, `Run bake:shows before browser tests: a ${label} show is required.`).toBeDefined();
    if (!show) return;
    await page.goto(`/shows/${show.slug}/`);
    await expect(page.getByRole('link', { name: 'Directions', exact: true })).toHaveCount(0);
  });
}
