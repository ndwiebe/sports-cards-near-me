# SportsCardsNearMe.ca — Premium Redesign Design Spec

**Date:** 2026-07-10
**Status:** Approved direction, pending Nathan's spec review
**Repo:** `ndwiebe/sports-cards-near-me` → local `~/Projects/8-Web-Apps/sports-cards-near-me`
**Live:** sportscardsnearme.ca (GitHub Pages, custom domain via CNAME)

---

## 1. Why (context and problem)

The current site is a single hand-built HTML page. Audit findings (2026-07-09):

- **The live site serves zero real stores.** Store data lives in a Google Sheet (88 rows, 69 stores with coordinates, all Alberta). The site was switched from live-sheet reads to a baked `data/stores.json`, but the bake script (`scripts/generate-stores-json.mjs`) was only ever run against placeholder data — production shows one fake "Sample Card Shop."
- Map starts empty; store list hidden until a search interaction.
- Headline claims Canada-wide; data is Alberta-only. 9 of 10 province links show "no results."
- One page total — nothing for Google to rank for "card shop Calgary"-type searches.
- Tailwind loaded via the play CDN (not production-grade), plain JS (no TypeScript), dead analytics code (`gtag` calls with no GA script loaded — no traffic data is being collected), empty `assets/marker-icon.png`.
- Google Maps API key exposed in page source (normal for Maps keys, but referrer restrictions must be verified in Google Cloud console — **Nathan action**).

Competitive research (Opus deep-research, 2026-07-09, full report in vault:
`~/jarvis-memory/00-Inbox/2026-07-09-directory-website-design-research.md`):
**no card-shop directory on the internet looks premium.** All competitors are plain lists
with "get directions" links. Map-as-hero + real design = instant category leader.
Canada is especially underserved.

## 2. Goals

All four, in priority order when they conflict:

1. **Own the niche + monetize later** — become THE Canadian card-shop directory; SEO is the engine; monetization hooks designed in but no payments yet.
2. **Feeder for the card ecosystem** — credibility + cross-promotion surface for Nathan's card businesses.
3. **Portfolio showpiece** — visible wow (3D map, motion) for AI-consulting pitches.
4. **Community passion project** — genuinely useful, low upkeep once shipped.

**Non-goals (v1):** user accounts, native review submission, shop-owner dashboards, payments, US coverage.

## 3. Brand & visual direction — "Refractor" (Direction A, approved)

Approved via interactive direction board (artifact `scnm-direction.html`, v2 with A/B/C switcher).

- **World:** city at night. Desaturated ink-blue map so colourful store-logo pins land like spotlights (Airbnb/Nike desaturated-base + branded-pin pattern).
- **Palette tokens:** ink `#0B1017` (page ground, blue-biased), panel `#121A26`, well `#0B121B`, border `#2A3C55`, paper `#EAF0F6`, muted `#8FA0B3`, solid accent "prizm" `#57B3FF`.
- **Signature accent — the refractor line:** iridescent gradient `#5AD7FF → #907CFF → #FF7FB2 → #FFC46B` (foil-parallel homage). Exactly four sanctioned uses: headline rule, primary button, focus states, featured-shop ring/border. Never backgrounds, never body text.
- **Type:** display = Barlow Condensed 600, uppercase, tight tracking (jersey-number energy). Body/UI = Instrument Sans 400/600. Numbers tabular (`font-variant-numeric: tabular-nums`) for hours/distances/ratings.
- **Logo/mark:** full brand-identity pass runs as implementation phase 1 (brand-identity skill). Hard requirement: the mark must work at three sizes — header logo, favicon/social icon, and tiny map-pin chip (it is the designed fallback pin for stores without logos).
- **Constraint:** no gold-on-black anywhere — that is DisplayMyCard's identity.
- **Store pages read like Atlas Obscura places** (photo, facts above the fold, one human paragraph on what the shop is known for), not database rows.
- **Motion:** felt, not noticed. Pins drop once on load; single pulse ring for "new this week"; camera flies between cities on a long cinematic ease; cards lift 4px on hover. Everything respects `prefers-reduced-motion`. No parallax, no scroll-jacking.

## 4. Site structure (approved)

| Page | Route | Job |
|---|---|---|
| Home | `/` | Cinematic hero → 3D map with logo pins → search + geolocate → featured cities, newest shops, upcoming shows |
| Province | `/alberta/` | Province map slice + city index + intro |
| City | `/alberta/calgary/` | **The Google-ranking surface.** Local map slice, store list, unique intro copy, LocalBusiness structured data |
| Store | `/store/<slug>/` | Logo, photos, hours, click-to-call phone, services + sports chips, Google star rating, mini-map, directions link, "Own this shop? Claim your listing" (future monetization door) |
| Shows | `/shows/` + `/shows/<slug>/` | Card-show calendar; per-show pages (fresh, dated, indexable) |
| Guides | `/guides/` + 5 articles | e.g. "Best card shops in Ontario", "Where to get PSA submissions in Canada" |
| Suggest | `/suggest/` | Native on-site form (replaces the Google Form). Submits to a tiny Cloudflare Pages Function (serverless endpoint, free tier) that emails dominathan@gmail.com and logs the submission; entries flow into the same sheet-Review approval path |

SEO plumbing on every page: unique titles/descriptions, canonical URLs, Schema.org
`LocalBusiness` on store pages + `Event` on show pages, auto-generated social-share
card images (drawn in code per city/store), sitemap, robots.

## 5. The map (approved)

- **Engine:** Mapbox GL JS v3, Standard style (3D buildings, dynamic lighting), tilted camera. Custom desaturated night styling to match the palette.
- **Pins:** HTML markers — store logo in a rounded white chip with stem (per direction board). Designed initials chip as fallback. Featured shops get the refractor ring. Show pins are a distinct variant. Clustering when zoomed out.
- **Interactions:** two-way list↔map sync (hover card → pin highlights; tap pin → card scrolls into view), "search this area" on pan, fly-to on city select, instant geolocate.
- **Mobile:** full-screen map/list toggle; all frontend work tested at 375px.
- **Resilience:** if Mapbox fails (token/quota/JS off), every page still renders complete, fast store lists — the map enhances, never gatekeeps. SEO content is server-rendered HTML regardless.
- **Cost reality:** Mapbox free tier = 50,000 map loads/month, then $5/1k. Effectively $0 at expected scale. Google Photorealistic 3D rejected (1,000 free calls/month — unusable).
- **Nathan action:** create free Mapbox account, provide token (goes in build config, restricted to the domain).

## 6. Data pipeline (approved)

**Google Sheet stays the single source of truth** (Sheet ID `14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I`). New structure: `Stores` (live), `Shows` (live), `Review` (staging for agent-found candidates).

1. **Canada-wide store research:** agents fan out per province — find card shops via web research (Google listings, shop sites, existing directories), verify (open? phone? website? coordinates?), geocode, and write candidates to the `Review` tab with a source/confidence column. **Nathan approves batches in the sheet**; approved rows move to `Stores`. Nothing unverified goes live. Expected scale: 200–400+ stores.
2. **Show data:** same pattern for card shows/events (organizer sites, existing US directory's Canadian listings, public listings) into `Shows`.
3. **Logo collection:** script visits each approved store's website/socials, pulls the best logo/icon (site icon, social profile image), optimizes to webp pin chips; designed fallback chip when nothing found.
4. **Build-time bake:** at every site build, the sheet is fetched and baked to typed JSON with validation (row-count sanity check: build FAILS if stores < previous count × 0.9 — the "1 fake store in production" failure mode becomes structurally impossible).
5. **Scheduled rebuild:** daily automated build (GitHub Actions cron) + on-push builds, deploying to Cloudflare Pages.

## 7. Imagery (approved)

- **Heroes + guide covers:** Nathan's existing `media-gen.sh` pipeline (NotebookLM prompt-craft → ChatGPT/Gemini image in logged-in AI Chrome → optimized webp into the repo). Graded into the palette: navy shadows, foil glints. **Nathan action:** AI Chrome open + signed in during the imagery session.
- **Systematic art** (city headers, share cards, empty states): drawn in code (SVG/canvas at build time) — free, consistent across ~300 pages.
- Existing photos (card-show, hockey-display) kept where they fit, re-graded.

## 8. Tech stack (approved — Option A)

- **Astro** (static-first framework; every page pre-rendered HTML), **TypeScript strict** (no `any`), **Tailwind via proper build** (no CDN), design tokens as CSS custom properties from the brand system.
- Map lives as one interactive island; everything else ships as plain HTML/CSS.
- **Hosting: Cloudflare Pages** (free), custom domain sportscardsnearme.ca moves from GitHub Pages (**Nathan approves DNS cutover**; old GH Pages stays as instant rollback).
- **Analytics:** Cloudflare Web Analytics (free, no cookie banner needed). Removes the dead gtag code.
- **Logging:** no `console.log` in shipped code (project rule); build scripts use a proper logger.
- **Tests:** extend existing node tests (data integrity, SEO meta), add Playwright smoke (home, city, store pages at 375px + desktop; map island mounts; filters work), Lighthouse budget ≥90 performance/SEO on city pages.

## 9. Monetization hooks (designed, not activated)

- "Featured shop" slot styling (refractor ring) exists from day one, manually assignable via a sheet column.
- "Own this shop? Claim your listing" links to the suggest form with a claim type — collects shop-owner interest for later paid tiers.

## 10. Acceptance criteria

1. sportscardsnearme.ca serves the new Astro site with **all approved stores live** (69 Alberta minimum; Canada-wide per pipeline output at launch).
2. Map hero: 3D tilt, logo-chip pins, clustering, list↔map sync, fly-to, geolocate — smooth on a mid-range phone at 375px.
3. Every city with ≥1 store has an indexable city page with structured data; store pages pass Google's Rich Results test.
4. Shows section live with ≥10 real upcoming shows; 5 guides published.
5. Site fully usable with the map failed/disabled.
6. Daily rebuild pulls the sheet; a sheet edit appears on the live site within 24h with zero Nathan effort.
7. All tests green; Lighthouse ≥90 (performance + SEO) on home and a city page.
8. $0/month running cost.

## 11. Nathan-only steps (tracked in WAITING-ON-NATHAN when reached)

1. Verify Google Maps API key referrer restrictions (2 min, Google Cloud console) — legacy key, still worth locking even though the new site drops Google Maps.
2. Create free Mapbox account + token.
3. Approve researched store/show batches in the sheet.
4. AI Chrome open + signed in for the imagery session.
5. Approve Cloudflare Pages DNS cutover for sportscardsnearme.ca.

## 12. Phases (implementation plan will detail)

1. **Brand identity** (brand-identity skill; tokens, mark, pin system) — gates visual work.
2. **Data pipeline + Canada-wide research** (agents; runs in parallel with 3).
3. **Astro scaffold** (pages, routing, sheet bake, tests, CI/deploy).
4. **Map island** (Mapbox, pins, interactions).
5. **Content** (imagery session, guides, shows).
6. **Polish + QA + launch** (375px pass, Lighthouse, DNS cutover).
