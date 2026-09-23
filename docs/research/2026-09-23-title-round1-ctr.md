# Round 1 title rewrite — measured

Round 1 = `77317e47` (2026-08-07, city/province/shows/sell/Pokémon/home title+description
templates) plus `8bff32da` (2026-08-25, store titles + fixed a false "Top rated" claim
on 351 pages). Both predate this window.

## Data used, and its limit

`scripts/fetch-gsc.py` drives a live, signed-in Chrome on debug port 9222 to pull a
fresh Search Console export. That Chrome instance is not reachable from this session
(`curl http://127.0.0.1:9222/json/version` refused the connection), so the script was
not run. Used instead: the two Search Console exports already on this machine at
`/Users/nathanwiebe/.claude/uploads/d4a177a3-4de0-4e36-82b2-a3f839bf7412/*.xlsx`
(`Performance on Search`, dated 2026-09-23), read with the existing
`scripts/analyze-gsc-export.py`.

**Limit, stated plainly: this export is page-level TOTALS for the whole window
(2026-07-28 → 2026-09-21), with no per-page daily breakdown.** Search Console's UI
export does not carry a date dimension per page. That means there is no true
before-Aug-25 vs. after-Aug-25 split for an individual page — only each page's
CTR across the whole 56-day window, most of which falls after round 1 shipped
(Aug 25 is day 29 of 56; the Aug 7 city/province rewrite covers the whole window).
Read every number below as "how the round-1 titles have performed since they
shipped," not as a measured before/after delta.

## Site-wide, for context

56-day window: 88,467 impressions, 930 clicks (CTR 1.05%), run rate ~217 clicks/week
(target is 500/week by Dec 21). Blended position 8.97; mobile alone 7.82 (75% of
impressions) — steer by the mobile figure, not the blend.

## Top pages by impressions (the pages round 2 should target)

| Page | Type | Impr | Clicks | CTR | Pos |
|---|---|---:|---:|---:|---:|
| /ontario/toronto/ | city | 5,382 | 27 | 0.50% | 8.8 |
| /shows/ | shows | 5,354 | 90 | 1.68% | 10.0 |
| /ontario/london/ | city | 5,265 | 29 | 0.55% | 7.5 |
| /ontario/ottawa/ | city | 4,487 | 35 | 0.78% | 10.2 |
| /ontario/mississauga/ | city | 2,834 | 12 | 0.42% | 12.4 |
| /alberta/edmonton/ | city | 2,418 | 13 | 0.54% | 8.9 |
| /guides/card-grading-companies-canada/ | guide | 2,360 | 23 | 0.97% | 12.8 |
| /ontario/markham/ | city | 1,609 | 19 | 1.18% | 7.2 |
| /guides/best-card-shops-calgary/ | guide | 1,277 | 8 | 0.63% | 10.0 |
| /nova-scotia/ | province | 1,141 | 17 | 1.49% | 9.1 |

Every province page, ranked:

| Page | Impr | Clicks | CTR | Pos |
|---|---:|---:|---:|---:|
| /nova-scotia/ | 1,141 | 17 | 1.49% | 9.1 |
| /british-columbia/ | 715 | 4 | 0.56% | 10.3 |
| /new-brunswick/ | 709 | 16 | 2.26% | 7.3 |
| /quebec/ | 519 | 5 | 0.96% | 8.7 |
| /prince-edward-island/ | 489 | 4 | 0.82% | 9.0 |
| /alberta/ | 396 | 6 | 1.52% | 9.8 |
| /newfoundland-and-labrador/ | 258 | 2 | 0.78% | 7.6 |
| /ontario/ | 251 | 1 | 0.40% | 11.4 |

Grading guides:

| Page | Impr | Clicks | CTR | Pos |
|---|---:|---:|---:|---:|
| /guides/card-grading-companies-canada/ | 2,360 | 23 | 0.97% | 12.8 |
| /guides/best-card-shops-calgary/ | 1,277 | 8 | 0.63% | 10.0 |
| /guides/best-card-shops-edmonton/ | 535 | 2 | 0.37% | 10.4 |
| /guides/best-card-shops-alberta/ | 71 | 0 | 0.0% | 8.9 |

Note: `card-grading-companies-canada`'s title was already rewritten once, off an
earlier (2026-08-23) Search Console read, per the comment in its own source file —
that pass explicitly found guide CTR "flat (0.74% -> 0.72%)". It is included here
again because the PRD names "the grading guide" as a round-2 target and it still
clears the underperforming bar below.

Pokémon (top 15 of 121 city pages by impressions; page-type aggregate: 121 pages,
43.7 impr/page average, 0.77% CTR, median position 8.9):

| Page | Impr | Clicks | CTR | Pos |
|---|---:|---:|---:|---:|
| /pokemon/greater-sudbury/ | 317 | 4 | 1.26% | 8.9 |
| /pokemon/calgary/ | 248 | 2 | 0.81% | 11.9 |
| /pokemon/fort-erie/ | 195 | 0 | 0.0% | 9.1 |
| /pokemon/toronto/ | 176 | 0 | 0.0% | 18.3 |
| /pokemon/saskatoon/ | 136 | 3 | 2.21% | 10.4 |
| /pokemon/london/ | 131 | 0 | 0.0% | 8.9 |
| /pokemon/hamilton/ | 124 | 3 | 2.42% | 8.2 |
| /pokemon/leduc/ | 119 | 0 | 0.0% | 8.8 |
| /pokemon/drumheller/ | 119 | 2 | 1.68% | 7.9 |
| /pokemon/nanaimo/ | 97 | 0 | 0.0% | 9.4 |
| /pokemon/thunder-bay/ | 94 | 0 | 0.0% | 9.1 |
| /pokemon/victoria/ | 93 | 0 | 0.0% | 10.2 |
| /pokemon/brandon/ | 91 | 2 | 2.2% | 8.9 |
| /pokemon/brampton/ | 81 | 0 | 0.0% | 6.1 |
| /pokemon/kamloops/ | 79 | 1 | 1.27% | 9.4 |

## Underperforming pages (CTR below ~1.5%, 500+ impressions)

15 pages clear both bars:

| Page | Type | Impr | Clicks | CTR |
|---|---|---:|---:|---:|
| /ontario/toronto/ | city | 5,382 | 27 | 0.50% |
| /ontario/london/ | city | 5,265 | 29 | 0.55% |
| /ontario/ottawa/ | city | 4,487 | 35 | 0.78% |
| /ontario/mississauga/ | city | 2,834 | 12 | 0.42% |
| /alberta/edmonton/ | city | 2,418 | 13 | 0.54% |
| /guides/card-grading-companies-canada/ | guide | 2,360 | 23 | 0.97% |
| /ontario/markham/ | city | 1,609 | 19 | 1.18% |
| /guides/best-card-shops-calgary/ | guide | 1,277 | 8 | 0.63% |
| /nova-scotia/ | province | 1,141 | 17 | 1.49% |
| /store/mintink-ajax-ajax/ | store | 833 | 3 | 0.36% |
| /british-columbia/ | province | 715 | 4 | 0.56% |
| /store/total-sports-cards-collectibles-etobicoke/ | store | 624 | 0 | 0.0% |
| /store/mk-kards-cambridge/ | store | 576 | 2 | 0.35% |
| /guides/best-card-shops-edmonton/ | guide | 535 | 2 | 0.37% |
| /quebec/ | province | 519 | 5 | 0.96% |

Store pages (`mintink-ajax-ajax`, `total-sports-cards-collectibles-etobicoke`,
`mk-kards-cambridge`) are out of round-2 scope here — the PRD's round-2 list
names city, province and grading pages, and `storeTitle()` was the thing round 1's
`8bff32da` already rewrote and pinned in `tests/unit/page-titles.test.ts`; leaving
them for a separate pass rather than reopening a just-shipped, tested template.

**Calgary the city page** (`/alberta/calgary/`, 75 impressions, 0% CTR) does not
clear the 500-impression bar despite being named in the PRD list — the volume is
on the Calgary *guide* (1,277 impr) instead, which is in scope above.

## Round 2 target set

City pages: Toronto, London, Ottawa, Mississauga, Edmonton, Markham.
Province pages: Nova Scotia, British Columbia, Quebec.
Guides: `card-grading-companies-canada`, `best-card-shops-calgary`, `best-card-shops-edmonton`.
Pokémon: template-wide (121 city pages), plus noindex for single-shop cities
(Phase 3 bullet, separate work item below).

Since every city/province/Pokémon page shares one title/description template
(there is no per-page copy in this codebase), round 2 rewrites the shared
templates rather than editing individual pages — the same shape round 1 took.
The rewrite is validated against this underperforming set but applies to every
page of that type, consistent with how templates already work here.

## Re-measurement

Per the PRD: re-pull Search Console at 2 and 4 weeks after this ships (early and
mid-October) and compare each of the pages above against this baseline. That
pull should go through `scripts/fetch-gsc.py` once the debug-port Chrome is
running, so it can be an actual date-sliced before/after rather than another
window-total read.
