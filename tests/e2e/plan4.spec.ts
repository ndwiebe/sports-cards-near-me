import { test, expect } from '@playwright/test';
import shows from '../../src/data/shows.json' with { type: 'json' };

function findUpcoming(buildDate: Date): (typeof shows)[number] | undefined {
  const today = new Date(buildDate.getFullYear(), buildDate.getMonth(), buildDate.getDate());
  return shows.find((s) => {
    const [y, m, d] = (s.endDate ?? s.startDate).split('-').map(Number);
    const end = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
    return end.getTime() >= today.getTime();
  });
}

test('shows index returns 200 and shows an upcoming show or the empty state', async ({ page }) => {
  const res = await page.goto('/shows/');
  expect(res?.status()).toBe(200);
  const upcoming = findUpcoming(new Date());
  if (upcoming) {
    await expect(page.locator('body')).toContainText(upcoming.name);
  } else {
    await expect(page.locator('body')).toContainText('No upcoming shows listed yet');
  }
});

test('nav has a Shows link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href="/shows/"]').first()).toBeVisible();
});

test('show detail page has Event structured data', async ({ page }) => {
  const first = shows[0];
  if (!first) {
    test.skip(true, 'no baked shows');
    return;
  }
  await page.goto(`/shows/${first.slug}/`);
  await expect(page.locator('h1')).toContainText(first.name.split(' ')[0] ?? '');
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(ld).toContain('"@type":"Event"');
});
