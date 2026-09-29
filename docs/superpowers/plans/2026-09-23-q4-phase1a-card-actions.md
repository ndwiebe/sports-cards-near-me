# Phase 1a — Shop-card actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put Directions, Call and Website buttons on every shop card (city, Pokémon and sell pages) so a visitor can act without first opening the shop page. Credit taps made on a city page to that city.

**Architecture:** `StoreCard.astro` keeps its existing link-to-shop block and gains an action row *outside* that `<a>`, because links can't be nested inside other links. The buttons reuse the existing site-wide click delegation in `Base.astro` (`data-track-click` + `data-store-slug`), so no Worker change is needed. City attribution gains one rule: if the tap happens on a city page, that page is the source city. Otherwise the referrer is used, as today.

**Tech Stack:** Astro 5 static site, Tailwind, Vitest (unit), Playwright (e2e, projects `mobile-375` + `desktop`).

**Spec:** `docs/PRD-q4-2026-growth.md` → Phase 1a.

## Global Constraints

- Rankings and card order stay exactly as they are. Do not sort, filter or reorder stores.
- Tap targets are at least 44px tall at a 375px viewport.
- No `console.log`. TypeScript strict, no `any`.
- `src/data/*.json` are generated from the sheet. Never edit them.
- Never send test clicks to the live counter. Local builds have `PUBLIC_CLICK_TRACKER_URL` unset, so tracking is inert locally, which is the intended state.
- Stage explicit file paths only. Never `git add -A` / `git add .`.
- Before every commit: `npm run typecheck && npm test`. Before the final commit also run `npm run build`, which must report the same page count as before the change.
- Worktree: `~/Projects/8-Web-Apps/scnm-q4-growth` on branch `q4-growth`. Run `npm ci` once first.

---

### Task 1: Credit taps on a city page to that city

**Files:**
- Modify: `worker/event-schema.js` (add `sourceCityForClick`)
- Modify: `src/layouts/Base.astro:81-94` (use it)
- Test: `tests/unit/click-source.test.ts`

**Interfaces:**
- Produces: `sourceCityForClick(pathname: string, referrer: string, origin: string): string`. It returns a valid city path or `'unknown'`.

- [ ] **Step 1: Write the failing test** (append to `tests/unit/click-source.test.ts`, and add `sourceCityForClick` to its import)

```ts
describe('tap on the current page', () => {
  it('credits the city page the tap happened on', () => {
    expect(sourceCityForClick('/alberta/edmonton/', 'https://google.com/', origin)).toBe('alberta/edmonton');
  });
  it('falls back to the referrer when the current page is not a city page', () => {
    expect(sourceCityForClick('/store/a-shop/', `${origin}/ontario/toronto/`, origin)).toBe('ontario/toronto');
  });
  it('stays unknown for non-city pages with no city referrer', () => {
    expect(sourceCityForClick('/pokemon/edmonton/', 'https://google.com/', origin)).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/unit/click-source.test.ts`
Expected: FAIL, `sourceCityForClick` is not exported.

- [ ] **Step 3: Implement** (append to `worker/event-schema.js`)

```js
/** A tap made on a city page belongs to that city; otherwise use the preceding page.
 * @param {string} pathname
 * @param {string} referrer
 * @param {string} origin
 */
export function sourceCityForClick(pathname, referrer, origin) {
  const here = pathname.replace(/^\/|\/$/g, '');
  return CITY_PATH.test(here) ? here : sourceCityFromReferrer(referrer, origin);
}
```

In `src/layouts/Base.astro`, change the import to `import { sourceCityForClick } from '../../worker/event-schema.js';` and the line
`const sourceCity = sourceCityFromReferrer(document.referrer, location.origin);` to
`const sourceCity = sourceCityForClick(location.pathname, document.referrer, location.origin);`

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run tests/unit/click-source.test.ts tests/unit/click-tracker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/event-schema.js src/layouts/Base.astro tests/unit/click-source.test.ts
git commit -m "Credit a tap made on a city page to that city"
```

### Task 2: Shared helpers for the action links

**Files:**
- Create: `src/lib/store-actions.ts`
- Modify: `src/pages/store/[slug]/index.astro:33,184,191` (use the helpers; no behaviour change)
- Test: `tests/unit/store-actions.test.ts`

**Interfaces:**
- Produces: `directionsUrl(store: Pick<Store, 'lat' | 'lng'>): string` and `telHref(phone: string): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { directionsUrl, telHref } from '../../src/lib/store-actions';

describe('store action links', () => {
  it('builds a Google Maps directions URL from coordinates', () => {
    expect(directionsUrl({ lat: 53.5, lng: -113.6 })).toBe('https://www.google.com/maps/dir/?api=1&destination=53.5,-113.6');
  });
  it('strips formatting from phone numbers, keeping a leading plus', () => {
    expect(telHref('(780) 555-0199')).toBe('tel:7805550199');
    expect(telHref('+1 780-555-0199')).toBe('tel:+17805550199');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/unit/store-actions.test.ts`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Implement** `src/lib/store-actions.ts`

```ts
import type { Store } from './types';

export function directionsUrl(store: Pick<Store, 'lat' | 'lng'>): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, '')}`;
}
```

In `src/pages/store/[slug]/index.astro`, import both helpers. Replace `const directions = \`https://www.google.com/maps/dir/...\`` with `const directions = directionsUrl(store);`, and replace both `` `tel:${store.phone.replace(/[^0-9+]/g, '')}` `` with `telHref(store.phone)`.

- [ ] **Step 4: Run the tests and typecheck**

Run: `npx vitest run tests/unit/store-actions.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/store-actions.ts src/pages/store/[slug]/index.astro tests/unit/store-actions.test.ts
git commit -m "Share the directions and phone link builders"
```

### Task 3: Action row on every shop card

**Files:**
- Modify: `src/components/StoreCard.astro`
- Modify: `src/pages/privacy.astro:59` (the button-count wording)
- Modify: `docs/click-tracking.md` (the City attribution section)
- Test: `tests/e2e/store-card-actions.spec.ts` (new)

**Interfaces:**
- Consumes: `directionsUrl`, `telHref` from Task 2. The existing click delegation in `Base.astro` picks up `data-track-click` and `data-store-slug`.

- [ ] **Step 1: Write the failing e2e test** `tests/e2e/store-card-actions.spec.ts`

```ts
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
```

- [ ] **Step 2: Build and confirm the test fails**

Run: `npm run build && npx playwright test tests/e2e/store-card-actions.spec.ts`
Expected: FAIL, 0 directions links found.

- [ ] **Step 3: Implement.** Replace `src/components/StoreCard.astro` with the version below. The info block is unchanged and the action row is added after the `</a>`.

```astro
---
import type { Store } from '../lib/types';
import { hasLogo } from '../lib/logos';
import { directionsUrl, telHref } from '../lib/store-actions';
import OpenNowBadge from './OpenNowBadge.astro';

interface Props { store: Store }
const { store } = Astro.props;
const action = 'flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold';
---
<li data-store-card={store.slug} class="rounded-xl border border-bord bg-panel p-5 transition-transform duration-200 hover:-translate-y-0.5">
  <a href={`/store/${store.slug}/`} class="block">
    {hasLogo(store.slug) ? (
      <div class="flex items-center gap-3">
        <img src={`/logos/${store.slug}.webp`} width="44" height="44" loading="lazy" alt="" class="h-11 w-11 shrink-0 rounded-lg border border-bord" />
        <h2 class="text-2xl">{store.name}</h2>
      </div>
    ) : (
      <h2 class="text-2xl">{store.name}</h2>
    )}
    <p class="mt-1 text-sm text-muted">{store.address}</p>
    {store.rating !== undefined && (
      <p class="mt-1 text-sm text-gold" data-testid="rating">
        ★ {store.rating}{store.reviewCount !== undefined && <span class="text-muted"> ({store.reviewCount} Google reviews)</span>}
      </p>
    )}
    <OpenNowBadge store={store} />
    {(store.services.length > 0 || store.sports.length > 0) && (
      <ul role="list" class="mt-3 flex flex-wrap gap-1.5">
        {[...store.services, ...store.sports].map((t) => (
          <li class="rounded-full border border-bord px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{t}</li>
        ))}
      </ul>
    )}
  </a>
  <div class="mt-4 grid auto-cols-fr grid-flow-col gap-2">
    <a href={directionsUrl(store)} target="_blank" rel="noopener" class={`${action} text-ink`} style="background:var(--gradient-refractor)" data-track-click="directions" data-store-slug={store.slug} aria-label={`Directions to ${store.name}`}>Directions</a>
    {store.phone !== undefined && <a href={telHref(store.phone)} class={`${action} border border-bord hover:border-prizm`} data-track-click="call" data-store-slug={store.slug} aria-label={`Call ${store.name}`}>Call</a>}
    {store.website !== undefined && <a href={store.website} target="_blank" rel="noopener" class={`${action} border border-bord hover:border-prizm`} data-track-click="website" data-store-slug={store.slug} aria-label={`${store.name} website`}>Website</a>}
  </div>
</li>
```

`privacy.astro` line 59: change "Selecting Directions, Call or Website on a shop page" to "Selecting Directions, Call or Website on a shop page or a shop listing". Change the following sentence to: "When that selection happens on, or immediately after, a city page on this site, we also send its city path."

`docs/click-tracking.md`, City attribution: replace the first sentence with "A tap made on a city page is credited to that city. Otherwise the browser sends only the path of the immediately preceding SCNM city page." Also change "on shop pages" in the opening line to "on shop pages and shop listings".

- [ ] **Step 4: Rebuild and run the e2e and full suites**

Run: `npm run typecheck && npm test && npm run build && npx playwright test tests/e2e/store-card-actions.spec.ts tests/e2e/pokemon.spec.ts tests/e2e/sell.spec.ts tests/e2e/smoke.spec.ts`
Expected: all PASS. The build page count is unchanged from before Task 1.

- [ ] **Step 5: Screenshot check at 375px.** Save screenshots of `/alberta/edmonton/` and `/pokemon/toronto/` at 375×812 to the scratchpad and look at them. Confirm the buttons fit on one row without overflowing sideways, and that a card with all three buttons is still readable.

- [ ] **Step 6: Commit**

```bash
git add src/components/StoreCard.astro src/pages/privacy.astro docs/click-tracking.md tests/e2e/store-card-actions.spec.ts
git commit -m "Put Directions, Call and Website on every shop card"
```

## After the build (not agent work)

- Opus/strongest-model `/code-review` of the branch.
- Merge into `redesign` and push. The push builds a preview only. Production needs `gh workflow run site --ref main`, which requires Nathan's explicit go-ahead (see `CLAUDE.md` §2).
- Baseline to compare against: 7 total taps as of 2026-09-04 (`docs/research/2026-09-04-traffic-bar-status.md`). Re-count 2 and 4 weeks after publishing.
