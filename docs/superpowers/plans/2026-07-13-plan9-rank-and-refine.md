# Plan 9: Rank & Refine — measurement, on-page authority, content, and site quality

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Sonnet builds, the strongest available model reviews (Fable if plan-included; else Opus — **Fable usage was exhausted 2026-07-12**). Steps use checkboxes. Written cold-start: §0 gives a fresh session everything.

**Goal:** Move sportscardsnearme.ca toward top rankings for its keywords and raise overall site quality. The on-page foundation is strong; this plan adds the measurement, the remaining on-page levers, more content lanes, and the product polish — and documents the off-page work that is NOT code (Nathan-led).

**Honest framing (tell Nathan, don't oversell):** #1 ranking is not a code switch. It needs (a) measurement so you can see what works, (b) the on-page levers below, (c) off-page authority (backlinks/mentions — Phase D, mostly not code), and (d) weeks-to-months of domain trust. This plan owns (a)-(c-code) and documents (c-human)+(d).

---

## §0. Orientation for a cold session (read once, believe it)

**Repo:** `ndwiebe/sports-cards-near-me`, branch **`redesign`** (NEVER commit main). Worktree convention: `~/Projects/8-Web-Apps/sports-cards-near-me` is the main checkout; create per-crew worktrees `~/Projects/8-Web-Apps/scnm-<name>` off `origin/redesign` for parallel work, remove when merged. Current redesign HEAD at plan authoring: `1299254`.

**Deploy (not the usual path):** live domain = GitHub Pages workflow mode. `main`'s `.github/workflows/site.yml` checks out **`ref: redesign`**, builds, deploys. Ship = `gh workflow run site.yml --ref main` then `gh run watch <id> --exit-status`. NEVER merge redesign→main. The daily 09:00 UTC cron rebuilds from the sheet.

**Gates (all four, both token modes when touching map/build):**
```
npm test            # Vitest, currently 137 passing
npx tsc --noEmit    # strictest (exactOptionalPropertyTypes + noUncheckedIndexedAccess), no any
npm run build       # currently 952 pages
npm run test:e2e    # Playwright, ~81 passing / 3 conditional skips
```
Tokenless mode: `PUBLIC_MAPBOX_TOKEN= npm run build && PUBLIC_MAPBOX_TOKEN= npm run test:e2e` — **`env -u` does NOT work** (Vite reloads `.env`); only an empty-string process var suppresses the token.

**Hard-won rules (violating = review-blocking defect):**
1. Sheet dates: gviz native date cells `{v:"Date(2026,6,10)", f:"<locale text>"}` — parse the `Date(y,m0,d)` constructor from `v` (month 0-indexed) as PRIMARY; `f` is locale-dependent fallback only. Canonical: `src/lib/shows.ts` `isoDate`.
2. XSS: the ONE sanctioned `set:html` is `ldJson(x)` in `src/lib/seo.ts` (= `JSON.stringify(x).replace(/</g,'\\u003c')`). Everything else normal Astro templating; DOM-from-data via createElement/textContent in scripts.
3. Token-optional map: no/empty token → `mountMap` returns null, shell collapses to text fallback. Anything added to the map path must no-op identically. Markers only render after map 'load'.
4. No console.log (scripts use `src/lib/log.ts`), no `any`, optional fields `?: T | undefined`.
5. Refractor gradient (`--gradient-refractor`) has EXACTLY 5 sanctioned uses — do not add a 6th.
6. Island→page handoff uses `src/scripts/map-registry.ts` (whenMapReady/registerMap), never CustomEvents.
7. Recommendation ranking: a shop needs ≥ `MIN_REVIEWS_FOR_TOP` (10) reviews to be crowned best/top-rated — use `topRatedStore` / `byRecommendedRank` from `src/lib/seo.ts`. Never crown a sub-10-review shop.
8. Copy: plain language, gloss jargon at first use, zero fabricated facts/prices (link authoritative sources).

**Data:** Google Sheet `14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I`; tabs Stores(gid 1588938698), Shows, Candidates, Resellers. Baked to `src/data/{stores,shows,resellers,logos}.json` at build (scripts/bake-*.ts), committed. 573 stores, 63 rated (median 93 reviews), 83 buyers/65 cities, 288 Pokémon/105 cities, 241 Magic shops.

**Existing SEO/GEO helpers to REUSE (src/lib/seo.ts):** `absoluteUrl`, `ldJson`, `breadcrumbListLd`, `itemListLd`, `faqPageLd`, `cityAnswerCapsule`, `cityFaqs`, `provinceAnswerCapsule`, `topRatedStore`, `byRecommendedRank`, `MIN_REVIEWS_FOR_TOP`. Lane libs: `src/lib/sell.ts`, `src/lib/tcg.ts`. Page dirs: `[province]/`, `sell/`, `pokemon/`, `shows/`, `guides/`, `resellers/`, `store/`.

**Current SEO state (audit 2026-07-12, docs/research/2026-07-12-seo-geo-keywords.md):** DONE = structured data + answer capsules + FAQ on city/province pages; Event/Article/Store schema; sell + pokemon lanes; 10-review floor site-wide; ecosystem cross-links (Phase 1). GAPS (this plan) = no analytics/GSC; no home Organization/WebSite schema; thin internal linking (city page links no sibling cities); city-page mobile perf 59 (map boots on load); Magic/show-index/French lanes not built.

**Model note:** Fable 5 usage exhausted 2026-07-12 (session hit limit). Use Opus for review until Fable resets. Sonnet builds.

**Cross-ref state:** Phase 1 SHIPPED (SCNM→DMC+SSC footer+callouts; CoinMyCard "coming soon", not in production). Phase 2 (DMC/SSC repos back-link SCNM) + Phase 3 (CMC when live) deferred — plan in vault `00-Inbox/2026-07-12-card-ecosystem-cross-ref-plan.md`.

---

## Phase A — MEASUREMENT (do first; gates knowing if anything else works)

### Task A1: Google Search Console + sitemap submission
**Human (Nathan):** verify domain ownership at search.google.com/search-console (DNS TXT or the HTML-tag method). If HTML-tag: hand the `<meta name="google-site-verification" content="...">` token to the implementer.
**Code:** add the verification meta to `src/layouts/Base.astro` `<head>` (gated so it only renders on the production build — a simple constant is fine). Confirm `sitemap-index.xml` is submitted in GSC. Acceptance: GSC shows "ownership verified" + sitemap "success".

### Task A2: Analytics
**Decision (Nathan):** PostHog (already in his stack) or Plausible (lighter, privacy-first, good for a content site). Recommend Plausible for a static content site; PostHog if he wants funnels/events.
**Code:** add the snippet to `Base.astro` (respecting no-JS-required: analytics is progressive). Add a custom event on ecosystem-link + callout clicks (so cross-link ROI is measurable). Acceptance: dashboard receives pageviews; an outbound-link click fires an event.

---

## Phase B — ON-PAGE RANKING LEVERS (code; I can build)

### Task B1: Richer internal linking (high value)
Each city page currently links no sibling cities — pages are crawl-islands. Add to `src/pages/[province]/[city]/index.astro`: a "Nearby cities" section (nearest N cities in the same province by `distanceKm` from `src/lib/map-data.ts`, computed from store centroids) + an "Other cities in {province}" compact list. Add to `src/pages/[province]/index.astro`: already lists cities (good) — ensure it links sell/pokemon lanes where they exist. Cross-link the lane pages (`/sell/[city]/`, `/pokemon/[city]/`) back to the general city page (already done) AND to each other when both exist. Acceptance: Calgary page links ≥5 other AB cities; internal-link count per city page ≥8; e2e asserts nearby-cities section present.

### Task B2: Home + global schema
Add to `src/pages/index.astro` (or Base.astro for site-wide): `WebSite` JSON-LD with a `SearchAction` (sitelinks search box) pointing at the site's search (see B4/E-search; if no search yet, point at `/` filtered) + `Organization` JSON-LD (name, url, logo=favicon/mark, sameAs to the social/sibling sites). Use `ldJson`. Acceptance: home has WebSite + Organization blocks that parse; Rich Results test passes.

### Task B3: City-page mobile speed — lazy-boot the map (Core Web Vitals)
City pages score 59/100 mobile (LCP 4.3s) because Mapbox boots on load. In `src/components/MapIsland.astro`'s script, defer `mountMap` until the map shell scrolls near viewport (`IntersectionObserver`) or the user taps a "Show map" affordance on mobile — NOT on initial load. Keep the token-optional fallback and the list-view default. Do NOT break the existing whenMapReady/registry handoff or the filter-sync. Measure before/after with Lighthouse mobile on a city page. Acceptance: city mobile performance ≥80; map still works on scroll/tap; all e2e green both token modes.

### Task B4: FAQ/HowTo schema on guides + breadcrumbs everywhere
Guides have Article schema; add `FAQPage` (if a guide has a Q/A section) and ensure BreadcrumbList on guides, shows, sell, pokemon, store pages (some have it, audit and fill gaps). Acceptance: every page type has a BreadcrumbList; Rich Results clean.

---

## Phase C — CONTENT EXPANSION (code; more queries to win)

### Task C1: Magic: The Gathering lane
Clone the Pokémon lane exactly (`src/lib/tcg.ts` already isolates Pokémon; generalize or add a parallel `magic` detection: sport/service tag `magic`, 241 shops). Build `/magic/` hub + `/magic/[city]/` per city with ≥1 Magic shop, same structured data + FAQ + threshold rules. Reuse everything. Nav: reachable via cross-links (don't overcrowd nav). Acceptance: pages build, honest FAQs, review passes edge cases (single-shop city, accents).

### Task C2: Show index pages
Per-province and per-year show index pages (`/shows/[province]/`, `/shows/2026/`) — competitors beat SCNM on granularity. Group the existing shows data; add BreadcrumbList + ItemList. Acceptance: indexes build from shows.json, no thin pages.

### Task C3: French-Québec pages (uncontested)
QC-city pages with French `<html lang="fr">` variants or French copy blocks for the top QC cities ("magasin de cartes [ville]"). Scope carefully (start with a French home + top-10 QC cities). Acceptance: valid hreflang, French copy plain + computed.

### Task C4: More guides (informational long-tails)
From the research's guide list: e.g. "card grading worth it", "how to spot fake cards", per-sport buying guides. Same guide pattern, computed shop mentions, no fabricated facts.

---

## Phase D — OFF-PAGE AUTHORITY (NOT code — Nathan-led; the real ceiling)

Document + enable, don't "build". Highest-leverage first:
1. **Shop backlinks / claim-your-listing.** Get the 573 shops to link to their SCNM page ("Find us on Sports Cards Near Me"). This is the strongest ranking signal AND the reseller/claim flywheel. Enable: a "claim/embed" badge page + outreach (SCNM's own data is the outreach list; could be a semi-automated email/DM system later).
2. **Show organizers** link back when listed; **card forums/Reddit/hobby directories** mentions; **Google Business Profile** for the directory brand.
3. **Digital PR data story:** "How many card shops are in Canada — the map" pitched to hobby newsletters/media → earns editorial links.
4. **Time + consistency:** daily rebuild + intake forms keep it fresh; rankings compound over weeks-months.
Track these in `~/jarvis-memory/_ops/WAITING-ON-NATHAN.md` and a dedicated off-page checklist.

---

## Phase E — SITE QUALITY / PRODUCT (code + Nathan)

- **E1 Store-page enrichment:** hours, click-to-call (`tel:`), "open now" (from hours), richer services — store pages are thin. (Data: some fields exist; may need sheet columns.)
- **E2 Global search:** a "find a shop near me" search/autocomplete across stores (client-side over baked JSON).
- **E3 Data quality:** the 9 address/city mismatches + 19 missing-coords rows (docs/sheet-cleanup.md, Nathan fixes in sheet); 2 shops with bad logos (brodie-s-gaming-guelph, forbes-hobbies-cambridge); logo coverage 341/573.
- **E4 Ratings freshness:** the Google Places periodic refresh (designed: vault `00-Inbox/2026-07-12-scnm-ratings-refresh-design.md`) — needs Nathan's ~15-min Google Cloud setup, then a scheduled bake writes fresh ratings to the sheet.
- **E5 Reseller network activation:** Nathan seed-invites 10-20 resellers (the /resellers/ pages are empty until then); measure via A2 events.
- **E6 Trust signals:** "last verified" dates on shops; the report-a-problem link (resellers have it, extend to shops).

---

## Recommended execution order
1. **Phase A (measurement)** — nothing else is verifiable without it. A1+A2 first.
2. **Phase B1 + B3** (internal linking + map speed) — highest on-page ROI, both help ranking + UX.
3. **Phase B2 + B4** (schema polish).
4. **Phase C1** (Magic lane — biggest remaining content lane).
5. **Phase E** product items as capacity allows; **Phase C2-C4** content as capacity allows.
6. **Phase D** is continuous Nathan-led off-page work — the real path to #1 alongside the above.

## Human-gated (route to WAITING-ON-NATHAN)
- A1 GSC domain verification (+ hand over the tag)
- A2 analytics choice (PostHog vs Plausible)
- E3 sheet data fixes (9 mismatches, 19 missing coords, 31 parked candidates, 2 bad logos)
- E4 Google Cloud setup for ratings refresh
- E5 seed-invite resellers
- D1-D3 off-page outreach
- Rotate Mapbox password + CF token (transited transcript)
