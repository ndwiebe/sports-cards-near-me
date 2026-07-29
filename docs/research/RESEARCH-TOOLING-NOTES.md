# Research tooling: what actually works for Canadian shop research

Compiled 2026-07-29 from ~20 regional research passes. Read this before dispatching
another shop-research agent — several hours were burned rediscovering these.

## The budget trap (most important)

`WebSearch` has a **200-call budget shared across the entire session**, not per agent.
Dispatching 5–13 agents in parallel means the first one or two consume it and every
agent after that silently gets nothing back. Symptoms: an agent reports "no results"
for towns that demonstrably have shops.

**Implication:** a "zero shops found" result is only meaningful if the agent had
working search. Always require agents to state which tools worked. A pass run on a
dead budget is a partial pass, not evidence of absence.

## Sources that work

| Source | Notes |
|---|---|
| **PagesJaunes.ca / YellowPages.ca** | The most reliable. Radius search works, multiple categories per town (collectibles, game shops, comics, Pokémon, playing cards). Scrapes cleanly. |
| **nearmetcg.com** | Real Canadian TCG store index, province-level. Good cross-check. |
| **thecardshopfinder.com** | Google-Places-derived, works for Canada. |
| **Firecrawl `scrape`** | Reliable against a *known URL*. Bypasses some bot blocks that plain WebFetch hits. |
| **`dev-browser --connect`** | The fallback that works when everything else is blocked — real Chrome, real session. Slower, but got through Google when scrapers could not. |
| **OpenStreetMap Overpass API** | Free, unblocked, geocoded. Sparser than commercial directories but never rate-limits. Used successfully for a US region when all else failed. |

## Sources that do NOT work (verified, stop trying)

| Source | What actually happens |
|---|---|
| **`locator.wizards.com`** | Client-side JS search — scrapers get "No results found" even for Montreal, which definitely has Magic stores. Silent false negative. |
| **`cardshophub.com`** | **US-only. No Canadian coverage at all.** Produces convincing-looking empty results for Canadian towns. |
| **Facebook** | Fully login-walled for business pages. Any lead resting only on a Facebook link cannot be verified and must be excluded. |
| **Google / Bing / DuckDuckGo via scraper** | Consent walls, bot challenges, CAPTCHAs after a few calls. DDG degrades to serving unrelated content rather than erroring — silently wrong, not obviously broken. |
| **Firecrawl `search`** | The self-hosted proxy has no search provider configured — 404s outright. |
| **`tcdb.com`** | 403s every request. |
| **`cartesdehockey.ca`** | Real but last updated 2021; every entry already in the roster. |

## Known bad data patterns to exclude

- **"Canada Hobbies"** — appears under a dozen different town searches with a different address each time; its domain redirects to an eBay store. A fake local-landing-page network for an online-only reseller. Exclude on sight.
- **AI-generated "competitor lists"** in blog posts — one Airdrie post named five nearby "shops" with no address, phone, or web footprint anywhere. Classic SEO filler.
- **Defunct mall-kiosk chains** — one name appearing at six mall addresses across six cities with no phone/site/reviews for any of them.
- **Directory miscategorisation** — a welding company, a gunsmith, a vape shop, a needlepoint shop and a rust-proofing franchise have all surfaced tagged as card shops.
- **Same address, different name** — usually a rebrand or a stale listing, not a second shop. Check before adding.

## Practical guidance

1. **Dispatch fewer agents at once.** 4–5 max, so the search budget isn't exhausted by agent #2.
2. **Require a tooling statement** in every agent report — which sources worked, which failed.
3. **Treat "no shop found" as provisional** unless the agent confirms it had working search.
4. **Always require the source URL** per row, and for ratings work, the matched address for cross-checking.
