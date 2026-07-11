# Goal evidence — "make sportscardsnearme a premium website" (2026-07-09 → 07-11 overnight session)

Nathan's goal, verbatim: review the site in GitHub; use Opus to find top similar directory
websites as references; switch back to Fable; use ui/ux + impeccable skills and 21st.dev to make
this a premium website; 3D map with the stores' logos as the pins; animation and generated
images; ask clarifying questions until 95% confident.

Where each piece happened and where its artifact lives:

## 1. Site review ✓
Full audit of `ndwiebe/sports-cards-near-me` (2026-07-09): found the live site serving ONE
sample store for a year (bake step never ran against real data), Alberta-only data behind a
Canada-wide header, single-page SEO ceiling, Tailwind play-CDN, dead analytics.
**Artifact:** spec §1 (`docs/superpowers/specs/2026-07-10-premium-redesign-design.md`).

## 2. Opus competitor research ✓
Dedicated Opus agent run (2026-07-09, ~46k tokens, 16 tool calls): swept the card-shop-directory
niche (cardstoresnearme, cardsota, tcgshopfinder, CGC locator, +5), best-in-class references
(Airbnb, Yelp, AllTrails, Atlas Obscura, Felt, Untappd, record-store directories), 3D-map tech
verdict (Mapbox GL v3 Standard vs Google photorealistic tiles vs deck.gl, with free-tier math),
and the SEO/content playbook. Headline: **no premium player exists in this niche**.
**Artifact:** `~/jarvis-memory/00-Inbox/2026-07-09-directory-website-design-research.md`
(full report; summarized in spec §1-2 and quoted in-session).

## 3. Fable premium re-architecture ✓ (21st.dev: MCP absent, noted at the time)
Fable (this session's model) ran the brainstorming→spec→plans pipeline: eight interactive
clarifying-question rounds, the interactive A/B/C **direction board** artifact (live theme
switcher; Nathan approved "Refractor"), the design spec, and both implementation plans.
21st.dev's Magic MCP is not installed on this machine — flagged to Nathan in the first hour;
component patterns were sourced from the research references instead.
**Artifacts:** spec (path above); `docs/superpowers/plans/2026-07-10-plan1-foundation-astro-data.md`;
`docs/superpowers/plans/2026-07-11-plan2-mapbox-3d-island.md`; direction board
(claude.ai/code/artifact/b9da26b3-a765-4aef-baee-b801ed6d59a9, source `scnm-direction.html`).

## 4. Clarifying questions to 95% confidence ✓
Eight structured question rounds answered by Nathan before any code: site purpose (all four
goals), geographic scope (Canada-wide), 3D depth (Mapbox all the way), logo sourcing
(auto-scrape + designed fallback), imagery source (his media-gen pipeline), brand (fresh
identity), v1 features (core + shows + guides), build approach (Astro). Then four design-section
approvals, the A/B/C board verdict ("Approve A — Refractor"), and spec sign-off
("Approved — write the plan"). The spec §2-§8 records every answer as a decision.

## 5. 3D map with store logos as pins ✓
Mapbox GL v3 Standard, night preset, pitch 55°, clustered chip pins, cinematic fly-to,
list↔map sync, filters, mobile toggle — and **40/69 pins wear the store's real logo**
(scraped from each store's own site; designed initials chip for the rest). Token-optional:
fully built and tested dark; `PUBLIC_MAPBOX_TOKEN` lights it.
**Artifacts:** `src/scripts/map-core.ts`, `src/scripts/pins.ts`, `public/logos/` (40 webp),
commits cd95b87..672e35c.

## 6. Animation + generated images ✓
Pin drop-in (entrance-only), camera fly-to easing, hover lifts, pulse ring CSS, all
reduced-motion-aware. Two on-brand generated images live (homepage hero, city night banner)
via Nathan's media-gen pipeline; five more prompts staged in `docs/media-gen-prompts.md`.

## Remaining, by design (sequenced in the spec, not omissions)
Plan 3: Canada-wide store research agents + productionized logo scraper (+ carry-forwards at the
end of `.superpowers/sdd/progress.md`). Plan 4: brand mark, full imagery set, shows, guides.
Plan 5: launch cutover (merge + DNS as one atomic event — merging early kills the live site).
Nathan-gated: Mapbox token, Cloudflare API token secret, site.yml-to-main approval, sheet cleanup.
