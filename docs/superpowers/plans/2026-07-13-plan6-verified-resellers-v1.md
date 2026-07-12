# Plan 6: Verified Resellers v1

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Sonnet implements, Fable reviews, Sonnet fixes. Spec: docs/superpowers/specs/2026-07-12-verified-resellers-prd.md (APPROVED 2026-07-12 — §4 is the binding v1 spec; read it before any task).

**Goal:** Public, trusted profiles for storefront-less card sellers: /resellers/ index, per-reseller pages, join form, distinct city-centroid map pins — published via the existing sheet → bake → daily-rebuild machinery.

**Architecture:** All additive. New `Resellers` sheet tab (controller creates before Task 1 runs) → `scripts/bake-resellers.ts` → `src/data/resellers.json` → Astro pages. Map integration extends the existing pins/cluster system with a second, visually distinct marker class. No accounts, no login, no server.

**Conflict rules:** No other crews active — map files are OPEN this plan (Task 4 owns them exclusively). New e2e goes in a NEW file `tests/e2e/plan6.spec.ts`; never touch `tests/e2e/smoke.spec.ts` or `tests/unit/pins.test.ts` (extend pins coverage in a NEW unit file if needed).

## Global Constraints
All prior constraints stand: strict TS (`astro/tsconfigs/strictest`, no `any`), no console.log (`src/lib/log.ts` in scripts), design tokens per spec §3, refractor gradient's five sanctioned uses only, complete HTML without JS, TOKEN-OPTIONAL map (no/dummy Mapbox token → no errors, graceful fallback), the ONE sanctioned `set:html` = `JSON.stringify(ld).replace(/</g,'\\u003c')`, never push main (domain deploys via `gh workflow run site.yml --ref main` — main's workflow builds `ref: redesign`).

**Sheet-date rule (hard-won):** any date cell read via gviz parses the `Date(y,m0,d)` constructor from `v` as PRIMARY (month 0-indexed); display text `f` is locale-dependent fallback only. Copy `isoDate` from `src/lib/shows.ts`.

---

### Task 1: Resellers data pipeline

**Files:** Create `src/lib/resellers.ts` (+ TDD `tests/unit/resellers.test.ts`), `scripts/bake-resellers.ts`, `src/data/resellers.json` (baked, committed); modify `package.json` (add `"bake:resellers": "tsx scripts/bake-resellers.ts"`), `.github/workflows/site.yml` (add `npm run bake:resellers` after `bake:shows` — this plan's ONE workflow edit).

Sheet tab `Resellers` (controller creates with headers): `Display Name | City | Province | Bio | Photo URL | Specialties | eBay | Facebook | Instagram | Website | Contact | Status | Evidence | Notes | Verified Date`.

`ResellerRecord`: slug (slugify name+citySlug), name, city, citySlug, province (reuse ProvinceCode), bio?, photo? (http(s)-validated), specialties (string[] via splitList), ebay?, facebook?, instagram?, website? (each http(s)-validated via the `httpUrl` pattern in stores-build.ts), contact? (sanitized text), verifiedSince? (ISO date via the shows `isoDate` approach). **Only rows with `Status` exactly `Verified` (case-insensitive, trimmed) bake — everything else is invisible.** Drop rows missing name/city/province. `Evidence`/`Notes` are Nathan-private: NEVER baked into the JSON. No count guard (zero resellers is the launch state); per-row skip warnings like bake-shows.

Acceptance: unit tests (verified-row bakes; pending/rejected/blank-status dropped; Evidence/Notes absent from output; url validation; specialties split); live bake runs (0 rows valid); tsc clean.

### Task 2: Profile pages, index, nav, program copy

**Files:** Create `src/pages/resellers/index.astro`, `src/pages/resellers/[slug]/index.astro`; modify `src/layouts/Base.astro` (nav: "Resellers" after "Shows").

Profile per PRD §4.1: handle, SCNM Verified badge (paper text on `--color-well` chip with a 1px `--color-gold` border — no gradient; the five gradient uses are closed), city + province (linked to `/[province]/[citySlug]/` ONLY if that city exists in stores.json — compute, don't assume), photo with initials-chip fallback (reuse `initialsOf`), bio, specialty tags (store-tag chip styling), labeled outbound links (`rel="noopener nofollow"`, `target="_blank"`), optional contact line, "Report a problem" mailto link (hello@displaymycard.com subject-prefilled), the verified-meaning + revocation sentences from PRD §3 as a small footer block. JSON-LD `ProfilePage` (mainEntity Person: name, address {addressLocality, addressRegion}, sameAs = the outbound links) — sanctioned escape.

Index per PRD §4.2: cards grouped by province (provinces ordered as in PROVINCES), specialty filter chips (client enhancement, complete HTML first), program explainer + "Become a Verified Reseller" CTA → /resellers/join/, empty state ("Verified reseller profiles are coming — apply below") when resellers.json is empty. Nav link renders on all pages.

Acceptance: build green with 0-reseller AND with a fixture row (temporarily inject via test, not committed data); 375px clean; JSON-LD parses; e2e in plan6.spec.ts (/resellers/ 200 with explainer or cards; nav link).

### Task 3: Join form — /resellers/join/

**Files:** Create `src/pages/resellers/join/index.astro`. Read `src/pages/suggest.astro` FIRST and reuse its exact submission mechanism and styling.

Fields per PRD §4.4: display name/handle, city, province (select from PROVINCES), specialties (checkboxes), bio (maxlength 300), links (eBay/Facebook/Instagram/website), preferred public contact (optional, labeled "shown publicly if provided"), track-record evidence (URL + free text, labeled "private — never published"), consent checkbox (required): "I understand my profile will be public and verified status can be removed if credible problems are reported and confirmed."

Acceptance: form posts successfully via the suggest mechanism; required-field validation (HTML-native); e2e: page 200, form + consent checkbox present.

### Task 4: Map + city-page presence (owns map files this plan)

**Files:** Modify `src/lib/map-data.ts` (add `MapReseller` + `toMapResellers(resellers)` — city-centroid coords computed from the stores in that city; resellers in cities with NO store coords are list-only, excluded from map data — log at build, don't error), `src/scripts/pins.ts` (add `createResellerPinEl` — ghost/outline treatment: transparent fill, 1.5px `--color-prizm` dashed or outline border, person glyph or "R" initials, distinctly NOT a store chip), `src/scripts/map-core.ts` (second supercluster index for resellers, or a `kind` discriminator in one index — implementer's choice, document it), `src/components/MapIsland.astro` (payload gains resellers array — keep the escaped-JSON discipline), `src/pages/[province]/[city]/index.astro` ("Verified resellers in {city}" section below the store list, omitted when none), `src/pages/index.astro` (home map payload includes resellers).

Token-optional rule is ABSOLUTE: with no token, everything above must no-op exactly like store pins do (load-gated). Clicking a reseller pin opens a card linking the profile (mirror store-pin interaction). Cluster pins for multiple resellers per city show a count.

Acceptance: tokenless build + e2e green (fallback unchanged); with token (manual visual pass by controller/reviewer): reseller pin visually distinct at city centre, click-through works; unit tests for `toMapResellers` (centroid math, no-coords exclusion) in a NEW file `tests/unit/resellers-map.test.ts`; existing pins/map tests untouched and green.

### Task 5: Ship + verify

Full gates (`npm test`, `npx tsc --noEmit`, `npm run build`, `npm run test:e2e` — tokenless AND with token), push redesign, controller dispatches main workflow, live verification: /resellers/ 200, /resellers/join/ 200, nav on all pages, JSON-LD valid, 375px sweep of index + join + (fixture) profile.

## Controller pre-work (before Task 1)
1. Create the `Resellers` sheet tab with the §Task-1 headers (browser, clipboard paste).
2. After launch: seed recruitment — Nathan hand-invites 10–20 known resellers (PRD roadmap).

## Seed/launch note
resellers.json will be EMPTY at ship. That's the designed launch state: the join form is the product on day one. The index empty-state + form must therefore be as polished as any populated page.
