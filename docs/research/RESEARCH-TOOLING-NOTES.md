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
| **nearmetcg.com** | **Best first move for a province rerun.** Carries NO ratings at all (verified 2026-07-30) — use it for existence and addresses, never for ratings. `nearmetcg.com/search?province=<Name>` returns the whole province in one request (Quebec = 111 stores). Use the full province name — `?province=QC` silently returns 0. TCG-first, so sports-only shops may be missing. |
| **PagesJaunes.ca / YellowPages.ca** | Good for *confirming a known name*, weak for *discovering* unknown shops — revised 2026-07-30. Category search badly under-returns: "cartes de collection" in Drummondville gave 1 anonymous `confidentiel` listing where 3 known shops exist. Searching a shop by name does find it. Broad terms (`jeux`) work but return Canadian Tire and similar noise. |
| ~~**thecardshopfinder.com**~~ | **US-ONLY — corrected 2026-07-30.** Every Canadian query (`/search?q=Toronto`, `/shops/ontario`, `/canada`) returns an empty 855-byte page. It does carry ratings, but not for Canada. Same trap as `cardshophub.com`. |
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

## Schedules are often images (added 2026-07-29)

Organiser show schedules are frequently **JPEGs on a Wix/Canva/Elementor page**, not
text. `defuddle`, WebFetch and Firecrawl return the surrounding page copy and miss the
schedule entirely — a silent false negative that reads as "no dates published".

**Download the image and read it visually.** Capital Trade Shows' entire 2027 schedule
(20 shows) was a single JPEG. Bossa Productions' self-contradicting dates were only
catchable the same way.

Two corroborating checks that cost nothing and caught real errors:
- **Verify day-of-week against the calendar.** GRADEx lists a show as "Sunday, Nov. 12,
  2026" — that is a Thursday. A poster whose 22 dates all land on the right weekday is
  a poster you can trust.
- **Check whether ticket buttons resolve to real per-event URLs.** Bossa's future-dated
  buttons all pointed at the generic organiser page, and its Showpass account had zero
  bookable events — the dates were aspirational placeholders, not a schedule.

## Import gotchas (added 2026-07-30, each cost a cycle)

- **The stores tab is `alberta_card_store_directory_combined`** (gid `1588938698`), not
  "Stores". A range of `Stores!A:L` fails with *Unable to parse range*. The shows tab
  really is `Shows`.
- **The Mapbox env var is `PUBLIC_MAPBOX_TOKEN`**, not `MAPBOX_TOKEN` — grepping the short
  name matches the long one and hands you a confident false start. It lives only in the
  stale `sports-cards-near-me` worktree.
- **That Mapbox token now 403s** (2026-07-30) — it appears to have been rotated.
  **OpenStreetMap Nominatim works fine** as a free replacement for small batches: no key,
  just send a real `User-Agent` and stay near 1 request/second.
- **Geocode before importing.** A store row missing lat/lng is dropped by the bake with no
  error, and so is one whose address has no derivable province — `province` is parsed
  *from the address string*, not a column.

## Category scanning (added 2026-08-01)

- **`graded cards` and `PSA` are NOT sports evidence.** PSA grades Pokémon
  constantly, so both phrases appear on pure TCG sites. Scoring them as sports
  put 15 shops in the wrong bucket before two spot-checks caught it. Only
  `sports cards`, `panini`, `rookie card`, `fanatics`, `sports memorabilia` and
  named-sport phrases count.
- **Bare `memorabilia` is worthless.** It matched a shop selling oil-and-gas
  memorabilia, knives and war medals. Use `sports memorabilia`.
- **A Facebook URL in the website column returns `http-400`, not a block page.**
  Ten of them looked like site failures in a scan summary. They are the
  documented Facebook login wall — unverifiable, never "no evidence".
- **Always calibrate against records whose answer is already known**, in both
  directions, before trusting a scan. Doing that here found that the *ground
  truth was wrong* — 4 shops tagged TCG-only sell sports cards, verified by hand.
  A scan disagreeing with your data is not automatically the scan being wrong.
- **An empty category field can mean "not a card shop", not "we didn't look."**
  24 of 82 uncategorised shops had a working site with zero card terms. Still a
  review list, never a delete list.

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
