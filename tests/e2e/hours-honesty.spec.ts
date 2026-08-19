import { test, expect } from '@playwright/test';
import storesJson from '../../src/data/stores.json' with { type: 'json' };

/**
 * The absence-of-data rule, applied to the search snippet.
 *
 * On 2026-08-19 an audit found every store page description promising
 * "Address, hours, phone, and what they carry" and every city page title
 * ending "Hours, Map & Directions" — while not one of the 689 shops in the
 * directory carried an hours value. ~930 pages advertised a field that did not
 * exist, so every click arriving on that promise bounced straight back.
 *
 * This guard is conditional, not a ban. "Hours" is legitimate snippet copy the
 * day the data lands (see scripts/refresh-ratings.py, which now collects it).
 * Until then, no title or meta description may promise it.
 *
 * It reads the BUILT head rather than the source, because the page body
 * legitimately renders an "Hours" label inside a `store.hours !== undefined`
 * conditional — honest markup a source scan cannot tell apart from the copy.
 */
const PAGES_WHOSE_SNIPPET_DESCRIBES_A_SHOP = [
  '/store/dolly-s-cards-collectibles-waterloo-waterloo/',
  '/ontario/toronto/',
  '/pokemon/toronto/',
  // /pokemon/[city]/index.astro has a titleSuffix ternary with a THIRD branch
  // that only fires when a Pokemon city has exactly one shop (172 Pokemon
  // cities exist; 109 are single-shop). Toronto's 28-shop page takes the
  // 'Ranked, Updated Daily' branch and never exercises it — Banff (AB), a
  // real single-shop Pokemon city verified against src/data/stores.json on
  // 2026-08-19, does.
  '/pokemon/banff/',
];

const storesWithHours = (storesJson as { hours?: string }[]).filter(
  (s) => s.hours !== undefined && s.hours !== '',
).length;

for (const path of PAGES_WHOSE_SNIPPET_DESCRIBES_A_SHOP) {
  test(`${path} does not promise hours it cannot show`, async ({ page }) => {
    test.skip(storesWithHours > 0, 'hours data landed — the promise is honest again');

    await page.goto(path);
    const title = await page.title();
    const description =
      (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';

    expect(title, `<title> promises hours: ${title}`).not.toMatch(/hours/i);
    expect(description, `meta description promises hours: ${description}`).not.toMatch(/hours/i);
  });
}
