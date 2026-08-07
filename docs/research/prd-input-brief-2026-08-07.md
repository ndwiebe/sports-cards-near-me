# Input brief — PRD: SCNM traffic & clicks (SEO + GEO to top-5)

Assembled 2026-08-07 for the PRD author. Everything below is verified fact from
the repo, live Search Console, or recorded decisions — not aspiration. File
pointers are for deeper reading; the numbers quoted here are current.

## Mission and hard constraints (non-negotiable, from recorded decisions)

- **SCNM is an independent Canadian card-shop directory.** The moat is "the list
  nobody paid to be on." Money comes (eventually) from clearly-labelled Featured
  placement and services — never from ranking position. **No mechanism the PRD
  proposes may make organic position purchasable.**
- **Absence of data is never a negative claim about a business.** Copy must
  describe our gap ("we haven't confirmed X"), never assert their lack.
- **Ranking rules are settled and out of scope:** 20-review bar
  (MIN_REVIEWS_FOR_TOP), Bayesian weighting toward the directory mean,
  VOLUME_WEIGHT = 0.35 log-scaled. Do not propose changing them.
- **No US expansion.** Canada only.
- **Featured placement cannot be sold** until a city page has ~90 days of Search
  Console history and ~100+ impressions / 20+ outbound clicks per month.
  Earliest honest sale ≈ November 2026. The PRD's traffic work is what makes
  that bar reachable.
- Full detail: `~/jarvis-memory/decisions/2026/2026-07-29-scnm-publishing-standards.md`

## Search Console — live data pulled 2026-08-07

**Grounding caveat: only the top 10 rows of each table were readable** (the CSV
export path failed; macOS blocked the downloaded file). Totals are exact; the
long tail (~1,000 queries) is unread. The PRD must not present long-tail claims
as measured.

Property: URL-prefix `https://sportscardsnearme.ca/` (3-month window; site
effectively 3 weeks old in search).

| Metric | 2026-07-31 | 2026-08-07 |
|---|---|---|
| Impressions | 63 | **10,400** |
| Clicks | — | **79** |
| Distinct queries | 26 | ~1,000 |
| Avg position | 13.3 | **10.8** |
| CTR | — | **0.8%** |

Top queries: sports cards near me (2c/49i), pokanada (2c/9i), card shops near
me (1c/98i), loot kingdom (1c/88i), retro relics (1c/50i), digital oasis
(1c/50i), card stores near me (1c/39i), toybox trading co (1c/14i), beyond the
pond (1c/10i), card show québec 2026 (1c/9i).

Top pages: /shows/maritime-collectible-expo-moncton-2026-08-09/ (4c/82i),
/guides/card-grading-companies-canada/ (3c/207i — most impressions of ANY page),
/nova-scotia/ (3c/49i), /ontario/toronto/ (2c/150i), /new-brunswick/ (2c/63i),
then 3 store pages and 2 more show pages.

**The five findings from the 08-07 read** (full note:
`~/jarvis-memory/06-SportsCardsNearMe/2026-08-07-search-console-read-and-content-plan.md`):
1. Generic head terms now surface (card shops near me 98i) — a week ago only
   shop names did. Shop names persist but are the low-impression queries.
2. Shows are the best page type per page: 3 of top 10 from a pool of only 45.
3. One national guide out-impresses all 248 city pages.
4. Cities weak (only Toronto in top 10); provinces strong (NS and NB beat
   almost every city).
5. **The bottleneck is CTR, not visibility**: 10.4K impressions → 79 clicks at
   position 10.8 (bottom of page one). Title/meta rewrites on already-ranking
   pages are the highest-leverage move and need zero new pages.

## Prior research still standing (read both)

- `~/jarvis-memory/06-SportsCardsNearMe/2026-07-23-scnm-content-seo-plan.md` —
  122-query autocomplete harvest. Key survivals: show queries always carry TIME
  modifiers ("this weekend", "2026"); sell-side is high-intent and unowned in
  Canada; name-collision watch-outs (Halifax the bank, LCS the esports,
  "hobby shop" = RC cars, bare "card shop" = greeting cards); country-level
  superlatives don't autocomplete, city-level do; **PAA/AI-answer boxes trigger
  on question phrasing, never "near me" phrasing** — local-pack copy and
  AI-citation copy are two different writing jobs.
- `~/jarvis-memory/06-SportsCardsNearMe/2026-07-29-scnm-seo-roadmap-post-ratings.md`
  — the phased roadmap this PRD supersedes; its Phase-0 items are done
  (GSC verified, Bing connected, About page live, ratings 92%).

## Site inventory (verified this week)

- 1,305 static pages, Astro on Cloudflare Pages, rebuilt nightly from a Google
  Sheet (content must survive that rebuild — hand-edited pages that the bake
  overwrites are a trap).
- 689 shops across 248 cities, 92% with Google ratings, 560 clearing the
  20-review bar. 45 shows through Dec 2027. Sell hub: 203 buyers across 107
  cities. 8 guides. `/pokemon/` hub with 173 city pages.
- SEO infrastructure already in place: answer capsules on every major page
  type, FAQPage + BreadcrumbList + ItemList JSON-LD, per-store meta
  descriptions with ratings, `llms.txt` for AI crawlers, sitemap, Bing
  Webmaster connected (feeds ChatGPT search). 197 unit + 85 e2e tests.
- **E-E-A-T asset:** Nathan Wiebe is a CPA who actively deals cards; About page
  carries his credentials + Person/Organization schema. The grading/valuation/
  tax lane is where that credential is a real differentiator.
- French: **zero French content**, 123 Quebec shops, and a live French query
  already surfacing (card show québec 2026). No competitor serves French.

## TCG / Pokémon split — the PRD must recommend a shape

Decision recorded (`~/jarvis-memory/decisions/2026/2026-08-06-scnm-tcg-splits-from-sports-cards.md`):
TCG separates from sports cards "almost entirely." **Shape undecided — the PRD's
job is to recommend: separate site vs section vs filter**, with the fate of each
domain under the recommendation, and the redirect endgame.

Facts bearing on it:
- Pokémon = 429 of 689 shops (62%); Magic 352; all other TCGs single digits.
  "TCG" as a term is insider shorthand; searchers type "pokemon card shop".
- Domains held (registered 2026-08-06, at Namecheap): `pokemonnearme.ca`,
  `tcgshopsnearme.ca`, `tcgshopsnearme.com`, `cardshowsnearme.ca`. Currently
  redirecting (half-broken: HTTP-only, 302 not 301, no www) to /pokemon/ and
  /shows/ pending a Cloudflare DNS move.
- **Trademark posture: "Pokémon" is aggressively enforced.** Current stance is
  redirect-only use of `pokemonnearme.ca` — never as a brand, logo, or site
  title. The PRD may weigh building on it but must address this risk honestly.
- **Competitor:** `tcgnearme.ca` is live with a "TCG Near Me — Launching Soon"
  page, registered Feb 2025 — someone is a year into the adjacent idea.
  `cardshopnearme.ca` self-describes as Ontario-only. SCNM's national coverage
  is a statable advantage.
- Category data caveat: the sports/TCG field was wrong for at least 26 of 281
  TCG-tagged shops (15% of those with reachable websites) before this week's
  corrections; a "Sports" catch-all value now exists. `carriesSportsCards()` in
  `src/lib/seo.ts` is the predicate for any sports/TCG distinction. The field
  is better but not clean — recommendations must tolerate imperfect data.

## Execution capacity (calibrate all effort estimates to this)

- Claude Code writes all code/content; Nathan directs, reviews, tests. Estimate
  in Nathan-hours, not dev-hours (his calibration: simple feature 30min–1h,
  medium 2–4h, large 8–15h of HIS time).
- Nathan: full-time CPA job + DMC, SlabBook, PennyPilot, CoinMyCard, SSC.
  Assume ~3–5 Nathan-hours/week for SCNM, bursty.
- GEO tooling available as skills: geo-audit, geo-citability, geo-schema,
  geo-llmstxt, geo-content, geo-crawlers, geo-platform-optimizer.

## What the PRD must contain

1. Mission & measurable goals (top-5 Google for named query classes; cited in
   LLM answers for named questions; CTR and clicks targets with dates).
2. Where traffic comes from today — grounded in the numbers above.
3. Prioritized workstreams with reasoning, effort (Nathan-time), and expected
   impact. The 08-07 read's draft order (CTR fixes → shows → guides → Toronto →
   French) is an input, not a constraint — overrule it with reasons if the data
   supports a different order.
4. TCG/Pokémon split: recommended shape + domain fates + redirect endgame.
5. 90-day roadmap (what ships when, what measurement gates what).
6. Measurement loop (monthly GSC review, named-query position tracking,
   LLM-answer spot checks — name the actual questions to test).
7. Risks & out-of-scope (paid ranking never; US never; Pokémon trademark;
   capacity).
8. Plain language throughout: every technical term glossed on first use —
   the reader is a CPA, not an engineer.
