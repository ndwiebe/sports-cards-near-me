# PRD: SCNM Q4 2026 — Grow traffic, fix taps, automate freshness, prep to sell

_Grilled with Nathan 2026-09-23. Source data: Search Console exports (Performance + Generative AI), 2026-07-28 → 2026-09-21._

_Revised 2026-09-23 after checking it against the repo and earlier decisions: the Pokémon finder, the closed-shop pages and round 1 of the title rewrites already exist, and city show pages were ruled out on 2026-08-27._

## Context

SportsCardsNearMe (SCNM) has been in Google for about 8 weeks. It has 1,130 clicks from 88k impressions (an impression is one time SCNM appeared in someone's search results). Weekly clicks grew from about 60 to about 230, and the average ranking position improved from 11 to 7.7. Google's AI answers showed SCNM about 1,600 times, so the eligibility check is passed.

Three problems stand in the way:

1. **Low click-through rate (CTR, the share of people who see a result and click it)** on the biggest searches. "card shops near me" got 2,458 impressions at 0.45% CTR. The Toronto, London, Ottawa and Mississauga city pages got 3–5k impressions each at 0.4–0.8%.
2. **Taps are near zero.** A tap is a visitor pressing Call, Directions or Website for a shop. There were only 7 site-wide as of Sept 4. That is what blocks selling: the existing rule requires 20 taps a month per city.
3. **Keeping the data fresh needs Nathan.** Show refreshes are manual, the closed-shop review is manual, and agents hand him CSV files to paste into the Google Sheet.

**Goal for the quarter:** grow traffic first, then earn money. Nathan's time budget is 1–3 hours a week (review only; agents do the building).

## Success metrics (measured Dec 21, 2026)

| Metric | Today | Target | Stretch |
|---|---|---|---|
| Google clicks/week | ~230 | **500** | 1,000 |
| Taps (Call, Directions, Website) per 100 site visits | ~0 (7 total) | tracked weekly, rising | 20+ taps/month in at least one city (sell-ready) |
| Nathan's hours per week spent on data upkeep | CSV pastes + manual refresh | ≤15 min (reading the weekly digest) | 0 |
| Show freshness | refreshed quarterly by hand | new shows appear within 7 days, automatically | — |

**When selling starts (unchanged from PLAN.md step 9):** a city can be sold once it has 100+ impressions a month, 90 days of history, and 20+ taps a month. Six cities already meet the impressions bar, and the 90 days arrive in late October.

## Phase 1: Taps and CTR (ship by Nov 15, before holiday searches peak)

**1a. Shop cards redesigned so visitors act.** Shop cards (`src/components/StoreCard.astro`) are the listing boxes on the city, Pokémon and sell pages. Today the whole card is one link to the shop's page, and Call, Directions and Website exist only on that shop page. Visitors are one extra tap away from acting, which likely explains the 7 taps.
- On mobile: full-width Call and Directions buttons. An "Open now" / "Closes at X" badge using the hours data that already exists. The nearest or top-ranked shop shown first.
- The click tracker (the tool that already counts taps, see `docs/click-tracking.md`) counts each button type separately. A weekly tap report goes into the digest.
- Rankings stay untouched. Order still comes from the existing rating and ranking logic.
- Test at a 375px-wide phone screen.

**1b. Round 2 of the titles and descriptions (the headline and summary text Google shows in results).** Round 1 shipped 2026-08-25 (`8bff32da`, `77317e47`). Measure it first: compare CTR before and after Aug 25, page by page, then rewrite only the pages that didn't improve. Start with the Toronto, London, Ottawa, Mississauga, Edmonton, Markham and Calgary city pages, the grading guide, and the provincial pages.
- Build them from real data, e.g. "12 card shops in London, ON — top rated 4.8★, 5 open Sundays".
- Include the "near me" wording naturally, since those searches make up most impressions.
- Track CTR for each page before and after, using Search Console exports at 2 and 4 weeks. Keep the versions that win.

**1c. Add unique local content to city pages that have 3+ shops.** Examples: shows coming up nearby, which shops grade or buy cards, typical opening hours. Pages with only 1 shop get no new content, because thin pages are a doorway-page risk (doorway pages are near-duplicate pages Google penalizes).

## Phase 2: Shows as the flagship, plus freshness automation (Oct–Nov, alongside Phase 1)

**2a. Automated show discovery.** A scheduled job (runs on its own every week) pulls from the existing show sources (TCDb, promoter sites) and adds new shows from trusted sources directly.
- **Recurring show pages:** one lasting page per recurring show (e.g. "Capital Trade Shows Ottawa"). It lists every upcoming date and keeps its Google ranking between events. The one-off pages for each date are kept.
- **Past shows:** once a show's date passes, its page stays up and links to that show's next date. It is not deleted, so it keeps its ranking.

**2b. Agents write to the sheet directly, and Nathan gets a weekly digest.** The sheet is the Google Sheet that holds all shop and show data.
- **Low-risk edits are applied automatically:** new shows from trusted sources, hours, ratings, logos.
- **Risky edits wait for a single approval in the digest:** deletes, merges, duplicates and renames.
- The digest is one weekly message listing what changed, what's waiting for approval, the tap and click trend, and anything failing.
- Guardrails: every write is logged, a row-count check fails loudly if a dataset shrinks unexpectedly (the shows and resellers builds lack this check today), and any change can be undone.

**2c. Closures handled automatically.** Closed-shop pages already exist: a sheet `status` column keeps the shop's page and removes it from listings (`src/lib/stores-build.ts`). What's missing is filling that column automatically. When the monthly refresh (`refresh-ratings.py`) sees Google mark a shop CLOSED_PERMANENTLY:
- Its page changes to "Permanently closed" and shows the nearest open shops. It keeps its ranking and sends visitors on.
- It drops out of city rankings. The change is noted in the digest and can be reversed.
- This replaces the manual `closure-review.csv` step.

## Phase 3: New pages, under a strict uniqueness rule (Nov–Dec)

**Rule (written into the PRD because it's what keeps Google from penalizing the site):** a new page ships only if it shows a set of shops or shows that no existing page has. Reworded copies of existing lists are never allowed. Reason: Google's own AI guidance names per-search-variation pages as "scaled content abuse" (see vault note 2026-08-27).

- **Pokémon/TCG section: improve, don't build.** `/pokemon/` already has 121 city pages, with 5,300 impressions at 0.77% CTR. Apply the Phase 1 card and title work there. Stop Google indexing (noindex) Pokémon city pages with only one shop, the same doorway-page rule used for city pages.
- **City show pages: dropped.** They were ruled out on 2026-08-27 (vault decision `2026-08-27-scnm-thin-city-pages-enrich-not-new-pages`); the enrichment of existing city pages replaced them.
- **More guides:** 2–3 new guides in the style of the grading and tax guides, which already rank and appear in AI answers. Topics are picked from queries in Search Console that have no matching page (e.g. selling cards in a given city, Beckett grading in Canada).
- **Excluded:** sport-specific shop lists (baseball, hockey and so on), because the data can't yet tell shops apart by sport.

## Phase 4: Prep to sell, but don't launch (Dec)

- Draft the "Paid advertisement" disclosure wording for the About, Privacy and FAQ pages, which currently say "does not run advertising" (PLAN.md gate G3). Ready, but kept switched off.
- Write the editorial-independence policy (the written promise that paying never affects rankings; PLAN.md step 14).
- Draft pricing and the order form for a Featured slot (1 per city). Nathan approves the numbers (gate G5).
- The Featured slot is built behind a switch that stays off until a city meets the selling rule.

## Out of scope this quarter

Selling anything or contacting shops (outreach stays paused). Sport-specific pages. New thin city pages. Any change to ranking logic. US expansion. Paid ads.

## How it gets built

- Sonnet builds and the strongest included model reviews each phase. Work goes on a branch and merges by pull request, and pushes to main need Nathan's go-ahead each time.
- Each phase gets its own implementation plan in `scnm-plan4/docs/superpowers/` before any code. This PRD is saved as `scnm-plan4/docs/PRD-q4-2026-growth.md`, with a decision note in the vault.
- Existing pieces to reuse: the click tracker, `refresh-ratings.py` (which already reads Google's `businessStatus`), the show refresh and payload verification (`bb8abca2`), the TCG tiering (`3263a8ed`), `redirects.json` plus its shadow test (the check that a redirect doesn't hide a live page, which needs extending to `/shows/` paths after the Aug 27 bug), and the traffic-bar status doc `docs/research/2026-09-04-traffic-bar-status.md`.

## Verification

- Every build: `npm run typecheck && npm test && npm run build`, page count checked against the previous build, and pages visually checked at 375px.
- Phase 1: compare Search Console CTR for each page at 2 and 4 weeks. The click tracker shows taps rising.
- Phase 2: a dry run of the show job with sheet writes pointed at a copy of the sheet first, then the live sheet. Test a closure with a known closed shop. The first weekly digest is reviewed by Nathan.
- Phase 3: every new page is checked against the uniqueness rule (a script confirms its shop or show set isn't a duplicate of an existing page).
- Monthly: export Search Console data and compare it with the metrics table.

## Risks

- **Google algorithm updates** could wipe out gains; we don't control them.
- **Winter show slowdown** could make show traffic look like it's failing when it's seasonal. Compare year-on-year where possible, and otherwise compare against impressions.
- **Agents writing to the sheet** is a new risk. The guardrails in 2b cover it, and the first two weeks run in review-everything mode before automatic writes are switched on.
- **Taps may stay low even after the redesign.** If so, the problem is the people visiting rather than the page layout, and selling would move to show organisers, whose pages get far higher CTR.
