# Q4 sell-prep + two new guides — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two separate workstreams under one worktree.

**A. Sell-prep** — draft the disclosure audit, editorial-independence policy, and Featured
pricing (PLAN.md gates G3/G5, steps 9/14/15/16), plus a `featuredPlacements` library behind a
build-time flag that is OFF by default. Nothing on the live site changes; no page wiring.

**B. Two new guides** — picked from Search Console queries with no matching page, in the style
of the existing guides, registered wherever guides are listed.

**Spec:** `PLAN.md` gates G3/G5, steps 9/14/15/16. `docs/PRD-q4-2026-growth.md` Phase 3 ("more
guides") and Phase 4 ("prep to sell"). Vault note:
`~/jarvis-memory/decisions/2026/2026-07-29-scnm-publishing-standards.md`.

**Worktree:** `~/Projects/8-Web-Apps/scnm-q4-sellprep` on branch `q4-sellprep`. `npm ci` once first.

## Global constraints

- Don't touch `src/components/StoreCard.astro`, the city page template, `src/lib/seo.ts`
  (titles/SEO — another agent's lane), shows/sheet automation files, or `src/data/*.json`.
- No page wiring for Featured — library + tests only, flag OFF by default.
- Don't change live copy on `about.astro` / `privacy.astro` / any page — sell-prep docs are
  drafts for Nathan to approve.
- TypeScript strict, no `any`. No `console.log`. Stage explicit paths only, never `git add -A`.
- Before every commit: `npm run typecheck && npm test`. Before the final commit also
  `npm run build` — page count must be 1548 (baseline) + 2 (new guides) = 1550.
- Every factual claim in the guides needs a source actually opened (primary source preferred);
  no invented numbers. Guides must not duplicate an existing guide's content.
- Git identity `Nathan Wiebe <dominathan@gmail.com>`; commit messages end with the
  Co-Authored-By/Claude-Session lines given in the task.

## Pre-work finding (read before Task 1)

**PLAN.md's G3 ("Disclosure audit") already shipped on 2026-07-31**, commit `7203a625f`
("G3: stop claiming money can never touch this site"), verified against `dist` at the time
(1305 pages, all six old strings absent, all six new ones present). `PLAN.md` itself was never
updated to mark it done (unlike G2, which has a ✅). A fresh grep today
(`grep -rn "does not run advertising\|no arrangement" src/`) finds nothing live. So Task 1's
deliverable is an audit-and-confirm doc plus ready-to-flip launch-day copy, not a rewrite of
false claims — see Task 1 for the adjusted scope and why.

---

### Task 1: `docs/monetisation/disclosure-copy.md`

**File:** Create `docs/monetisation/disclosure-copy.md` (new directory).

Content:
1. State plainly that G3 already shipped 2026-07-31 (`7203a625f`) and PLAN.md's gate line is
   stale (recommend Nathan update it — do not edit `PLAN.md` unilaterally, it's a shared file
   other parallel agents reference).
2. A fresh audit table: every file:line today that mentions advertising/arrangement/pay-to-rank
   language (about.astro, privacy.astro, the FAQ embedded in about.astro, `seo.ts`'s FAQ
   builders, `llms.txt.ts`, guide pages, `StoreCard.astro`/store detail page), quoting the
   current text and confirming none of it makes the false "does not run advertising" /
   "no arrangement" claim. Distinguish two different things that exist today: (a) narrative
   disclosure copy (About/Privacy/FAQ) already written in forward-looking language, true both
   today and after Featured launches; (b) the on-page "Paid advertisement" label itself, which
   doesn't exist yet because no Featured surface is built (confirmed by inspecting
   `StoreCard.astro` and the store detail page — no ring/label present, matching PLAN.md step 5's
   note that the "featured ring" is still just a design spec).
3. **Launch-day copy** — the one real gap: About's Independence section and FAQ answer, and
   Privacy's two paragraphs, are written in future tense ("if a paid Featured listing appears...
   in future", "nothing of that kind is running yet"). Draft the present-tense replacement for
   each of those four passages, ready to paste in on the day Featured actually goes live, each
   with its current file:line. Mark the section DRAFT, not for use until Nathan flips the switch.
4. Cross-reference the exact "Paid advertisement" / `rel="sponsored"` label text to the
   `src/lib/featured.ts` constants built in Task 4, so there's one source of truth for the
   wording rather than two copies that can drift.

No test needed (pure docs). Read `about.astro`, `privacy.astro`, `llms.txt.ts`,
`card-grading-companies-canada.astro`'s FAQ pattern, and `StoreCard.astro`/store detail page
first (read-only) to gather the file:line evidence.

- [ ] Write `docs/monetisation/disclosure-copy.md`

---

### Task 2: `docs/monetisation/editorial-independence-policy.md`

**File:** Create `docs/monetisation/editorial-independence-policy.md`.

Per PLAN.md step 14: written BEFORE the first client. Must prohibit, in writing:
- Ranking intervention of any kind for a paying client.
- Preferential handling of corrections for a paying client.
- Review or rating manipulation.
- Unequal data-refresh treatment for clients vs. non-clients.
With: an auditable exception process (any deviation needs a named reason recorded, not a
silent judgment call), a disclosure requirement (services clients get a visible marker on
their listing with contractual consent — separate from Featured's own label), and a testable
commitment: "relationship fields cannot reach any ranking function" — tie this explicitly to
Task 4's ranking-invariance test as the enforcement mechanism, and to `bySportsCardRank` /
`byRecommendedRank` / `rankScore` in `seo.ts` (read-only reference, do not edit) as the
functions that must never read a commercial field.

Plain English throughout (Nathan is a CPA, not an engineer) — define "ranking function",
"relationship field" etc. in parentheses on first use.

- [ ] Write `docs/monetisation/editorial-independence-policy.md`

---

### Task 3: `docs/monetisation/featured-pricing-and-order-form.md`

**File:** Create `docs/monetisation/featured-pricing-and-order-form.md`. Mark **DRAFT — for
Nathan to approve (gate G5)** at the top.

Base pricing reasoning on:
- The sellability rule (PLAN.md step 9 / PRD Phase 4): 100+ impressions/month, 90 days of
  Search Console history, 20+ taps/month, per city.
- Current status from `docs/research/2026-09-04-traffic-bar-status.md`: 6 cities already clear
  the impressions bar (London, Toronto, Ottawa, Mississauga, Edmonton, Markham); taps are the
  binding constraint (7 total site-wide as of the last count); earliest honest sale ~late
  October 2026 for the 90-day mark, later still for taps.
- Slot cap: ONE Featured slot per city (PLAN.md step 7, decided 2026-07-31 — not a range).

Give 2–3 price options with reasoning (e.g., flat monthly rate vs. a low/standard tier once
more cities clear the bar vs. a founding-cities discount for the first ~6 sellable cities).
Cover, per gate G5: price, term, seller of record, GST/HST (Nathan collects/remits — note he's
a CPA and this is his call, but state the mechanics plainly: is SCNM/Nathan selling as a sole
proprietor, HST registration status, invoicing requirements), renewal, cancellation, refunds,
chargebacks, content rejection, removal rights, and a performance disclaimer (Featured buys
visibility, not results — no promised clicks/taps/sales). Plain English.

Flag the known open gap from PLAN.md step 3 (immutable store ID vs. slug — see Task 4) as
something to resolve before real money changes hands, not before this draft.

- [ ] Write `docs/monetisation/featured-pricing-and-order-form.md`

---

### Task 4: `src/lib/featured.ts` — typed placement data behind an OFF-by-default flag

**Files:**
- Create: `src/lib/featured.ts`
- Create: `tests/unit/featured.test.ts`

**Interfaces:**
```ts
export interface FeaturedPlacement {
  id: string;
  storeSlug: string; // see file-level comment: PLAN.md step 3 flags slug reassignment risk
  province: ProvinceCode;
  citySlug: string;
  startUtc: string; // ISO 8601, UTC
  endUtc: string;   // ISO 8601, UTC
}

export const FEATURED_LABEL = 'Paid advertisement';
export const FEATURED_LINK_REL = 'sponsored noopener'; // PLAN.md step 6

export const FEATURED_PLACEMENTS_ENABLED: boolean; // from import.meta.env.PUBLIC_FEATURED_PLACEMENTS_ENABLED, defaults false

export function isPlacementActive(placement: FeaturedPlacement, now?: Date): boolean;

export function selectActiveFeaturedPlacements(
  placements: FeaturedPlacement[],
  opts: { province: ProvinceCode; citySlug: string; now?: Date; enabled: boolean },
): FeaturedPlacement[];
```

`selectActiveFeaturedPlacements` takes `enabled` as an explicit parameter (rather than only
reading the module-level flag) so both the off-by-default state and the flag-off behavior are
directly testable without fighting Vite's build-time env substitution. `FEATURED_PLACEMENTS_ENABLED`
is the real flag future page-wiring would pass in.

File-level comment must flag, not silently resolve: PLAN.md step 3 requires keying placements
to an **immutable store ID**, never the slug, because slugs are regenerated from `name + city`
and de-duplicated by row order (`stores-build.ts`) — a rename or row reorder can silently
reassign a slug to a different business. This task's literal spec calls for `storeSlug`, and
no immutable ID column exists in the sheet yet (out of scope here — that's a data-lane change).
Documented as a known gap in `featured-pricing-and-order-form.md`, not fixed silently.

- [ ] **Step 1: Write failing tests** in `tests/unit/featured.test.ts`:
  - expired placement (`endUtc` in the past) is never in `selectActiveFeaturedPlacements`'s output
  - not-yet-started placement (`startUtc` in the future) is never in the output
  - a placement exactly inside its window IS returned when `enabled: true`
  - `enabled: false` returns `[]` even for a valid, active, in-city placement (flag-off test)
  - `FEATURED_PLACEMENTS_ENABLED` is `false` by default (no env var set in the test run)
  - **ranking invariance**: build 3 stores with distinct ratings/review counts, sort with
    `byRecommendedRank` from `../../src/lib/seo` to get a baseline order; give the worst-ranked
    store an active, in-window, in-city placement; assert `[...stores].sort(byRecommendedRank)`
    still produces the identical order — the placement does not move it up
  - label reads exactly `'Paid advertisement'` and rel is `'sponsored noopener'`
  - a placement for a different city, or a different province with the same city slug, is excluded

  Run: `npx vitest run tests/unit/featured.test.ts` — expect FAIL (module doesn't exist).

- [ ] **Step 2: Implement `src/lib/featured.ts`**

- [ ] **Step 3: Run `npm run typecheck && npm test`** — all green, no regressions elsewhere.

- [ ] **Step 4: Commit** `src/lib/featured.ts` + `tests/unit/featured.test.ts` explicitly.

---

### Task 5: Pick the two guide topics from Search Console data

Source: `/Users/nathanwiebe/.claude/uploads/d4a177a3-4de0-4e36-82b2-a3f839bf7412/e84d971b-*.xlsx`,
`Queries` sheet (1000 rows, parsed via a scratch Python script — no xlsx library in this repo).

Findings (full method + numbers kept in the scratch dir, not committed):
- Dominant ungapped cluster: **Beckett/BGS grading** — "beckett grading canada" (147 impr, pos
  10.0), "beckett grading canada locations" (21, pos 10.6), "does beckett grade in canada" (19,
  pos 10.3), "beckett grading" (17, pos 14.2), "bgs grading canada" (16, pos 13.4), "beckett
  canada" (14, pos 11.7), plus five smaller variants — combined ≈254 impressions, positions
  10–25, near-zero clicks. `card-grading-companies-canada.astro` only gives Beckett a few
  sentences inside a 4-way comparison; no dedicated page exists. PRD Phase 3 names "Beckett
  grading in Canada" as an example topic directly.
- Second cluster: **SGC + CGC grading** — "sgc grading canada" (60, pos 10.1), "cgc grading
  canada" (10, pos 25.6), "sgc grading" (11, pos 21.1), "sgc card grading canada" (5, pos 10.0)
  — combined ≈86 impressions, positions 10–26. Both get only a one-line mention each in the
  comparison guide; genuinely different companies (SGC: vintage specialist, 1998, recently
  acquired by Collectors/PSA's parent; CGC: newest major entrant, membership-tier pricing,
  cross-over-from-other-graders service) with room for real depth.
- Ruled out: individual shop-name queries (hundreds of rows, e.g. "total sports cards",
  "mintink ajax") — store-page SEO, not a guide topic, out of this lane. City-name searches
  ("sports cards toronto") — already served by city pages. "sports memorabilia" cluster
  (~235 impr) — investigated, dropped: PSA and JSA (the two primary-source authenticators)
  both block static fetching (403 / JS-only rendering) and no Canadian memorabilia-specific
  auction house could be confirmed from a source actually opened, so writing it now would risk
  under-sourced or invented claims. Left for a future pass with a proper research tool.

**Decision:** Guide 1 = Beckett-specific. Guide 2 = SGC & CGC (the two non-PSA, non-Beckett
major graders), justified by their combined query cluster and by having real, directly-opened
sourcing for both (see Task 6/7).

- [ ] No code — record this decision inline in the plan (done above) and in each guide's
  commit message with the exact query/impressions/position figures.

---

### Task 6: Guide — `src/pages/guides/beckett-grading-canada.astro`

**Files:**
- Create: `src/pages/guides/beckett-grading-canada.astro`
- Modify: `src/lib/guides.ts` (add entry)
- Modify: `src/lib/related-guides.ts` (add slug to the `grading` `TAG_RULES` entry)

**Sources actually opened (cite in-page and in the commit message):**
- `beckett.com/grading` → redirects to `maintenance.beckett.com` (confirmed via WebFetch,
  2026-09-23): Beckett's grading intake is currently running a **temporary submission form**
  (Base/Standard/Express tiers only), submissions ship to "Beckett, 2700 Summit Ave., Suite 100,
  Plano, TX 75074", payment is confirmed by email after review (not collected up front), and
  in-person drop-off/pickup exists only at Beckett HQ in Plano by appointment — confirming
  Beckett has **no Canadian receiving location**, which directly answers "does beckett grade in
  canada".
  - Same content also served from `beckett.com/grading-scale` and `beckett.com/grading/submit-cards`
    (client-side routed SPA — same shell), fetched via `defuddle parse` to cross-check the
    WebFetch read.
- Sports Collectors Digest, "History of card grading" (sportscollectorsdigest.com, fetched via
  `defuddle parse`): Beckett Grading Services launched 1999 (magazine itself founded 1984); BGS's
  distinguishing features are its four printed subgrades (centering, corners, edges, surface),
  the half-point scale (a card can grade 9.5), and sonically-sealed cases with an inner
  protective sleeve; as of the article, BGS had graded over 12 million items.
- The site's own `card-grading-companies-canada.astro` (already-published, previously verified
  2026-07-28) for the pricing-table figures already fact-checked there — reused, not
  re-invented, and flagged in-page as "as posted 2026-07-28, confirm current" per that guide's
  own disclaimer pattern.
- Black Label / Pristine-10 subgrade mechanics: widely and consistently documented across
  multiple independent grading-reference sites (WebSearch), used only for the general,
  uncontested mechanic (all four subgrades must be a perfect 10 for the black label), not for
  any number specific enough to go stale.

**Content, in the site's existing style** (capsule, FAQ w/ FAQPage JSON-LD, Article JSON-LD,
Byline, CrossLinkCallout to Slab Savvy CPA):
- What makes BGS different from PSA/SGC/CGC: the four printed subgrades and half-point scale.
- Black Label / Pristine 10 explained.
- The current (as of this research) submission reality: temporary form, Plano TX shipping
  address, no Canadian drop-off, payment-after-review — this is genuinely new information the
  comparison guide doesn't have (it predates the maintenance-mode change).
- Direct answer to "does Beckett grade in Canada?" — no.
- Cross-links: `/guides/card-grading-companies-canada/` (comparison), `/guides/card-grading-101/`
  (whether to grade at all), `/sell/` hub.
- No shop-list section — unlike the comparison guide, this one has no Beckett-specific
  storefront in the directory to list, so it stays purely informational (matches the tax/fake-
  spotting guides' pattern, not the comparison guide's shop-list pattern).

Must NOT use "highest-rated" / "top-rated" / "best-rated" (repo-wide
`superlative-claims.test.ts` scans all `.astro`/`.ts` under `src/`).

- [ ] Write the guide, add to `GUIDES` in `guides.ts`, add slug to `related-guides.ts`'s
      `grading` rule
- [ ] `npm run typecheck && npm test`
- [ ] Commit, with the query/impressions/position justification in the message

---

### Task 7: Guide — `src/pages/guides/sgc-cgc-grading-canada.astro`

**Files:**
- Create: `src/pages/guides/sgc-cgc-grading-canada.astro`
- Modify: `src/lib/guides.ts`
- Modify: `src/lib/related-guides.ts`

**Sources actually opened:**
- `cgccards.com/submit/services-fees/cgc-grading/` (defuddle parse, 2026-09-23, fee-chart PDF
  stamped 2026-03-24): full current CGC Cards tier table — Bulk ($17/card, ≤$500 value, 150
  days, 25-card min.), Economy ($20/card, ≤$1,000, 90 days), Standard ($55/card, ≤$3,000, 10
  days), Express ($100/card, ≤$10,000, 5 days), WalkThrough ($300/card, ≤$100,000, 2 days),
  Unlimited Value ($300 + 1% FMV, 2 days), Jumbo Card and TCG/sports/non-sports coin tiers ($20,
  120 days); membership discounts (Associate/Premium 10%, Elite 20%); the CrossOver service
  (a PSA/Beckett/SGC-holdered card evaluated for CGC certification); ReHolder ($10, 20 days).
- Sports Collectors Digest history article (same source as Task 6): SGC opened July 1998,
  founded/run by Dave Forman; used a 1–100 scale for its first 20 years, switched to the
  standard 1–10 scale in 2018; built its reputation on vintage but now grades more modern cards
  than vintage by volume; known for low grader turnover and fast turnaround.
- Sports Collectors Digest, "Collectors, PSA acquire card-grading rival SGC" (defuddle parse):
  SGC is based in Boca Raton, FL; acquired by Collectors (PSA's parent company), announced by
  SGC president Peter Steinberg, who continues to run SGC day-to-day; SGC remains a separate
  brand; per GemRate, PSA holds roughly 78% market share, ahead of CGC, SGC and Beckett.
- SGC's own site (`gosgc.com`) could not be fetched — it is a client-rendered app that returns
  no static content to `defuddle`, `WebFetch`, or a plain `curl`. Documented in-page as: "SGC's
  current per-card pricing isn't independently verifiable from their site as of this writing —
  check gosgc.com directly before submitting," the same honest non-fabrication pattern the
  existing comparison guide already uses for PSA's own pricing.

**Content:**
- Frames SGC and CGC as "the other two majors" — distinct from Beckett (Task 6) and from PSA
  (already has two dedicated guides).
- SGC: history, the 1–100 → 1–10 scale switch (2018), the 2024 Collectors/PSA acquisition and
  what "remains independent" means in practice, vintage reputation vs. current modern-card
  volume, no Canadian drop-off (same customs/cross-border framing as the comparison guide, not
  re-derived).
- CGC: full current tier table (real numbers, sourced above), membership discounts, the
  CrossOver service explained (useful specifically for someone with an existing PSA/Beckett/SGC
  card), no Canadian drop-off.
- Direct FAQ answers for "sgc grading canada" / "cgc grading canada" style queries.
- Cross-links: `/guides/card-grading-companies-canada/`, `/guides/beckett-grading-canada/`
  (Task 6, mutual cross-link), `/guides/card-grading-101/`.

- [ ] Write the guide, add to `GUIDES`, add slug to `related-guides.ts`
- [ ] `npm run typecheck && npm test`
- [ ] Commit, with query/impressions/position justification in the message

---

### Task 8: Register + cross-link + e2e test

**Files:**
- Modify: `src/pages/guides/card-grading-companies-canada.astro` (add two outbound links to the
  new guides — mirrors the tax-cluster pattern where the hub guide links out to its cluster)
- Create: `tests/e2e/grading-guide-cluster.spec.ts` (mirrors `tests/e2e/tax-guide-cluster.spec.ts`)

The guides index (`src/pages/guides/index.astro`) and `llms.txt.ts` need no changes — both
render from the `GUIDES` array automatically. No manual sitemap file exists (`@astrojs/sitemap`
generates it from built routes).

e2e test, following the tax-cluster pattern exactly:
- Each new guide renders its H1, and its JSON-LD types are exactly
  `{BreadcrumbList, Article, FAQPage}`.
- Each new guide has a Slab Savvy CPA `CrossLinkCallout` link.
- No horizontal scroll at any viewport (existing pattern).
- The comparison guide (`card-grading-companies-canada`) links to both new guides.
- The guides index lists both new guides.
- Both new guides cross-link to each other.

- [ ] Write the e2e test
- [ ] Add the two outbound links to the comparison guide
- [ ] `npm run typecheck && npm test`
- [ ] Commit

---

### Task 9: Final build + screenshots + verification

- [ ] `npm run build` — expect **1550 pages** (1548 baseline + 2 new guides). If it's not 1550,
      stop and investigate before committing further — don't paper over a mismatch.
- [ ] Screenshot both new guides at 375px width to
      `/private/tmp/claude-501/-Users-nathanwiebe-Projects/d4a177a3-4de0-4e36-82b2-a3f839bf7412/scratchpad/guide-beckett-grading-canada.png`
      and `guide-sgc-cgc-grading-canada.png` (via `npm run preview` + a headless browser at
      375×812), and actually look at them — check the FAQ, table (guide 2), and CrossLinkCallout
      render cleanly with no overflow.
- [ ] Run `npx playwright test tests/e2e/grading-guide-cluster.spec.ts` (mobile-375 + desktop
      projects) to confirm the e2e assertions pass against the real build.
- [ ] Report final `npm run typecheck && npm test` and `npm run build` output lines.

---

## Out of scope (explicitly, so it isn't silently attempted)

- Any page wiring for Featured (no StoreCard/city-template edits).
- The reservation ledger, overlap/slot-cap enforcement, or the immutable-store-ID migration
  (PLAN.md steps 3/7) — flagged as gaps in the docs, not built.
- Editing `about.astro` / `privacy.astro` live copy.
- Editing `PLAN.md`'s G3 status marker (flagged for Nathan instead).
- Sports memorabilia guide (investigated, dropped for sourcing reasons — see Task 5).
