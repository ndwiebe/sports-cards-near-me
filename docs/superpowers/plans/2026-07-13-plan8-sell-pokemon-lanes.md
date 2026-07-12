# Plan 8: Sell-side & Pokémon SEO lanes

**Goal:** Own the two uncontested keyword lanes the research found — "sell/who buys sports cards [city]" and "pokemon card shop [city]" — with intent-matched national hubs + per-city landing pages, computed entirely from stores.json.

**Why these:** 83 shops buy collections across 65 cities (no Canadian directory owns "who buys in [city]"); 288 shops carry Pokémon across 105 cities (Toronto 22). Both are pages that don't exist yet, so they can't rank yet.

**Data facts (verified 2026-07-12):** buyer = a store whose `services` (lowercased) contains exactly `buys`. Pokémon shop = a store whose `services`+`sports` (lowercased) contains exactly `pokemon`. Rank both lists rating desc, then reviewCount desc.

**Architecture:** each lane = `/lane/` national hub (grouped city list) + `/lane/[city]/` per city that HAS ≥1 qualifying shop (never generate an empty page — thin-content risk). Reuse `src/lib/seo.ts` (ldJson, breadcrumbListLd, itemListLd, faqPageLd, absoluteUrl). Each per-city page: H1 matching the query, computed answer capsule, the qualifying-shop list (linked to /store/[slug]/), 3 computed FAQs, BreadcrumbList+ItemList+FAQPage JSON-LD, cross-links to the general city page and the relevant guide. Self-canonical (distinct query intent from the /[province]/[city]/ page — not duplicate content).

**Parallel decomposition (zero shared-file contention):**
- Crew A (branch p8-sell): src/lib/sell.ts + tests, src/pages/sell/index.astro, src/pages/sell/[city]/index.astro, tests/e2e/sell.spec.ts.
- Crew B (branch p8-tcg): src/lib/tcg.ts + tests, src/pages/pokemon/index.astro, src/pages/pokemon/[city]/index.astro, tests/e2e/pokemon.spec.ts.
- Controller integration (after merge): Base.astro nav gains "Sell"; [province]/[city]/index.astro FAQ answers link out to /sell/[city]/ and /pokemon/[city]/ when the city qualifies; sitemap picks up new pages automatically.

**Constraints:** strict TS, no any, no console.log, the ONE sanctioned set:html (ldJson), no fabricated prices (link guides), token-optional untouched (these pages have no map). Gates both token modes. Never push main.

**Review:** Opus (Fable usage exhausted) whole-batch after merge — content honesty sweep + edge cases (1-buyer city, 1-pokemon-shop city, accented names) like Plan 7.

**Deferred to Plan 9:** Magic: The Gathering lane (241 shops — second-biggest, same template), per-province/year show indexes, French-Québec pages, graders comparison table, off-page/citations (outside codebase).
