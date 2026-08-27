# Plan 10 — Hours Honesty & Internal Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the site promising opening hours it does not have on ~930 pages, make the real hours free to collect, and wire the 689 store pages and 247 city pages into the guides, sell, Pokémon and shows lanes they currently strand.

**Architecture:** Two independent halves. Half A is a copy correction plus a guard test — reading the built `<title>` and `<meta name="description">` — that fails if the promise comes back while the data is still empty, and a one-field change to the ratings refresh script that makes real hours cost nothing. Half B adds two pure helper modules (`nearby.ts` for distance-ranked shops and cities, `related-guides.ts` for tag-driven guide selection) and consumes them from the store and city templates. No new pages, no new data sources, no route changes.

**Tech Stack:** Astro 5 (static build), TypeScript strict, Vitest (unit), Playwright (e2e), Python 3 for the Places API refresh script. Site data is baked from a Google Sheet into `src/data/stores.json` by `npm run bake`.

## Global Constraints

- **TypeScript strict, no `any`.** `npm run typecheck` must pass.
- **Never state or imply a fact about a named business that the data does not carry.** This is the standing absence-of-data rule; `tests/unit/superlative-claims.test.ts` is its existing guard and must keep passing.
- **The Google Sheet is the source of truth.** Nothing in this plan writes to `src/data/stores.json` by hand. `src/data/stores.json` is a build artifact refreshed by `npm run bake`.
- **Templates, never built output.** All copy changes land in `.astro` templates and `src/lib/*.ts`, so the nightly rebuild cannot erase them.
- **Test at 375px** for any visible layout change.
- **Commit messages:** imperative, lowercase after the type prefix, no trailing period. Follow the repo's existing style (`fix: prevent mobile city map layout shift`).
- **Do not run `git add -A` or `git add .`** — stage explicit file paths only. Another session may be live in this folder.
- **Do not push to `master`.** Commit locally; Nathan approves every push.

## Baseline facts this plan depends on (verified 2026-08-19)

| Fact | Value |
|---|---|
| Stores in `src/data/stores.json` | 689 |
| Stores with an `hours` value | **0 (0%)** |
| Stores with `rating` | 637 (92%) |
| Stores with `services` or `sports` non-empty | 652 (94%) |
| Cities | 247 |
| Guides in `src/lib/guides.ts` | 14 |
| Shows in `src/data/shows.json` | 45 |
| `distanceKm(lat1,lng1,lat2,lng2)` already exists | `src/lib/map-data.ts:68` |

**Why hours are free:** Google's Places API (New) bills a request at the highest SKU tier any requested field belongs to. `places.rating` and `places.userRatingCount` — already in the script's field mask — are **Enterprise** tier fields, and `places.regularOpeningHours` is *also* Enterprise tier. Adding it therefore changes the bill by **$0**. The comment at `scripts/refresh-ratings.py:48-49` claiming the mask "avoids paying for … opening hours we do not use" is wrong on that point and Task 2 corrects it.

---

## File Structure

**Create:**
- `src/lib/nearby.ts` — distance-ranked neighbours. Two pure functions over `Store[]`: nearest shops to a shop, nearest cities to a city. No Astro imports, no side effects.
- `src/lib/related-guides.ts` — maps a shop's or city's tags to at most three relevant guide slugs. Pure, data-driven, no Astro imports.
- `tests/unit/nearby.test.ts`
- `tests/unit/related-guides.test.ts`
- `tests/e2e/hours-honesty.spec.ts` — the guard, reading the built `<head>` rather than the source (reason in Task 1).

**Modify:**
- `src/pages/store/[slug]/index.astro` — remove the hours promise from `description` (lines 38–41); add the nearby-shops and related-guides blocks.
- `src/pages/[province]/[city]/index.astro` — remove the hours promise from `titleSuffix` (lines 58–62) and both `description` branches (lines 70–71); add the nearby-cities, related-guides and shows blocks.
- `src/lib/tcg.ts` — remove the hours promise from the Pokémon city capsule (line 99) and FAQ answer (line 116).
- `scripts/refresh-ratings.py` — add `places.regularOpeningHours` to the field mask, emit an `Hours` column, correct the stale comment, and stop dropping rows that have hours but no rating.

**Do not modify:** `src/lib/shows.ts` (show records have their own real `hours` field and those promises are honest), `src/data/*.json` (build artifacts).

---

# HALF A — Hours honesty

### Task 1: Stop promising hours, and guard the promise

**Files:**
- Create: `tests/e2e/hours-honesty.spec.ts`
- Modify: `src/pages/store/[slug]/index.astro:38-41`
- Modify: `src/pages/[province]/[city]/index.astro:58-62`, `:70-71`
- Modify: `src/lib/tcg.ts:99`, `:116`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on. Self-contained.

**Why this task exists:** every store page description reads *"Address, hours, phone, and what they carry."* and every city page title ends *"Hours, Map & Directions"*, while zero of 689 shops carry an hours value. A searcher who types "is <shop> open today" sees that snippet, clicks, finds nothing, and returns to Google within seconds. That bounce-back is a negative relevance signal and it is currently firing across roughly 930 pages.

**Why the guard is an e2e test, not a unit test.** The obvious guard is a file scan like `tests/unit/superlative-claims.test.ts`. It does not work here: `src/pages/store/[slug]/index.astro:79` legitimately renders `<dt>Hours</dt>` inside a `store.hours !== undefined` conditional, and no amount of regex reliably separates that honest, conditional body markup from the dishonest unconditional snippet copy. Reading the built `<title>` and `<meta name="description">` instead tests exactly the strings Google shows, with no false positives.

- [ ] **Step 1: Write the failing guard test**

Create `tests/e2e/hours-honesty.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import storesJson from '../../src/data/stores.json';

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
```

All three paths were verified against `src/data/stores.json` on 2026-08-19: the Dolly's slug is present, and Toronto has 37 shops of which 28 are Pokémon-tagged, so `/pokemon/toronto/` builds. If a later bake removes any of them, substitute any store slug from `src/data/stores.json` and any city that appears under `dist/pokemon/`.

- [ ] **Step 2: Build, then run the test and confirm it fails**

```bash
npm run build
npx playwright test tests/e2e/hours-honesty.spec.ts
```

Expected: FAIL on all three pages — the store title is clean but its description says "Address, hours, phone…", and the city title says "Hours, Map & Directions".

- [ ] **Step 3: Fix the store page description**

In `src/pages/store/[slug]/index.astro`, replace lines 38–41:

```astro
const description =
  store.rating !== undefined && store.reviewCount !== undefined
    ? `${store.name} in ${store.city}, ${provinceName} — ${store.rating} stars from ${store.reviewCount} Google reviews. Address, hours, phone, and what they carry.`
    : `${store.name} in ${store.city}, ${provinceName}: address, hours, phone, and what they carry.`;
```

with:

```astro
const description =
  store.rating !== undefined && store.reviewCount !== undefined
    ? `${store.name} in ${store.city}, ${provinceName} — ${store.rating} stars from ${store.reviewCount} Google reviews. Address, map, directions and what they carry.`
    : `${store.name} in ${store.city}, ${provinceName}: address, map, directions and what they carry.`;
```

Address, map and directions are present on 100% of store pages. Phone is only on 74%, so it comes out of the promise too.

- [ ] **Step 4: Fix the city page title suffix and descriptions**

In `src/pages/[province]/[city]/index.astro`, replace lines 58–62:

```astro
const titleSuffix = cityGroup.stores.length === 1
  ? 'Hours, Map & Directions'
  : anyRated
    ? 'Rated & Mapped, Updated Daily'
    : 'Hours, Map & Directions, Updated Daily';
```

with:

```astro
const titleSuffix = cityGroup.stores.length === 1
  ? 'Address, Map & Directions'
  : anyRated
    ? 'Rated & Mapped, Updated Daily'
    : 'Address, Map & Directions, Updated Daily';
```

Then replace both description branches at lines 70–71 — change `with Google ratings, hours, map and directions` to `with Google ratings, map and directions`, and `compare ratings where they exist, hours, map and directions` to `compare ratings where they exist, map and directions`. Leave the rest of both strings exactly as they are.

- [ ] **Step 5: Fix the Pokémon city copy**

In `src/lib/tcg.ts` line 99, change `'See its address, hours, and map pin below.'` to `'See its address, map pin and directions below.'`

In the same file at line 116, change `... is the Pokémon card shop we track in ${city}, ${provinceName}. See its address, hours, and map pin below.` to `... is the Pokémon card shop we track in ${city}, ${provinceName}. See its address, map pin and directions below.`

- [ ] **Step 6: Run the unit suite**

Run: `npm test`

Expected: PASS with no edits. `tests/unit/tcg.test.ts` was checked on 2026-08-19 and asserts nothing about the hours wording, so Step 5 should not break it. If it does fail on a copy assertion, update the expected string to the new wording — it is checking copy, not behaviour.

- [ ] **Step 7: Rebuild and confirm the guard now passes**

```bash
npm run typecheck
npm run build
npx playwright test tests/e2e/hours-honesty.spec.ts
```

Expected: typecheck clean, build succeeds, all three guard tests PASS.

- [ ] **Step 8: Commit**

```bash
git add tests/e2e/hours-honesty.spec.ts "src/pages/store/[slug]/index.astro" "src/pages/[province]/[city]/index.astro" src/lib/tcg.ts tests/unit/tcg.test.ts
git commit -m "fix: stop promising opening hours on 930 pages that have none"
```

---

### Task 2: Make real hours free to collect

**Files:**
- Modify: `scripts/refresh-ratings.py:47-50` (field mask + comment), `:112-126` (row assembly), `:131-134` (CSV header)

**Interfaces:**
- Consumes: nothing.
- Produces: an `Hours` column in `docs/research/ratings-refresh.csv`, formatted as one line of free text, ready to paste into the sheet's Hours column (column E, the column `src/lib/stores-build.ts:32` reads as `cells[4]`).

**Why:** the script's field mask already requests `places.rating` and `places.userRatingCount`, which are Enterprise-tier fields. `places.regularOpeningHours` is the same tier, and Google bills at the highest tier requested — so hours ride along at no extra cost. This task only produces the CSV; **importing it into the sheet is a Nathan step**, deliberately, because the sheet is the source of truth.

- [ ] **Step 1: Correct the field mask and its comment**

Replace lines 47–50 of `scripts/refresh-ratings.py`:

```python
# Field mask keeps us on the cheapest SKU that still returns ratings, and avoids
# paying for photos/reviews/opening hours we do not use.
FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount'
```

with:

```python
# Google bills a request at the highest SKU tier any requested field belongs to.
# rating and userRatingCount are already Enterprise-tier, and regularOpeningHours
# is Enterprise-tier too — so hours cost nothing extra on a call we are already
# making. Photos and reviews are NOT free: they sit in Enterprise + Atmosphere,
# a higher tier, which is why they stay out of this mask.
FIELD_MASK = (
    'places.id,places.displayName,places.formattedAddress,'
    'places.rating,places.userRatingCount,places.regularOpeningHours'
)
```

- [ ] **Step 2: Add the hours formatter**

Insert this function immediately after `search_place` (before `def main()`):

```python
def format_hours(place: dict | None) -> str:
    """Google's weekday lines collapsed to one sheet cell.

    regularOpeningHours.weekdayDescriptions arrives as
    ["Monday: 11:00 AM - 7:00 PM", ..., "Sunday: Closed"]. The sheet's Hours
    column is free text, so join with "; " and let the page render it verbatim.
    Returns '' when the place has no published hours, which is common for
    appointment-only and home-based shops.
    """
    if not place:
        return ''
    lines = (place.get('regularOpeningHours') or {}).get('weekdayDescriptions') or []
    return '; '.join(str(line).strip() for line in lines if str(line).strip())
```

- [ ] **Step 3: Keep rows that have hours but no rating**

In `main()`, replace the loop body block that currently reads:

```python
        rating = place.get('rating') if place else None
        count = place.get('userRatingCount') if place else None
        if rating is None:
            misses.append([s['slug'], s['name'], s['city'], s['province'],
                           'no match' if place is None else 'matched but unrated'])
        else:
            # Sheet's own format, so this pastes straight into the Rating column.
            rows.append([s['slug'], s['name'], s['city'], s['province'],
                         f'{rating} ({count})' if count is not None else str(rating),
                         (place.get('formattedAddress') or '')])
```

with:

```python
        rating = place.get('rating') if place else None
        count = place.get('userRatingCount') if place else None
        hours = format_hours(place)
        if rating is None and hours == '':
            misses.append([s['slug'], s['name'], s['city'], s['province'],
                           'no match' if place is None else 'matched but unrated, no hours'])
        else:
            # Sheet's own format, so this pastes straight into the Rating column.
            rating_cell = ''
            if rating is not None:
                rating_cell = f'{rating} ({count})' if count is not None else str(rating)
            rows.append([s['slug'], s['name'], s['city'], s['province'],
                         rating_cell, hours,
                         (place.get('formattedAddress') or '')])
```

- [ ] **Step 4: Add the column to the CSV header**

Change the header row writer from:

```python
        w.writerow(['slug', 'Store Name', 'City', 'Province', 'Rating', 'Google address (verify match)'])
```

to:

```python
        w.writerow(['slug', 'Store Name', 'City', 'Province', 'Rating', 'Hours',
                    'Google address (verify match)'])
```

- [ ] **Step 5: Update the closing instructions**

Change the final `print` block's last two lines from the current text to:

```python
    print('\nNext: spot-check the "Google address" column against each store\'s own address')
    print('before importing — Text Search can match a nearby business of a similar name.')
    print('Rating pastes into the sheet\'s Rating column; Hours pastes into the Hours column.')
```

- [ ] **Step 6: Verify the script still parses and its scope report works**

Run: `python3 scripts/refresh-ratings.py --dry-run`

Expected: prints the store count and a per-province breakdown, makes zero API calls, exits 0. It must not raise — `--dry-run` returns before the API key is read.

- [ ] **Step 7: Commit**

```bash
git add scripts/refresh-ratings.py
git commit -m "feat: collect opening hours in the ratings refresh, at no extra API cost"
```

- [ ] **Step 8: Hand off the Nathan-gated step**

Do **not** run the live refresh. Add one line to `~/jarvis-memory/_ops/WAITING-ON-NATHAN.md`:

```
- SCNM: run `GOOGLE_PLACES_API_KEY=... python3 scripts/refresh-ratings.py --all`, spot-check the CSV, paste the Hours column into the sheet. Unblocks re-adding "hours" to page titles (guard test flips green automatically).
```

---

# HALF B — Internal linking

**Why this half exists:** the 689 store pages carry 67% of the site's impressions and are near dead ends — a breadcrumb, one conditional grading-guide link, and nothing else. The 247 city pages link sideways to nothing at all; every city is an island hanging off its province. Meanwhile the 14 guides earn double the reach per page of anything else on the site and sit at **median position 16.5 — page two** — because almost nothing on the site points at them. This half spends the store and city pages' accumulated relevance on the pages that deserve it. It adds no new pages and writes no new prose.

### Task 3: The `nearby` helper

**Files:**
- Create: `src/lib/nearby.ts`
- Create: `tests/unit/nearby.test.ts`

**Interfaces:**
- Consumes: `distanceKm` from `src/lib/map-data.ts:68`, `Store` from `src/lib/types.ts`.
- Produces:
  - `nearestStores(all: Store[], origin: Store, opts?: { limit?: number; maxKm?: number }): Store[]`
  - `interface NearbyCity { city: string; citySlug: string; province: ProvinceCode; count: number; km: number }`
  - `nearestCities(all: Store[], citySlug: string, opts?: { limit?: number; maxKm?: number }): NearbyCity[]`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/nearby.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { nearestStores, nearestCities } from '../../src/lib/nearby';
import type { Store } from '../../src/lib/types';

const store = (over: Partial<Store> = {}): Store => ({
  slug: 'a-edmonton', name: 'A', city: 'Edmonton', citySlug: 'edmonton',
  address: '1 Main St, Edmonton, AB', province: 'AB', rating: 4.5, reviewCount: 50,
  hours: undefined, phone: undefined, website: undefined, social: undefined,
  services: [], sports: [], lat: 53.54, lng: -113.49, ...over,
} as Store);

// Edmonton 53.54/-113.49 · Sherwood Park ~20km east · Calgary ~280km south
const EDM = store({ slug: 'a-edmonton', city: 'Edmonton', citySlug: 'edmonton' });
const EDM2 = store({ slug: 'b-edmonton', name: 'B', lat: 53.55, lng: -113.5 });
const SHERWOOD = store({ slug: 'c-sherwood-park', name: 'C', city: 'Sherwood Park', citySlug: 'sherwood-park', lat: 53.52, lng: -113.31 });
const CALGARY = store({ slug: 'd-calgary', name: 'D', city: 'Calgary', citySlug: 'calgary', lat: 51.05, lng: -114.07 });

describe('nearestStores', () => {
  it('never returns the origin shop itself', () => {
    const out = nearestStores([EDM, EDM2, SHERWOOD], EDM);
    expect(out.map((s) => s.slug)).not.toContain('a-edmonton');
  });

  it('orders by real distance, closest first', () => {
    const out = nearestStores([EDM, CALGARY, SHERWOOD, EDM2], EDM, { maxKm: 500 });
    expect(out.map((s) => s.slug)).toEqual(['b-edmonton', 'c-sherwood-park', 'd-calgary']);
  });

  it('drops shops beyond maxKm, so a remote shop links to nothing absurd', () => {
    const out = nearestStores([EDM, CALGARY], EDM, { maxKm: 75 });
    expect(out).toEqual([]);
  });

  it('respects the limit', () => {
    const out = nearestStores([EDM, EDM2, SHERWOOD, CALGARY], EDM, { limit: 1, maxKm: 500 });
    expect(out).toHaveLength(1);
    expect(out[0]?.slug).toBe('b-edmonton');
  });
});

describe('nearestCities', () => {
  it('never returns the origin city', () => {
    const out = nearestCities([EDM, EDM2, SHERWOOD], 'edmonton');
    expect(out.map((c) => c.citySlug)).not.toContain('edmonton');
  });

  it('counts the shops in each neighbouring city', () => {
    const out = nearestCities([EDM, EDM2, SHERWOOD], 'edmonton', { maxKm: 500 });
    expect(out[0]).toMatchObject({ citySlug: 'sherwood-park', count: 1 });
  });

  it('orders by distance between city centres', () => {
    const out = nearestCities([EDM, EDM2, SHERWOOD, CALGARY], 'edmonton', { maxKm: 500 });
    expect(out.map((c) => c.citySlug)).toEqual(['sherwood-park', 'calgary']);
  });

  it('returns an empty list for a city that is not in the data', () => {
    expect(nearestCities([EDM], 'nowhere')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run tests/unit/nearby.test.ts`

Expected: FAIL — `Failed to resolve import "../../src/lib/nearby"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/nearby.ts`:

```typescript
import { distanceKm } from './map-data';
import type { ProvinceCode, Store } from './types';

/**
 * Distance-ranked neighbours, for the "more shops near here" and "nearby cities"
 * blocks.
 *
 * Why this exists: store pages carry 67% of the site's impressions and linked
 * nowhere except their own breadcrumb, and no city page linked to any other
 * city. Both page types were dead ends, so the relevance they earn had nowhere
 * to flow — including to the guides, which sit on page two for want of inbound
 * links.
 *
 * maxKm defaults to 75 deliberately. Canada has shops with no neighbour for
 * hundreds of kilometres; "nearby" has to mean nearby or the block is a lie.
 * Callers render nothing when the list comes back empty.
 */
const DEFAULT_LIMIT = 5;
const DEFAULT_MAX_KM = 75;

export function nearestStores(
  all: Store[],
  origin: Store,
  opts: { limit?: number; maxKm?: number } = {},
): Store[] {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const maxKm = opts.maxKm ?? DEFAULT_MAX_KM;
  return all
    .filter((s) => s.slug !== origin.slug)
    .map((s) => ({ store: s, km: distanceKm(origin.lat, origin.lng, s.lat, s.lng) }))
    .filter((x) => x.km <= maxKm)
    .sort((a, b) => a.km - b.km || a.store.slug.localeCompare(b.store.slug))
    .slice(0, limit)
    .map((x) => x.store);
}

export interface NearbyCity {
  city: string;
  citySlug: string;
  province: ProvinceCode;
  count: number;
  km: number;
}

interface CityCentre {
  city: string;
  citySlug: string;
  province: ProvinceCode;
  count: number;
  lat: number;
  lng: number;
}

/** Mean position of a city's shops — good enough to rank neighbours by. */
function cityCentres(all: Store[]): CityCentre[] {
  const acc = new Map<string, { c: CityCentre; latSum: number; lngSum: number }>();
  for (const s of all) {
    const entry = acc.get(s.citySlug);
    if (entry === undefined) {
      acc.set(s.citySlug, {
        c: { city: s.city, citySlug: s.citySlug, province: s.province, count: 1, lat: 0, lng: 0 },
        latSum: s.lat,
        lngSum: s.lng,
      });
    } else {
      entry.c.count += 1;
      entry.latSum += s.lat;
      entry.lngSum += s.lng;
    }
  }
  return [...acc.values()].map(({ c, latSum, lngSum }) => ({
    ...c,
    lat: latSum / c.count,
    lng: lngSum / c.count,
  }));
}

export function nearestCities(
  all: Store[],
  citySlug: string,
  opts: { limit?: number; maxKm?: number } = {},
): NearbyCity[] {
  const limit = opts.limit ?? 6;
  const maxKm = opts.maxKm ?? 150;
  const centres = cityCentres(all);
  const origin = centres.find((c) => c.citySlug === citySlug);
  if (origin === undefined) return [];
  return centres
    .filter((c) => c.citySlug !== citySlug)
    .map((c) => ({
      city: c.city,
      citySlug: c.citySlug,
      province: c.province,
      count: c.count,
      km: distanceKm(origin.lat, origin.lng, c.lat, c.lng),
    }))
    .filter((c) => c.km <= maxKm)
    .sort((a, b) => a.km - b.km || a.citySlug.localeCompare(b.citySlug))
    .slice(0, limit);
}
```

Note the city radius is 150km, wider than the shop radius of 75km — a neighbouring town worth a link is further away than a neighbouring shop worth a link.

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npx vitest run tests/unit/nearby.test.ts`

Expected: PASS, 9 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/nearby.ts tests/unit/nearby.test.ts
git commit -m "feat: distance-ranked nearby shops and cities helper"
```

---

### Task 4: The `related-guides` helper

**Files:**
- Create: `src/lib/related-guides.ts`
- Create: `tests/unit/related-guides.test.ts`

**Interfaces:**
- Consumes: `GUIDES` and `GuideMeta` from `src/lib/guides.ts`, `Store` and `ProvinceCode` from `src/lib/types.ts`.
- Produces:
  - `relatedGuidesForStore(store: Store): GuideMeta[]` — at most 3
  - `relatedGuidesForCity(stores: Store[], province: ProvinceCode, citySlug: string): GuideMeta[]` — at most 3

**Guide slugs available** (from `src/lib/guides.ts`, all 14): `psa-grading-submissions-canada`, `best-card-shops-alberta`, `best-card-shops-edmonton`, `best-card-shops-calgary`, `your-first-card-show`, `selling-your-collection`, `tax-on-selling-sports-cards-canada`, `card-grading-101`, `psa-grading-mississauga`, `how-much-are-my-sports-cards-worth`, `pokemon-tcg-shops-canada`, `card-grading-companies-canada`, `are-old-hockey-cards-worth-anything`, `how-to-spot-fake-sports-cards`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/related-guides.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { relatedGuidesForStore, relatedGuidesForCity } from '../../src/lib/related-guides';
import { GUIDES } from '../../src/lib/guides';
import type { Store } from '../../src/lib/types';

const store = (over: Partial<Store> = {}): Store => ({
  slug: 'a-edmonton', name: 'A', city: 'Edmonton', citySlug: 'edmonton',
  address: '1 Main St, Edmonton, AB', province: 'AB', rating: 4.5, reviewCount: 50,
  hours: undefined, phone: undefined, website: undefined, social: undefined,
  services: [], sports: [], lat: 53.54, lng: -113.49, ...over,
} as Store);

const slugs = (gs: { slug: string }[]): string[] => gs.map((g) => g.slug);

describe('relatedGuidesForStore', () => {
  it('never returns more than three', () => {
    const s = store({ services: ['Buys', 'Grading Services'], sports: ['Pokemon', 'Hockey'] });
    expect(relatedGuidesForStore(s).length).toBeLessThanOrEqual(3);
  });

  it('sends a grading shop to the grading guides', () => {
    const out = slugs(relatedGuidesForStore(store({ services: ['Grading Services'] })));
    expect(out).toContain('card-grading-companies-canada');
  });

  it('sends a buying shop to the selling and tax guides', () => {
    const out = slugs(relatedGuidesForStore(store({ services: ['Buys'] })));
    expect(out).toContain('selling-your-collection');
  });

  it('sends a Pokemon shop to the TCG guide', () => {
    const out = slugs(relatedGuidesForStore(store({ sports: ['Pokemon'] })));
    expect(out).toContain('pokemon-tcg-shops-canada');
  });

  it('sends a hockey shop to the old-hockey-cards guide', () => {
    const out = slugs(relatedGuidesForStore(store({ sports: ['Hockey'] })));
    expect(out).toContain('are-old-hockey-cards-worth-anything');
  });

  it('matches tags case-insensitively, because the sheet vocabulary is inconsistent', () => {
    const out = slugs(relatedGuidesForStore(store({ services: ['Grading services'] })));
    expect(out).toContain('card-grading-companies-canada');
  });

  it('still returns guides for an untagged shop rather than an empty block', () => {
    expect(relatedGuidesForStore(store()).length).toBe(3);
  });

  it('only ever returns guides that actually exist', () => {
    const known = new Set(GUIDES.map((g) => g.slug));
    for (const g of relatedGuidesForStore(store({ services: ['Buys'], sports: ['Pokemon'] }))) {
      expect(known.has(g.slug)).toBe(true);
    }
  });

  it('never repeats a guide', () => {
    const out = slugs(relatedGuidesForStore(store({ services: ['Buys', 'Grading Services'] })));
    expect(new Set(out).size).toBe(out.length);
  });
});

describe('relatedGuidesForCity', () => {
  it('offers the Edmonton best-of guide on the Edmonton page', () => {
    const out = slugs(relatedGuidesForCity([store()], 'AB', 'edmonton'));
    expect(out).toContain('best-card-shops-edmonton');
  });

  it('offers the Alberta best-of guide to a different Alberta city', () => {
    const s = store({ city: 'Red Deer', citySlug: 'red-deer' });
    const out = slugs(relatedGuidesForCity([s], 'AB', 'red-deer'));
    expect(out).toContain('best-card-shops-alberta');
  });

  it('pools the tags of every shop in the city', () => {
    const a = store({ slug: 'a', services: ['Buys'] });
    const b = store({ slug: 'b', sports: ['Pokemon'] });
    const out = slugs(relatedGuidesForCity([a, b], 'ON', 'toronto'));
    expect(out).toContain('selling-your-collection');
  });

  it('never returns more than three', () => {
    const s = store({ services: ['Buys', 'Grading Services'], sports: ['Pokemon', 'Hockey'] });
    expect(relatedGuidesForCity([s], 'AB', 'edmonton').length).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run tests/unit/related-guides.test.ts`

Expected: FAIL — `Failed to resolve import "../../src/lib/related-guides"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/related-guides.ts`:

```typescript
import { GUIDES, type GuideMeta } from './guides';
import type { ProvinceCode, Store } from './types';

/**
 * Tag-driven guide selection for store and city pages.
 *
 * Why this exists: the 14 guides earn roughly double the reach per page of any
 * other page type on the site and still sit at median position 16.5 — page two.
 * The reason is inbound links: guides link generously outward to /sell/ and
 * /pokemon/ and to each other, and almost nothing links back. The 689 store
 * pages offered exactly one guide link, conditional on the shop tagging grading;
 * the 247 city pages offered none. This closes that loop from the two biggest
 * page groups on the site.
 *
 * Capped at three. More links on a template dilutes each one and turns the
 * block into navigation furniture readers skip.
 */
const MAX_RELATED = 3;

const bySlug = new Map(GUIDES.map((g) => [g.slug, g]));

/** Ordered so the earliest match wins a slot; the fallbacks fill what's left. */
const TAG_RULES: { match: (tag: string) => boolean; guides: string[] }[] = [
  { match: (t) => t.includes('grading'), guides: ['card-grading-companies-canada', 'card-grading-101'] },
  { match: (t) => t === 'buys', guides: ['selling-your-collection', 'tax-on-selling-sports-cards-canada'] },
  {
    match: (t) => ['pokemon', 'magic', 'one piece', 'lorcana', 'yu-gi-oh'].includes(t),
    guides: ['pokemon-tcg-shops-canada'],
  },
  { match: (t) => t === 'hockey', guides: ['are-old-hockey-cards-worth-anything'] },
  { match: (t) => t === 'breaks' || t === 'breaking' || t === 'trade nights', guides: ['your-first-card-show'] },
];

/** Shown to a shop or city whose tags matched nothing, so the block is never empty. */
const FALLBACKS = [
  'how-much-are-my-sports-cards-worth',
  'card-grading-101',
  'how-to-spot-fake-sports-cards',
];

const CITY_BEST_OF: Record<string, string> = {
  edmonton: 'best-card-shops-edmonton',
  calgary: 'best-card-shops-calgary',
};

const PROVINCE_BEST_OF: Partial<Record<ProvinceCode, string>> = {
  AB: 'best-card-shops-alberta',
};

function resolve(slugs: string[]): GuideMeta[] {
  const out: GuideMeta[] = [];
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    const guide = bySlug.get(slug);
    if (guide === undefined) continue; // a guide was renamed or removed
    seen.add(slug);
    out.push(guide);
    if (out.length === MAX_RELATED) break;
  }
  return out;
}

/** Every services + sports tag on the shops, lowercased and trimmed. */
function tagsOf(stores: Store[]): string[] {
  return stores.flatMap((s) => [...s.services, ...s.sports]).map((t) => t.trim().toLowerCase());
}

function matched(tags: string[]): string[] {
  const hits: string[] = [];
  for (const rule of TAG_RULES) {
    if (tags.some((t) => rule.match(t))) hits.push(...rule.guides);
  }
  return hits;
}

export function relatedGuidesForStore(store: Store): GuideMeta[] {
  return resolve([...matched(tagsOf([store])), ...FALLBACKS]);
}

export function relatedGuidesForCity(
  stores: Store[],
  province: ProvinceCode,
  citySlug: string,
): GuideMeta[] {
  const bestOf = CITY_BEST_OF[citySlug] ?? PROVINCE_BEST_OF[province];
  const lead = bestOf !== undefined ? [bestOf] : [];
  return resolve([...lead, ...matched(tagsOf(stores)), ...FALLBACKS]);
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npx vitest run tests/unit/related-guides.test.ts`

Expected: PASS, 13 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/related-guides.ts tests/unit/related-guides.test.ts
git commit -m "feat: tag-driven related-guides selection for store and city pages"
```

---

### Task 5: Wire the store page

**Files:**
- Modify: `src/pages/store/[slug]/index.astro`

**Interfaces:**
- Consumes: `nearestStores` (Task 3), `relatedGuidesForStore` (Task 4).
- Produces: nothing later tasks depend on.

The store page currently ends with the FAQ section and the "Own this shop?" line. Both new blocks go **between** the FAQ section and that closing line.

- [ ] **Step 1: Add the imports and computed values**

In the frontmatter of `src/pages/store/[slug]/index.astro`, after the existing imports, add:

```astro
import { nearestStores } from '../../../lib/nearby';
import { relatedGuidesForStore } from '../../../lib/related-guides';
```

Then after the existing `const provinceSlug = ...` line, add:

```astro
const nearby = nearestStores(storesJson as Store[], store);
const guides = relatedGuidesForStore(store);
const sellUrl = `/sell/${store.citySlug}/`;
const pokemonUrl = `/pokemon/${store.citySlug}/`;
const lowerTags = [...store.services, ...store.sports].map((t) => t.trim().toLowerCase());
const buysHere = lowerTags.includes('buys');
const tcgHere = ['pokemon', 'magic', 'one piece', 'lorcana', 'yu-gi-oh'].some((t) => lowerTags.includes(t));
```

- [ ] **Step 2: Add the blocks to the template**

Immediately before the closing `<p class="mt-12 text-sm text-muted">Own this shop? ...</p>`, insert:

```astro
  {nearby.length > 0 && (
    <section class="mt-16 max-w-2xl">
      <h2 class="text-3xl">More card shops near here</h2>
      <ul role="list" class="mt-6 grid gap-3">
        {nearby.map((s) => (
          <li>
            <a href={`/store/${s.slug}/`} class="font-semibold hover:text-prizm">{s.name}</a>
            <span class="text-sm text-muted"> · {s.city}{s.rating !== undefined && <> · ★ {s.rating}</>}</span>
          </li>
        ))}
      </ul>
      <p class="mt-4 text-sm text-muted">
        See every shop in{' '}
        <a href={`/${provinceSlug}/${store.citySlug}/`} class="text-prizm">{store.city}</a>, or browse all of{' '}
        <a href={`/${provinceSlug}/`} class="text-prizm">{provinceName}</a>.
      </p>
    </section>
  )}

  {(buysHere || tcgHere) && (
    <p class="mt-8 max-w-2xl text-sm text-muted">
      {buysHere && (
        <>
          {store.name} lists buying collections as a service — see{' '}
          <a href={sellUrl} class="text-prizm">every shop that buys in {store.city}</a>.{' '}
        </>
      )}
      {tcgHere && (
        <>
          It also carries trading card games — see{' '}
          <a href={pokemonUrl} class="text-prizm">Pokémon and TCG shops in {store.city}</a>.
        </>
      )}
    </p>
  )}

  <section class="mt-12 max-w-2xl">
    <h2 class="text-3xl">Guides for collectors</h2>
    <ul role="list" class="mt-6 grid gap-4">
      {guides.map((g) => (
        <li>
          <a href={`/guides/${g.slug}/`} class="font-semibold hover:text-prizm">{g.title}</a>
          <p class="mt-1 text-sm text-muted">{g.dek}</p>
        </li>
      ))}
    </ul>
  </section>
```

The existing conditional grading-guide paragraph higher up the page stays — `resolve()` deduplicates within the block, not across the page, and one repeated link is not worth restructuring the page for.

- [ ] **Step 3: Build and check a page renders**

Run: `npm run build`

Expected: build succeeds, 689 store pages emitted, no warnings about missing modules.

- [ ] **Step 4: Write the e2e check**

Append to `tests/e2e/crosslinks.spec.ts`:

```typescript
test('store page links to nearby shops and to guides', async ({ page }) => {
  await page.goto('/store/dolly-s-cards-collectibles-waterloo-waterloo/');
  await expect(page.getByRole('heading', { name: 'More card shops near here' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Guides for collectors' })).toBeVisible();
  await expect(page.locator('a[href^="/guides/"]').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow, 'no horizontal scroll').toBe(false);
});
```

If that slug no longer exists after a bake, pick any slug from `src/data/stores.json` in a city with several shops (Toronto, Ottawa, Markham) and use it instead.

- [ ] **Step 5: Run the e2e test**

Playwright's `webServer` runs `npm run preview`, which serves `dist/` — so Step 3's build must have succeeded first.

Run: `npx playwright test tests/e2e/crosslinks.spec.ts`

Expected: PASS in both projects. `playwright.config.ts` already defines a `mobile-375` project (375×812) alongside `desktop`, so the 375px check runs automatically — do not add a per-test viewport override.

- [ ] **Step 6: Commit**

```bash
git add "src/pages/store/[slug]/index.astro" tests/e2e/crosslinks.spec.ts
git commit -m "feat: link store pages to nearby shops, sell and TCG lanes, and guides"
```

---

### Task 6: Wire the city page

**Files:**
- Modify: `src/pages/[province]/[city]/index.astro`

**Interfaces:**
- Consumes: `nearestCities` (Task 3), `relatedGuidesForCity` (Task 4), `primaryShowCalendarYear` from `src/lib/shows.ts:117`.
- Produces: nothing.

- [ ] **Step 1: Add the imports and computed values**

In the frontmatter of `src/pages/[province]/[city]/index.astro`, add to the imports:

```astro
import showsJson from '../../../data/shows.json';
import type { ShowRecord } from '../../../lib/shows';
import { primaryShowCalendarYear } from '../../../lib/shows';
import { nearestCities } from '../../../lib/nearby';
import { relatedGuidesForCity } from '../../../lib/related-guides';
```

Then after the existing `const sports = ...` line, add:

```astro
// Same-province filter is load-bearing: nearestCities ranks across the whole
// country, so a border city can return a neighbour in another province — and
// the link below is built with THIS page's province.slug, which would 404.
const nearbyCities = nearestCities(stores, cityGroup.citySlug).filter((c) => c.province === province.code);
const cityGuides = relatedGuidesForCity(cityGroup.stores, province.code, cityGroup.citySlug);
const showYear = primaryShowCalendarYear(showsJson as ShowRecord[], province.code, new Date());
const showsUrl = showYear !== undefined ? `/shows/${province.slug}-${showYear}/` : '/shows/';
const cityLowerTags = [...services, ...sports].map((t) => t.trim().toLowerCase());
const cityBuys = cityLowerTags.includes('buys');
const cityTcg = ['pokemon', 'magic', 'one piece', 'lorcana', 'yu-gi-oh'].some((t) => cityLowerTags.includes(t));
```

`primaryShowCalendarYear` returns `undefined` for a province with no upcoming shows, which is why `showsUrl` falls back to the `/shows/` hub rather than building a dead link.

- [ ] **Step 2: Add the blocks to the template**

The city page currently ends with the FAQ section. Insert this **after** the FAQ section and before the closing `</Base>`:

```astro
  <section class="mt-16">
    <h2 class="text-3xl">Keep looking</h2>
    <ul role="list" class="mt-6 grid gap-2 sm:grid-cols-2">
      {cityBuys && (
        <li>
          <a href={`/sell/${cityGroup.citySlug}/`} class="font-semibold hover:text-prizm">
            Shops that buy collections in {cityGroup.city}
          </a>
        </li>
      )}
      {cityTcg && (
        <li>
          <a href={`/pokemon/${cityGroup.citySlug}/`} class="font-semibold hover:text-prizm">
            Pokémon &amp; TCG shops in {cityGroup.city}
          </a>
        </li>
      )}
      <li>
        <a href={showsUrl} class="font-semibold hover:text-prizm">
          Card shows in {province.name}{showYear !== undefined ? ` ${showYear}` : ''}
        </a>
      </li>
      <li>
        <a href={`/${province.slug}/`} class="font-semibold hover:text-prizm">
          Every card shop in {province.name}
        </a>
      </li>
    </ul>
  </section>

  {nearbyCities.length > 0 && (
    <section class="mt-12">
      <h2 class="text-3xl">Nearby cities</h2>
      <ul role="list" class="mt-6 flex flex-wrap gap-2">
        {nearbyCities.map((c) => (
          <li>
            <a
              href={`/${province.slug}/${c.citySlug}/`}
              class="inline-block rounded-full border border-bord px-3 py-1 text-sm hover:border-prizm"
            >{c.city} <span class="text-muted">({c.count})</span></a>
          </li>
        ))}
      </ul>
    </section>
  )}

  <section class="mt-12 max-w-2xl">
    <h2 class="text-3xl">Guides for collectors</h2>
    <ul role="list" class="mt-6 grid gap-4">
      {cityGuides.map((g) => (
        <li>
          <a href={`/guides/${g.slug}/`} class="font-semibold hover:text-prizm">{g.title}</a>
          <p class="mt-1 text-sm text-muted">{g.dek}</p>
        </li>
      ))}
    </ul>
  </section>
```

- [ ] **Step 3: Build**

Run: `npm run build`

Expected: succeeds. Then confirm no dead links were generated:

```bash
grep -o 'href="/[a-z-]*/[a-z0-9-]*/"' dist/ontario/toronto/index.html | sort -u | head -30
```

Spot-check that each path exists under `dist/`.

- [ ] **Step 4: Write the e2e check**

Append to `tests/e2e/crosslinks.spec.ts`:

```typescript
test('city page links sideways to nearby cities, shows and guides', async ({ page }) => {
  await page.goto('/ontario/toronto/');
  await expect(page.getByRole('heading', { name: 'Nearby cities' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Keep looking' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Guides for collectors' })).toBeVisible();
  await expect(page.locator('a[href^="/shows/"]').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow, 'no horizontal scroll').toBe(false);
});
```

- [ ] **Step 5: Run the full suite**

```bash
npm test
npm run typecheck
npx playwright test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add "src/pages/[province]/[city]/index.astro" tests/e2e/crosslinks.spec.ts
git commit -m "feat: link city pages to nearby cities, shows, sell and TCG lanes, and guides"
```

---

## Out of scope — flagged, not fixed

These were found while reading the code for this plan. **Do not fix them in this plan**; they are recorded so they are not lost.

1. **The sheet's tag vocabulary has casing duplicates.** `src/data/stores.json` contains both `Sells Wax` (273) and `Sells wax` (1), `Grading Services` (44) and `Grading services` (1), and `Breaks` (36) alongside `Breaking` (1). The helpers in this plan match case-insensitively so they are unaffected, but the visible filter chips on city pages will render near-duplicate buttons. The fix belongs in the sheet, not the code.
2. **Title and description formulas are inline in `.astro` frontmatter, not in `src/lib/seo.ts`.** The PRD describes them as living in `seo.ts`; in fact only the FAQ and capsule helpers do. Extracting them would make Task 1's guard a direct unit test of the functions rather than a file scan. Worth doing, but it is a refactor and would have delayed the hours fix.
3. **`aggregateRating` on store pages marks up ratings sourced from Google Places.** Google's structured-data policy discourages marking up third-party ratings on a business page. Usually ignored, occasionally a site-wide manual action. Check Search Console → Enhancements before deciding whether to act.
4. **`storeFaqs` still contains a hours question** at `src/lib/seo.ts:537-541`, correctly guarded by `if (store.hours !== undefined)`. It emits nothing today and becomes correct the moment Task 2's data lands. No change needed.

## Definition of done

- [ ] `npm test` passes, including the new `nearby` and `related-guides` suites.
- [ ] `npm run typecheck` reports no errors.
- [ ] `npx playwright test` passes, including the `hours-honesty` guard and the two new crosslink tests.
- [ ] `npm run build` emits 689 store pages and 247 city pages with no dead internal links.
- [ ] The word "hours" appears in no store or city page title or meta description.
- [ ] Every store page carries at least one guide link; every city page carries at least three.
- [ ] Nothing has been pushed to `master`.
