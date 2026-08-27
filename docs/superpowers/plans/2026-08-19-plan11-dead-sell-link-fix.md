# Plan 11 — Fix the Dead "Shops That Buy" Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop 194 store pages linking to a `/sell/[city]/` page that was never built, for the 140 cities that have no confirmed buyer.

**Architecture:** One new pure helper in `src/lib/sell.ts` that answers "does a sell page exist for this citySlug", consumed by `storeFaqs()` in `src/lib/seo.ts`, which gains a third parameter and only attaches the `/sell/` link when the page it points to actually exists.

**Tech Stack:** Astro 5, TypeScript strict, Vitest.

## Global Constraints

- **TypeScript strict, no `any`.** `npm run typecheck` must pass.
- **Never state or imply a fact about a named business that the data does not carry.** Existing rule; `tests/unit/superlative-claims.test.ts` must keep passing.
- **The Google Sheet is the source of truth.** Nothing here writes to `src/data/stores.json`.
- **Do not run `git add -A` or `git add .`** — stage explicit file paths only.
- **Do not push to `master`/`redesign`'s remote.** Commit locally; Nathan approves every push.
- **The repo currently has other uncommitted, in-progress work that is not yours**: `src/lib/guides.ts`, `src/pages/guides/how-much-are-my-sports-cards-worth.astro`, `src/pages/guides/selling-your-collection.astro`, `src/pages/sell/[city]/index.astro`, `src/pages/sell/index.astro` (all modified), plus a new untracked `src/pages/guides/tax-on-selling-sports-cards-canada.astro`. **Do not touch, stage, or commit any of these.** This plan's one file to modify, `src/pages/sell/[city]/index.astro`, is already on that list as modified by the other session — **do not touch it**; this plan does not need to.

## Baseline facts this plan depends on (verified 2026-08-19)

| Fact | Value |
|---|---|
| Stores in `src/data/stores.json` | 689 |
| Distinct `citySlug` values | 247 |
| `citySlug`s with at least one store carrying the exact service `buys` | **107** — these are the only cities `/sell/[city]/` actually builds a page for |
| `citySlug`s with **no** buyer | **140** |
| Store pages whose city has no buyer, and therefore link to a page that doesn't exist | **194** |

**The exact defect, traced to one line.** `storeFaqs()` in `src/lib/seo.ts:528-534` answers the FAQ "Does `<shop>` buy sports card collections?" and, on the "no" branch, unconditionally attaches `link: { href: `/sell/${store.citySlug}/`, ... }`. But `/sell/[city]/index.astro`'s `getStaticPaths()` (lines 18-23) only emits a page for a `citySlug` that has at least one store passing `isBuyer()` — so for a citySlug with zero buyers, that `href` points at a page the build never creates. This is exactly analogous to the bug already fixed for the `/pokemon/` route in plan 10, and the fix follows the same shape: match the link to the actual route-generation gate, exactly.

---

## File Structure

**Create:**
- `tests/unit/sell.test.ts` — new file; `src/lib/sell.ts` currently has no dedicated unit test file.

**Modify:**
- `src/lib/sell.ts` — add one new exported helper.
- `src/lib/seo.ts` — `storeFaqs()` gains a third parameter and a conditional link.
- `tests/unit/store-seo.test.ts` — update all `storeFaqs(...)` call sites for the new signature; add two new test cases.
- `src/pages/store/[slug]/index.astro` — pass the new argument at the one call site.

**Do not modify:** `src/pages/sell/[city]/index.astro` (belongs to the other in-progress session), `src/data/stores.json`.

---

### Task 1: Add the route-existence helper

**Files:**
- Modify: `src/lib/sell.ts`
- Create: `tests/unit/sell.test.ts`

**Interfaces:**
- Consumes: `isBuyer(store: Store): boolean`, already exported at `src/lib/sell.ts:5-7`.
- Produces: `sellPageExistsForCity(stores: Store[], citySlug: string): boolean`, for Task 2 to consume.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/sell.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { sellPageExistsForCity } from '../../src/lib/sell';
import type { Store } from '../../src/lib/types';

const store = (over: Partial<Store> = {}): Store => ({
  slug: 'a-edmonton', name: 'A', city: 'Edmonton', citySlug: 'edmonton',
  address: '1 Main St, Edmonton, AB', province: 'AB', rating: 4.5, reviewCount: 50,
  hours: undefined, phone: undefined, website: undefined, social: undefined,
  services: [], sports: [], lat: 53.54, lng: -113.49, ...over,
} as Store);

/**
 * Mirrors the exact gate `/sell/[city]/index.astro`'s getStaticPaths() uses:
 * a page exists for a citySlug iff some store there passes isBuyer(). This
 * helper exists so storeFaqs() can ask the same question without importing
 * an Astro page file, which it cannot do.
 */
describe('sellPageExistsForCity', () => {
  it('is true when a store in that city buys collections', () => {
    expect(sellPageExistsForCity([store({ services: ['Buys'] })], 'edmonton')).toBe(true);
  });

  it('is false when no store in that city buys collections', () => {
    expect(sellPageExistsForCity([store({ services: ['Sells'] })], 'edmonton')).toBe(false);
  });

  it('is false for a city with no stores at all', () => {
    expect(sellPageExistsForCity([store({ services: ['Buys'] })], 'calgary')).toBe(false);
  });

  it('matches case- and whitespace-insensitively, same as isBuyer', () => {
    expect(sellPageExistsForCity([store({ services: [' buys ' as never] })], 'edmonton')).toBe(true);
  });

  it('is true if ANY store in the city buys, even if others in the same city do not', () => {
    const stores = [store({ slug: 'a', services: ['Sells'] }), store({ slug: 'b', services: ['Buys'] })];
    expect(sellPageExistsForCity(stores, 'edmonton')).toBe(true);
  });

  it('ignores buyers in a different city entirely', () => {
    const stores = [store({ citySlug: 'calgary', services: ['Buys'] })];
    expect(sellPageExistsForCity(stores, 'edmonton')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run tests/unit/sell.test.ts`

Expected: FAIL — `sellPageExistsForCity` is not exported from `../../src/lib/sell`.

- [ ] **Step 3: Write the implementation**

In `src/lib/sell.ts`, add this function immediately after `isBuyer` (after line 7, before the `buyersInCity` JSDoc block):

```typescript
/**
 * True iff `/sell/${citySlug}/` is a real page — i.e. some store with this
 * exact citySlug passes isBuyer(). Deliberately citySlug-only, no province
 * argument: it mirrors `/sell/[city]/index.astro`'s getStaticPaths(), which
 * also keys by citySlug alone (the sell route has no province segment in its
 * URL). Anything that links to a sell page must ask this question first —
 * see storeFaqs() in seo.ts, which linked unconditionally before this existed.
 */
export function sellPageExistsForCity(stores: Store[], citySlug: string): boolean {
  return stores.some((s) => s.citySlug === citySlug && isBuyer(s));
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run tests/unit/sell.test.ts`

Expected: PASS, 6 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/sell.ts tests/unit/sell.test.ts
git commit -m "feat: add sellPageExistsForCity, mirroring the sell route's actual build gate"
```

---

### Task 2: Stop `storeFaqs()` linking to a page that doesn't exist

**Files:**
- Modify: `src/lib/seo.ts:513-520` (the "Does X buy" FAQ block) and the `storeFaqs` function signature at line 513
- Modify: `tests/unit/store-seo.test.ts` (update call sites, add two tests)
- Modify: `src/pages/store/[slug]/index.astro:32` (the one call site)

**Interfaces:**
- Consumes: `sellPageExistsForCity` from Task 1.
- Produces: `storeFaqs(store: Store, provinceName: string, sellPageExists: boolean): FaqItem[]` — signature change from the current two-argument form. This is the only call site outside tests (`src/pages/store/[slug]/index.astro:32`), so the blast radius is small and fully covered by this task.

- [ ] **Step 1: Update the existing tests for the new signature first**

`tests/unit/store-seo.test.ts` currently calls `storeFaqs(store(), 'Alberta')` five times (lines 39, 46, 52, 58, 63). Update every call to pass a third argument. Since the fixture shop's `citySlug` is `'edmonton'` and its `services` include `'Buys'` by default, the natural default for these existing tests is `true` (a sell page exists for this fixture shop's own city) — that preserves every existing assertion unchanged. Replace all five call sites:

```typescript
storeFaqs(store(), 'Alberta')
```
→
```typescript
storeFaqs(store(), 'Alberta', true)
```

and at line 52:
```typescript
storeFaqs(s, 'Alberta')
```
→
```typescript
storeFaqs(s, 'Alberta', true)
```

Then add two new tests inside the existing `describe('storeFaqs', ...)` block, after the "says plainly when buying is not recorded" test:

```typescript
  it('links to the sell page when one exists for this city', () => {
    const buys = storeFaqs(store({ services: ['Sells'] }), 'Alberta', true).find((x) => /buy/i.test(x.question));
    expect(buys?.link?.href).toBe('/sell/edmonton/');
  });

  it('omits the sell-page link when no page exists for this city — the dead-link bug', () => {
    const buys = storeFaqs(store({ services: ['Sells'] }), 'Alberta', false).find((x) => /buy/i.test(x.question));
    expect(buys?.link).toBeUndefined();
    expect(buys?.answer).toMatch(/don't have|not listed|no information/i);
  });
```

The second test is the regression test for the actual bug: 194 store pages, in cities with no sell page, must stop carrying that link — the answer text itself is unaffected, only the link.

- [ ] **Step 2: Run the tests to confirm the new ones fail**

Run: `npx vitest run tests/unit/store-seo.test.ts`

Expected: the five pre-existing tests now FAIL too (wrong argument count against the not-yet-changed function isn't a TypeScript error at runtime for JS-shaped calls, but Vitest transpiles via esbuild without full type-checking, so this actually runs — expect it to fail specifically on the two new assertions, since `storeFaqs` doesn't use its third argument yet and still always attaches the link). If the whole file errors instead of failing individual tests, that also counts as confirming the change is needed — proceed to Step 3 either way.

- [ ] **Step 3: Change the function signature and the link condition**

In `src/lib/seo.ts`, add the import at the top of the file (find the existing `import` block and add):

```typescript
import { sellPageExistsForCity } from './sell';
```

Wait — check for a circular import first: `src/lib/sell.ts` already imports from `./seo` (`MIN_REVIEWS_FOR_TOP`, `byRecommendedRank`, `topRatedStore`, `type FaqItem`, per the top of `sell.ts`). Importing `sell.ts` back into `seo.ts` would create a circular dependency between the two modules.

**Do not add that import.** Instead, avoid the cycle by having the caller pass the boolean in, which is exactly what the signature change already does — `storeFaqs` does not need to import `sellPageExistsForCity` itself. Skip the import above entirely.

Now change the `storeFaqs` signature (currently `export function storeFaqs(store: Store, provinceName: string): FaqItem[] {`) to:

```typescript
export function storeFaqs(store: Store, provinceName: string, sellPageExists: boolean): FaqItem[] {
```

And update its JSDoc comment (the block starting `/**\n * FAQ entries for a shop page...`) to add one line documenting the new parameter — after the existing final sentence of that comment, add:

```
 *
 * `sellPageExists` gates the "shops that buy in {city}" link on the "do you
 * buy" answer: `/sell/${citySlug}/` is only a real page for cities with at
 * least one confirmed buyer (see sellPageExistsForCity in sell.ts). Linking
 * to it unconditionally shipped 194 dead links across cities with none —
 * this parameter is how that stays fixed.
```

Then change the buy-FAQ block (currently):

```typescript
  const buys = store.services.some((s) => /^buys$/i.test(s));
  faqs.push({
    question: `Does ${store.name} buy sports card collections?`,
    answer: buys
      ? `Yes — ${store.name} does buy collections as well as selling. Call ahead with what you have; most shops price on condition and what they're short of that week.`
      : `We don't have buying listed for ${store.name}. That often means we haven't confirmed it rather than that they won't — it's worth asking. Shops we've confirmed as buyers are on our sell page for ${store.city}.`,
    link: { href: `/sell/${store.citySlug}/`, label: `Shops that buy in ${store.city}` },
  });
```

to:

```typescript
  const buys = store.services.some((s) => /^buys$/i.test(s));
  faqs.push({
    question: `Does ${store.name} buy sports card collections?`,
    answer: buys
      ? `Yes — ${store.name} does buy collections as well as selling. Call ahead with what you have; most shops price on condition and what they're short of that week.`
      : `We don't have buying listed for ${store.name}. That often means we haven't confirmed it rather than that they won't — it's worth asking. Shops we've confirmed as buyers are on our sell page for ${store.city}.`,
    ...(sellPageExists && { link: { href: `/sell/${store.citySlug}/`, label: `Shops that buy in ${store.city}` } }),
  });
```

Note the answer text is unchanged even in the `false` case — it still says "Shops we've confirmed as buyers are on our sell page for {city}" as prose. That sentence is fine to keep as-is: it's describing the general feature, not asserting this specific city has one, and Task 2's own test only asserts the `link` is gone, not that the prose changes. Do not rewrite the prose — that would be solving a problem this task doesn't have.

- [ ] **Step 4: Run the unit tests to confirm they pass**

Run: `npx vitest run tests/unit/store-seo.test.ts`

Expected: PASS, 7 tests (5 original + 2 new).

- [ ] **Step 5: Update the one real call site**

In `src/pages/store/[slug]/index.astro`, find line 32:

```astro
const faqs = storeFaqs(store, provinceName);
```

You need `sellPageExistsForCity` and the full `stores` array in scope. Check the top of the file first — `storesJson` is already imported (it's how `getStaticPaths` builds every store page), so add the import and pass it through:

```astro
import { sellPageExistsForCity } from '../../../lib/sell';
```

then change line 32 to:

```astro
const faqs = storeFaqs(store, provinceName, sellPageExistsForCity(storesJson as Store[], store.citySlug));
```

`Store` should already be imported in this file (it's used for `storesJson as Store[]` patterns elsewhere in the codebase) — confirm the import exists; if the file only imports `type { Store }` check it's imported, and if not add `import type { Store } from '../../../lib/types';` (it is almost certainly already there, since this file already casts `storesJson as Store[]` in its own `getStaticPaths`).

- [ ] **Step 6: Full verification**

```bash
npm run typecheck
npm test
npm run build
```

Expected: typecheck clean; all unit tests pass (should be 239 + 6 new from Task 1 + 2 new from Task 2 = 247, but don't hardcode this number in an assertion anywhere — just confirm the run is green); build succeeds with no errors.

- [ ] **Step 7: Prove the actual bug is gone, against the real built site — not a sample**

This is the standard this plan is held to, same as plan 10: verify against the whole build, not a page or two.

```bash
python3 - <<'PY'
import json, pathlib, re

stores = json.load(open('src/data/stores.json'))
buyer_slugs = {s['citySlug'] for s in stores if any(t.strip().lower() == 'buys' for t in s['services'])}
no_buyer_slugs = {s['citySlug'] for s in stores} - buyer_slugs

dead = []
dist_store = pathlib.Path('dist/store')
for store_dir in dist_store.iterdir():
    if not store_dir.is_dir():
        continue
    html_path = store_dir / 'index.html'
    if not html_path.exists():
        continue
    html = html_path.read_text()
    for m in re.finditer(r'href="(/sell/([a-z0-9-]+)/)"', html):
        href, slug = m.group(1), m.group(2)
        if slug in no_buyer_slugs:
            dead.append((store_dir.name, href))

print(f'{len(dead)} dead /sell/ links remaining across the built store pages')
for slug, href in dead[:10]:
    print(f'  {slug} -> {href}')
PY
```

Expected output: `0 dead /sell/ links remaining across the built store pages`. If it's not zero, do not proceed — the fix is incomplete; go back and check whether `sellPageExistsForCity` was wired to the actual store's `citySlug` (not e.g. accidentally hardcoded or using the wrong field).

- [ ] **Step 8: Run the full e2e suite**

```bash
npx playwright test
```

Expected: same pass count as the end of plan 10 (101 passed, 3 pre-existing unrelated skips, 0 failed) — this task touches no page a Playwright spec targets directly, so no e2e test should change behavior, but run the full suite anyway to catch anything unexpected.

- [ ] **Step 9: Commit**

```bash
git add src/lib/seo.ts tests/unit/store-seo.test.ts "src/pages/store/[slug]/index.astro"
git commit -m "fix: stop 194 store pages linking to a sell page that was never built"
```

---

## Out of scope — flagged, not fixed

1. **`buysHere`/`cityBuys` in the store/city templates** (added in plan 10) check `services + sports` combined, while `isBuyer()` in `sell.ts` checks `services` only. Confirmed dormant — 0/689 live stores tag `'buys'` under `sports` — left alone per the prior review's finding. Unrelated to this plan's fix, which touches `storeFaqs()`, not those conditionals.
2. **`related-guides.ts`'s `'buys'` rule** references a guide slug (`tax-on-selling-sports-cards-canada`) not yet present in `guides.ts` at `HEAD` — self-resolves when the other session's in-progress tax-guide commit lands. Not this plan's concern.
3. **`/sell/[city]/index.astro`'s `getStaticPaths()` keys by `citySlug` alone**, with no province scoping — the same class of same-name-different-province collision fixed for `nearestCities()` in plan 10 (the Stratford ON/PE case) could in principle also affect this route if a city with buyers shares a `citySlug` with a same-named city in another province. Checked against the live data: **no such collision currently exists among the 107 buyer citySlugs** (verified by grouping `stores.json` buyers by `citySlug` and confirming each maps to exactly one province). Real risk, currently dormant, and the file it lives in belongs to the other in-progress session — flag, don't touch.

## Definition of done

- [ ] `npm test` passes, including the new `sell.test.ts` (6 tests) and the two new `store-seo.test.ts` cases.
- [ ] `npm run typecheck` reports no errors.
- [ ] `npm run build` succeeds.
- [ ] The Task 2 Step 7 script reports **zero** dead `/sell/` links across the built store pages — checked against the whole `dist/store/` tree, not a sample.
- [ ] `npx playwright test` passes at the same count as the end of plan 10.
- [ ] Nothing has been pushed to any remote.
- [ ] `src/pages/sell/[city]/index.astro` and the other four files/one new file belonging to the other in-progress session remain untouched.
