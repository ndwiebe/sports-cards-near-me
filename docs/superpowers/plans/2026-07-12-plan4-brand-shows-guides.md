# Plan 4: Brand Mark, Shows, Guides, Imagery

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Sonnet implements, Fable reviews, Sonnet fixes. Steps use checkboxes.

**Goal:** The premium layer on the launched national directory: a real brand mark, a card-shows section with verified seed data, the first two editorial guides, and imagery for both.

**Architecture:** All additive — new components/pages/data files; no changes to the map island, pins, or city-page script (Codex owns those files in parallel branches `codex/lazy-map`, `codex/pin-hardening`, `codex/city-fixes` — see docs/handoffs/2026-07-12-codex.md). Shows data lives in a new `Shows` tab of the Google Sheet, baked like stores. Guides are Astro content files.

**Conflict rules for this plan's implementers:** DO NOT touch: `src/scripts/map-core.ts`, `src/scripts/pins.ts`, `src/scripts/map-registry.ts`, `src/components/MapIsland.astro`, `src/pages/[province]/[city]/index.astro`, `src/pages/404.astro`, `tests/e2e/smoke.spec.ts` (new e2e goes in a NEW file `tests/e2e/plan4.spec.ts`), `tests/unit/pins.test.ts`. Base.astro MAY be edited (nav) — Codex is barred from it.

## Global Constraints
All prior Global Constraints stand (strict TS no `any`, no console.log, tokens per spec §3, refractor gradient's four sanctioned uses, complete HTML without JS, never push main; branch pushes auto-preview; domain deploys via main dispatch only).

---

### Task 1: Brand mark + favicon + header

**Files:** Create `src/components/Mark.astro`; modify `src/layouts/Base.astro` (header + favicon links); create `public/favicon.svg`.

The mark: a geometric "pin-slab" — a rounded-rectangle card shape with a pin-point notch at the bottom (a trading-card slab that IS a map pin), stroked in `--color-paper` on transparent, with a single 2px refractor-gradient accent line across its upper third (the card's "refractor line"). Pure inline SVG, ~24×28 viewBox, `currentColor`-friendly. Mark.astro props: `{ size?: number }` (default 24), decorative (`aria-hidden="true"`).

Header: `<Mark size={22} />` before the wordmark "Sports Cards Near Me"; wordmark stays `font-display uppercase`. favicon.svg = same SVG standalone with ink background rounded square; add `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` BEFORE the existing .ico link (SVG wins in modern browsers, .ico stays as fallback).

Acceptance: build green; header shows mark at desktop + 375px; favicon.svg served in dist; no layout shift (header height unchanged).

### Task 2: Shows data pipeline

**Files:** Create `scripts/bake-shows.ts`, `src/lib/shows.ts` (types + transform, TDD in `tests/unit/shows.test.ts`), `src/data/shows.json` (baked, committed).

Sheet gets a new `Shows` tab (controller creates it with headers before this task runs): `Show Name | City | Province | Venue | Address | Start Date | End Date | Hours | Admission | Website | Source URL | Recurring`. Dates ISO `YYYY-MM-DD`. `ShowRecord` type: slug (slugify name+city+startDate), name, city, citySlug, province (reuse ProvinceCode), venue?, address?, startDate, endDate?, hours?, admission?, website? (http(s)-validated like stores), sourceUrl?, recurring?. Transform drops rows without name/city/province/startDate. Bake fetches the Shows tab by sheet name (`sheet=Shows` gviz param — NOT gid), writes sorted by startDate. NO count guard (shows legitimately drop to zero). Add `"bake:shows": "tsx scripts/bake-shows.ts"` npm script, and run both bakes in CI (add `npm run bake:shows` after `npm run bake` in site.yml — this plan's ONE workflow edit; commit it on redesign; controller handles main).

Acceptance: unit tests for transform (valid row, missing-date drop, url validation, past-show retention); bake runs against the live tab (may bake 0 rows if researcher data hasn't landed — that's valid); tsc clean.

### Task 3: Shows pages

**Files:** Create `src/pages/shows/index.astro`, `src/pages/shows/[slug]/index.astro`; modify `src/layouts/Base.astro` nav (add "Shows"), `src/pages/index.astro` (add a small "Upcoming shows" strip below Busiest cities IF any future shows exist — server-rendered, omit entirely when none).

/shows: upcoming (show still running: its endDate — or startDate when single-day — ≥ build date; amended 2026-07-12 after review caught multi-day shows vanishing from "upcoming" on their second morning) grouped by month, then a collapsed "Past shows" list; empty state: "No upcoming shows listed yet — know one? Suggest it" linking /suggest/. Show detail: Event JSON-LD (`@type: Event`, location Place with address, startDate/endDate, offers if admission known) using the sanctioned `JSON.stringify(ld).replace(/</g,'\\u003c')` escape; fields render conditionally like store pages; refractor rule under h1; date formatting via `Intl.DateTimeFormat('en-CA', { dateStyle: 'long' })` at build time.

Build-date note: "upcoming" is computed at build time — acceptable because the site rebuilds daily (document this in a code comment — it's a real constraint the code can't show).

Acceptance: build green with 0-show and with-shows data; JSON-LD parses; nav link present on all pages; new e2e in `tests/e2e/plan4.spec.ts`: /shows returns 200 with either an upcoming show or the empty-state text.

### Task 4: First two guides

**Files:** Create `src/pages/guides/index.astro`, `src/pages/guides/psa-grading-submissions-canada.astro`, `src/pages/guides/best-card-shops-alberta.astro`; Base nav gains "Guides".

Content requirements (implementer DRAFTS, reviewer holds the bar): plain-language, collector-voice, Canadian specifics, NO fabricated facts — every concrete claim (prices, wait times, addresses) must come from the repo's own data (stores.json) or be framed as general guidance. The Alberta guide draws its shop mentions FROM stores.json (top-rated Alberta shops by rating/reviewCount — computed in frontmatter, so it never goes stale wrong). The PSA guide covers: what grading is, why Canadians face cross-border friction, the three routes (direct, via local shop drop-off — link stores filtered by "Grading Services", group submissions), realistic cost framing WITHOUT quoting exact current prices (they change; link PSA's pricing page instead). 900-1400 words each, h2 sections, one refractor rule under h1, Article JSON-LD (escaped), guide cards on /guides index using the cover images from Task 5 with graceful no-image fallback.

Acceptance: build green; both guides pass a read-aloud plain-language check by the reviewer; zero unverifiable specific claims; internal links to at least 3 store/city pages each.

### Task 5: Imagery (controller-executed — needs AI Chrome)

Guide covers via media-gen (`docs/media-gen-prompts.md` scenes 2 & 5 for the two shipped guides + regenerate list as needed) into `public/images/guide-*.webp`; wire into /guides cards + guide hero banners (same veil treatment as city banner). Controller runs generation; a Sonnet task wires files in.

### Task 6: Ship + verify

Full gates + `tests/e2e/plan4.spec.ts` additions (nav links, guides 200, shows 200); push redesign; controller dispatches main; live verification of /shows, /guides, both guide pages, nav, favicon.

## Seed data (parallel, controller-dispatched)
One Opus researcher collects verified upcoming Canadian card shows (sources: show organizer sites/pages, venue calendars, established recurring shows) into the same anti-hallucination contract → writes `docs/research/plan4-shows.md` table matching the Shows tab columns; controller pastes to the Shows tab via browser.
