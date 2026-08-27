# Sessions — who is working on what

More than one Claude session works in this repo, and **a session cannot detect another one**.
This file is the only thing standing between that and a mess. Read it before you start;
update it when you start and when you stop.

## How to use it

1. **Before starting:** read the Active table. If your lane is claimed, either pick a
   different lane or work in a git worktree (see `CLAUDE.md` → Working in parallel).
2. **When you start:** add a row. Lane names come from the table in `CLAUDE.md`
   (data · lib · pages · perf · docs).
3. **When you stop:** delete your row and add a line to the log at the bottom. If you stop
   mid-flight, say so in the row — half-finished work someone else finds is the whole
   problem this file exists to prevent.
4. **Commit this file on its own.** Never bundle it with code, or it becomes a merge
   conflict inside real changes.

If you find uncommitted work you didn't write, check this file first. If nothing here
explains it, **leave it alone and tell Nathan** — do not commit it blind, and do not
`git add -A`.

---

## Active

| Since | Session / cwd | Lane | Touching | Notes |
|---|---|---|---|---|
| — | _(none claimed)_ | — | — | — |

## Queued — claimed but not started

| Work | Lane | Plan | Blocked on |
|---|---|---|---|
| Capital City closure + `status` field | **data** (sheet + `bake-stores`) | `docs/superpowers/plans/2026-08-27-data-fixes-and-gsc-wins.md` | — (the closure scan runs in CI; the Places key is already a repo secret) |
| Calgary Genesis Centre triple → one 3-day show | **data** (sheet) | same plan, Task 2 | — |
| Rename Hobby Spot show · fold Ottawa orphan into Capital Trade Shows | **data** (sheet) | same plan, Task 3 | — |
| `noindex` the empty `/resellers/` pages | **pages** | same plan, Task 4 | — |
| Titles + meta descriptions on store/city pages | **pages** | not yet written | — |
| Per-city show pages · metro/"near you" grouping | **pages** + **lib** | not yet written | doorway-page question (see below) |

⚠️ **All four data tasks are SHEET edits, not JSON edits.** See `CLAUDE.md` → the three
things that will burn you. Renaming a show changes its slug, so every rename needs a
`src/data/redirects.json` entry or a live URL 404s.

🚨 **ANSWERED 2026-08-27 — and it is a live risk, not a hypothetical.** Google's spam
policies name "pages targeted at specific regions or cities that funnel users to one page"
and "substantially similar pages that are closer to search results than a clearly defined,
browseable hierarchy" as doorway abuse. **248 cities have a shop; 146 have exactly one.**
Those one-shop pages sit close to the literal definition of "an intermediate page not as
useful as the final destination."

This **supports** the metro/"near you" work rather than blocking it — genuine nearby content
is the remedy for thin, near-identical pages. But only if: real computed distances (use
`nearestStores`/`cityCentres` in `src/lib/nearby.ts`, 75 km cap), nearby results clearly
labelled with their real town and distance, show detail pages stay canonical, and pages
still thin afterwards get **consolidated or noindexed** rather than shipped.

Full finding + Google's exact wording:
`~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-doorway-page-risk-city-pages.md`

⚠️ **Notebooks are shared state too.** `notebooklm ask` currently fails with
`RPCResponseTooLargeError` on most calls; clearing `conversation_id` from
`~/.notebooklm/profiles/default/context.json` buys about one call. Do **not** run
`ask --new` — it destroys the conversation, and another session was mid-research in the same
notebook.

---

## Log

- **2026-08-27** — *(Fable, SST cwd)* Consolidated a two-session collision. Found
  `src/lib/shows.ts` modified and `tests/unit/show-event-ld.test.ts` untracked from a
  parallel Lighthouse/structured-data session: Event JSON-LD extracted and tested, but
  **never wired to the page**, so the fix it contained had not reached the site. Wired it
  via the existing `absoluteUrl`/`ldJson` helpers and committed as `49179cb9` — every show
  now emits `location.address` (168 of 207 have no street address and were shipping Event
  markup ineligible for the rich result). Landed six untracked planning docs separately as
  `206fe2f4`. Added `CLAUDE.md` and this file. Verified: tsc clean, 266 tests, 1471 pages.
- **2026-08-27** — *(parallel session)* Mapbox deferral / Lighthouse perf work; commits
  `9c17594f`, `53239b57`, `69919ce3`.
- **2026-08-27** — *(earlier)* TCDB show import 165→162 after fixing three data defects
  (`7af64570`).
