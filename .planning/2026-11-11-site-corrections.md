# November 11 site corrections

Prepared on `codex/event-markup-20261111` from `befd2fd3`; not merged or deployed.

- Store source corrections: Sunday 11:00–17:00 for the verified owner request; Avalon Hobbies marked `not-card-shop`, retaining its source row rather than claiming permanent closure. The baker omits explicitly excluded shops.
- Event structured data (machine-readable search information): emit CAD prices only for unambiguous general-admission descriptions. Tiered prices remain descriptive; unknown ticket-sale dates, ticket availability, and end dates are not fabricated. Optional Google warnings may remain where the source does not contain those facts.
- Production workflow: queue overlapping releases without cancelling an active release. The October 29 secondary GitHub Pages failure was a deployment collision; the newer release succeeded. November 10's build and GitHub Pages jobs both succeeded, so this is recurrence prevention rather than restoration of an outage.

## Verification

Final combined code: typecheck and 643 unit tests pass on both checked-in and freshly baked show data. Checked-in-data build: 1,589 pages. The excluded Avalon logo is archived unchanged outside public assets, with its active mapping removed.

Current source-sheet show bake: 318 shows, three incomplete source rows skipped. Current-data build: 1,707 pages. Browser checks: 131 passed, 11 conditional skips; Python checks: 72 passed. Without the normal show bake, old checked-in data omits the held Uxbridge page and four browser checks fail; refreshing the source data restores it. Refreshed show data is not included in this change.

Built output contains 114 current Event records, 25 with verified numeric prices. Google must recrawl after publication; no Search Console validation is claimed. Local build lacks the production Mapbox token, so conditional map tests are not proof of production map behavior.

Historical failed run: https://github.com/ndwiebe/sports-cards-near-me/actions/runs/40907135964
Latest verified successful run: https://github.com/ndwiebe/sports-cards-near-me/actions/runs/42859111543
