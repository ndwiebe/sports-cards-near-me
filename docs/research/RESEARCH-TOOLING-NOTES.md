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
| ~~**`tcdb.com`**~~ | **CORRECTED 2026-08-27 — it works, via a browser.** The 403 is real but applies to *automated clients only*: `curl` and `defuddle` are both refused, and were the only things tried in July. `dev-browser --connect` against the signed-in AI Chrome loads it fine. Yielded **165 Canadian card-show dates (75 series, 52 cities)** on the first pass. Canadian shows live at `/CardShows.cfm?MODE=Location&State=<Province>&Country=Canada` (use the full name; `Québec` needs the accent, URL-encoded). The list view carries name, venue, city, date and hours — **never** a street address, admission price or organiser website. Only AB/BC/ON/SK have entries; MB/NS/QC are genuinely empty, not a parse failure. Horizon is ~4 months, and a province returning exactly 100 rows is coincidence, not a cap — verified by comparing date horizons across provinces. |
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

## Writing entries in this table (added 2026-08-27)

The `tcdb.com` row above sat marked dead for a month and cost a source we needed. It
said *"403s every request"* — true of `curl` and `defuddle`, which were the only two
things tried, and false of a real browser, which nobody had tested.

**Record what was tried, not just the verdict.** "Refuses `curl`/`defuddle`; browser
untested" is the same length as "403s every request" and does not close a door that is
actually open. A conclusion outlives the evidence under it and gets quoted long after
the person who wrote it would have changed their mind.

Before trusting any scrape from a source in this table:
- **A round result count is a claim.** Exactly 100 or 500 rows usually means a hidden
  cap. You can test for one without access to the source: compare the suspicious set's
  date/alphabetical horizon against sets too small to be capped. If the big one stops
  sooner, it is truncated.
- **A zero is a claim too.** Confirm the page actually loaded and is genuinely empty
  before recording an absence — that is the silent-false-negative trap this file opens with.

## The monthly Search Console read (added 2026-08-28)

Two commands, no manual CSV download:

```bash
python3 scripts/fetch-gsc.py                                   # writes docs/research/gsc-export-<date>/
python3 scripts/analyze-gsc-export.py docs/research/gsc-export-<date>
```

`fetch-gsc.py` drives the signed-in AI Chrome to Search Console and triggers the real
Export → CSV, so the file set is identical to a human export and the analyzer needs no
translation layer. It also writes `enhancements.json` (Events valid/invalid, and the
Search Appearance state).

**Property id — this cost a wrong conclusion.** It is the **URL-prefix** form
`https://sportscardsnearme.ca/`. Both `sc-domain:sportscardsnearme.ca` and
`http://sportscardsnearme.ca/` return "you don't have access", and probing only those two
on 2026-08-28 produced a confident, false "this account has zero properties". A bad id
redirects *silently* to `/search-console/not-verified`, so the script asserts on the landed
URL every run rather than trusting a 200.

**If it fails to connect:** dev-browser attaches over CDP, and that attach times out when
Chrome has accumulated too many targets — 68 (19 pages, 31 ad iframes) was enough to break
it on 2026-08-28 even though port 9222 still answered 200. Close stale tabs and retry:

```bash
curl -s http://127.0.0.1:9222/json/list | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d),'targets')"
```

**An empty `Search appearance.csv` is a real finding, not a failed pull** — it means no
enhanced result has surfaced yet. Baseline 2026-08-28: Events 4 valid / 0 invalid,
Search Appearance empty.
