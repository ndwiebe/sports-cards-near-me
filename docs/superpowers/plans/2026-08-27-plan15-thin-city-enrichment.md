# Plan 15 — enrich thin one-shop city pages, no new pages

**Planned by Fable 5 · Executor: Codex (gpt-5.6-sol) · Review: Opus 5.**
Decision record: `~/jarvis-memory/decisions/2026/2026-08-27-scnm-thin-city-pages-enrich-not-new-pages.md`
(status: decided by Nathan 2026-08-27 — "do second skip the first", meaning: enrich existing
pages, do NOT build new per-city show pages as a distinct page type).

Lane: **pages** + **lib** (`src/pages/[province]/[city]/index.astro`, `src/lib/nearby.ts`).
Claim in `SESSIONS.md` before starting.

---

## Why this exists

248 city pages carry a shop; **146 have exactly one**. Google's own spam policy language
("pages targeted at specific regions... that funnel users to one page") puts these close to
doorway-page territory (full finding:
`~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-doorway-page-risk-city-pages.md`). The fix
is real content on the pages that already exist, not new pages — building new per-city show
pages was explicitly rejected the same day as too close to Google's own named
"per-query-variation" spam pattern.

## Part A — nearby shops on thin city pages

The city page already has `nearestCities` (`src/lib/nearby.ts`), which links to *other city
pages*. That's not what's needed here — a visitor on a one-shop city page should see the
*actual nearby shops themselves*, not another city link one more click away.

1. Add a new function to `src/lib/nearby.ts`, alongside `nearestStores` and `nearestCities`:

   ```ts
   export function nearestStoresToCity(
     all: Store[],
     originProvince: ProvinceCode,
     citySlug: string,
     opts: { limit?: number; maxKm?: number } = {},
   ): Store[]
   ```

   Reuse the existing `cityCentres()` helper for the origin point (same pattern
   `nearestCities` already uses) — do not duplicate the centroid math. Exclude stores
   already IN that city (they're already listed on the page). Default `maxKm` should match
   `nearestCities`'s 150km — a city-to-city radius, not the store-to-store 75km default,
   since this is meant to answer "what else is within a reasonable drive of this town,"
   not "what's next door." Sort by distance, tie-break by slug, same convention as the
   other two functions.

2. In `src/pages/[province]/[city]/index.astro`: when `cityGroup.stores.length === 1` (or a
   named threshold constant — your call, but name it, don't hardcode `1` inline), render a
   "Nearby shops" section using `nearestStoresToCity`. Reuse the existing `StoreCard`
   component already imported on this page — do not build a new card layout.
   - If the result is empty (a genuinely isolated town), render nothing. An empty section
     header is worse than no section.
   - Cap at a small number (5-ish) — this is a supplement, not a second directory.

3. **Do not touch multi-shop city pages.** This section is specifically for the thin ones;
   a city with 3+ shops doesn't have the problem this plan is fixing.

## Part B — province shows, inline, no distance math

The city page currently only *links out* to `/shows/{province}-{year}/` via `showsUrl`. Add
a small inline list of that province's next few upcoming shows directly on the city page —
this needs no distance calculation (shows lack coordinates; do not attempt to fake one).

1. Filter `showsJson` (already imported on this page) to the current province, upcoming
   only (`startDate >= today`, using the same date-comparison convention already used
   elsewhere in this codebase — check `shows.ts` for the established helper, don't
   reinvent). Sort by date. Cap at ~5.
2. Render as a small list linking to each show's own detail page. Keep the existing
   `showsUrl` "see full calendar" link too — this supplements it, doesn't replace it.
3. Render for every city page, not just thin ones — this part has no risk profile requiring
   the same-city gating Part A has (it doesn't add page count or claim proximity, it just
   surfaces real upcoming events in the same province).

## Hard rules

1. Reuse `nearby.ts` patterns — this plan is explicitly about not inventing new distance
   logic when working logic already exists.
2. No new page routes. Every change lands inside the existing city page template.
3. Don't touch `src/data/*.json` — read-only, as always (`CLAUDE.md` trap 1).
4. Don't `git add -A`. Explicit paths.
5. If you find shows.json genuinely does carry usable coordinates already (verify, don't
   assume), Part B can use real distance — but confirm this against the actual data before
   changing the approach; the plan's default assumption is that it doesn't.

## Definition of done

- [ ] `nearestStoresToCity` added to `nearby.ts`, follows the existing `nearestCities`
      pattern, has unit tests (mirror `tests/unit/nearby.test.ts` if it exists — check first)
- [ ] Thin city pages (1-shop) show a "Nearby shops" section using real `StoreCard`s;
      multi-shop pages unchanged; empty-result case renders nothing
- [ ] Every city page shows a small inline list of the province's next upcoming shows
- [ ] `npm run typecheck && npm test && npm run build` all pass
- [ ] `git status` shows only the files this plan names — no scope creep
- [ ] Report exact before/after counts: how many city pages changed, page-count delta
      (should be 0 — no new routes), and a couple of real example URLs to spot-check
