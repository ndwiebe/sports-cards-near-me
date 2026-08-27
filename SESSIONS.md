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
| 2026-08-27 | Codex (gpt-5.6-sol), driven by Opus, `scnm-plan4` | **data** | READS `src/data/shows.json`; WRITES only new files under `docs/research/` | Plan 13 — enrich the 162 TCDB shows from their detail pages. Produces a sheet payload for review; **does not write the sheet**. Opus reviews, then does the sheet write separately. |

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

⚠️ **Notebooks are shared state too.** Do **not** run `ask --new` — it destroys the
conversation, and another session may be mid-research in the same notebook.

✅ **`RPCResponseTooLargeError` is FIXED (2026-08-27).** Cause: the package caps an RPC body
at 50 MiB and it was not adjustable; the 66-source GEO notebook returned 52,457,288 bytes —
28 KB over, 0.05%. Clearing `conversation_id` does **not** reliably help (verified). Two
routes now work:
- `notebooklm ask -s <source-id> -s <source-id> "question"` — scoping to sources stays under
  the cap unpatched, and is cheaper. Prefer it.
- `NOTEBOOKLM_MAX_RPC_RESPONSE_MB` (now in `~/.zshrc` at 256) — a local patch makes the cap
  configurable, so unscoped `ask` works too. **`pipx upgrade` silently reverts it.**
- `notebooklm source fulltext <id>` bypasses the chat endpoint entirely and always worked —
  best for reading a known document.

Full cause, verification and a reappliable patch:
`~/jarvis-memory/04-AI-Setup/2026-08-27-notebooklm-rpc-cap-patch.md`

---

## Log

- **2026-08-27** — *(Opus, `scnm-plan4`)* **Task 4 done** — `/resellers/` and
  `/resellers/join/` now carry `noindex` and drop out of the sitemap while
  `resellers.json` is empty, conditional on `MIN_RESELLERS_TO_INDEX = 5` so it reverses
  itself once seeded (`ede35311`). Did not touch `Base.astro` — it is the **perf** lane and
  was in use today; a bare `noindex` already implies `follow`. Verified on built output:
  1468 sitemap URLs, 0 reseller URLs, both pages still reachable.
  **Board correction:** the queued row *"Titles + meta descriptions on store/city pages"*
  and the plan's follow-up of the same name were **already shipped 2026-08-25** as
  `8bff32da` — store titles now carry the review count and the word "Reviews", and that
  commit also removed a false `Top rated:` claim from 351 pages. Do not redo it.
  **Read before more GEO work:** Google's official May-2026 generative-AI guidance
  contradicts four things we had planned — `llms.txt` is inert *for Google*, structured
  data is explicitly *not* a generative-AI lever, "chunking"/quotable-passage rewriting is
  not required, and per-query-variation page generation is named as scaled content abuse
  (which lands on the queued per-city show pages). Two new Nathan-only Search Console
  actions found: a generative-AI **eligibility** setting, and a Generative AI performance
  **report**. Full note:
  `~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-google-ai-optimization-guidance-vs-our-plan.md`
  **Tooling:** `notebooklm ask` still fails with `RPCResponseTooLargeError` even after
  clearing `conversation_id`, but **`notebooklm source fulltext <id>` works** and bypasses
  the chat endpoint entirely — use that to read notebook sources.

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
