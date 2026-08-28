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

## Queued — claimed but not started

| Work | Lane | Plan | Blocked on |
|---|---|---|---|
| Capital City closure + `status` field design | **data** (sheet + `bake-stores`) | `docs/superpowers/plans/2026-08-27-data-fixes-and-gsc-wins.md` | ✅ unblocked — full closure scan ran 2026-08-27: **32 of 689 shops CLOSED_PERMANENTLY**, real enough to justify designing the field now. Data sits on branch `chore/ratings-refresh` (the monthly workflow's PR-creation step is blocked by a repo Actions permission, `default_workflow_permissions: read` — flagged to Nathan, not fixed unilaterally, it's repo-wide) |
| ~~Calgary Genesis Centre triple~~ | — | — | ✅ shipped 2026-08-27 — deleted via direct sheet write (`gws`), not a CSV hand-off. See log. |
| ~~Leduc rename~~ | — | — | ✅ shipped 2026-08-27, same sheet write |
| ~~Ottawa fold-in~~ | — | — | ✅ resolved as a DELETE (confirmed duplicate, not a rename) — shipped same write |
| ~~`noindex` the empty `/resellers/` pages~~ | — | — | ✅ shipped 2026-08-27, `ede35311` |
| ~~Titles + meta descriptions on store/city pages~~ | — | — | ✅ shipped 2026-08-25, `8bff32da` — do not redo |
| ~~Click tracking (Directions/Call)~~ | — | — | Built 2026-08-27 (`9159e9e0`), **wired into the build 2026-08-28 (`0a5e9f8f`)** — the Worker alone was never enough: `PUBLIC_CLICK_TRACKER_URL` was missing from `site.yml`, so the listener was omitted from every page and a deployed Worker would have received nothing forever, both workflows green. **Nathan-only, in order:** (1) `gh workflow run deploy-click-tracker.yml --ref redesign` (provisions real billed infra — a session is correctly blocked from this), (2) set the printed URL as repo variable `PUBLIC_CLICK_TRACKER_URL`, (3) `gh workflow run site --ref main` to publish, then check a live store page for `sendBeacon` |
| Per-city show pages as a NEW page type | — | — | ❌ **DECIDED AGAINST 2026-08-27** — see the decision record below. Enrichment (Plan 15, above) replaces this. |

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

✅ **Decided 2026-08-27, executing now (Plan 15, Active table above):** enrich, don't build
new per-city pages. Decision record:
`~/jarvis-memory/decisions/2026/2026-08-27-scnm-thin-city-pages-enrich-not-new-pages.md`.

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

- **2026-08-27** — *(Fable plans → Codex executes, read-only)* **Plan 16 done — 8 verified
  candidates across 4 promoter relationships, 4 drafts, nothing sent.** Checked all 204
  show records (86 distinct names). Every candidate was actually loaded, not inferred —
  and it shows: 14 shows with plausible-looking vendor pages were correctly rejected as
  application forms or table-count marketing copy with no named roster (Vancity's "600+
  tables" claim, West Van's three venue pages, Greater Toronto's "80+ table" page, etc.).
  Report: `~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-show-vendor-list-outreach-candidates.md`.
  Spot-checked 2 of the 8 candidates independently (not just re-read the report): the
  Saskatchewan vendors page really does name ~50 individual businesses matching the report
  exactly (Uncle Jays Collector, Living Sky Collectibles, GP Sports Cards Trading among
  them), and the Sport Card Expo Toronto dealer PDF link resolves exactly as cited. A
  personal promoter contact on the Collections Montréal page was correctly kept out of
  everything except the private vault note, per the plan's rule. Repo confirmed untouched
  (`git status` clean) — Codex deliberately skipped writing a SESSIONS.md marker under its
  read-only instruction; releasing the lane here instead.

- **2026-08-27** — *(Opus review of `b85986fa`, then Fable fix)* **Plan 15 reviewed, one
  real defect found and fixed, shipped to production.** Opus independently re-derived every
  Definition-of-Done number (146/136/10, page count, gating on both directions) rather than
  trusting the commit message — all held. It also measured the "does this create its own
  thin-content problem" question rather than eyeballing it: 136 nearby-shop sets across 9,180
  page-pairs, only 2 near-identical, 365 distinct shops surfaced — genuine local relevance,
  not templated filler, no cap needed. **Real defect: 25 city pages (MB/NL/NS/NT/PE) rendered
  an empty "Upcoming card shows in {province}" heading** when a province had none scheduled —
  contradicting the plan's own no-empty-scaffolding rule and the pattern the two sibling
  sections in the same file already use. 6 of those pages were net-negative (isolated + no
  Nearby-shops content + this empty heading). Fixed by gating the section the same way its
  neighbours already are (`c28fbe54`); confirmed on Sydney NS (the worst case) that the empty
  section is gone and the "Card shows in Nova Scotia" link-out is untouched. Re-verified
  site-wide: 0 pages now show the empty message. `npm run typecheck && npm test && npm run
  build` clean throughout. Pushed and deployed to production (`gh workflow run site --ref
  main`) — verified live.

- **2026-08-27** — *(Fable plans → Codex executes → Opus reviews)* **Plan 15 implemented,
  verified, awaiting commits because the managed Codex sandbox cannot write this linked
  worktree's Git metadata.** All 248 city pages now surface their province's upcoming shows;
  136 of 146 one-shop cities also render up to 5 real nearby `StoreCard`s using the shared
  city-centre distance logic. The 10 isolated one-shop cities render no empty nearby header,
  and all 102 multi-shop cities remain without the thin-page-only block. Page count stayed
  **1468 → 1468**. Verified with `npm run typecheck && npm test && npm run build`: TypeScript
  clean, 274/274 tests, 1468 pages. Browser launch and localhost preview were both blocked by
  the managed macOS sandbox, so the 375px rendered check could not run; exhaustive generated-
  HTML checks covered all 248 city pages instead. No push.

- **2026-08-27** — *(Opus plans → Codex gpt-5.6-sol executes → Opus reviews)* **Plan 13 done,
  live.** Street addresses on shows **39 → 200 of 207**; websites 45 → 127; show pages emitting
  Event markup with a full `streetAddress` 39 → 200 (`70bedb36`). The unlock: the address and
  web address were already on TCDB's **detail** pages — the list view scraped that morning just
  omits them — so it was a bounded scrape of 162 known URLs, not research.
  **Review found one thing worth keeping:** Codex excluded 5 rows as city conflicts; all 5 were
  the *St. Catherines* / *Lloyminster* misspellings we had corrected in our own data hours
  earlier. It compared city strings pairwise so it could not see that 4 of them scraped the
  identical address 5 sibling rows at the same venue had already validated. Overridden with
  corroboration required. Admission is still 0 of 207 — six Notes blocks mention a price and
  the plan (rightly) forbade deriving it from prose.
  **Codex traps that each cost a dead run — see
  `~/jarvis-memory/04-AI-Setup/2026-08-27-codex-exec-sandbox-and-stdin-traps.md`:**
  backgrounded `codex exec` hangs forever on stdin (`< /dev/null` fixes it, and no session file
  under `~/.codex/sessions/` means it never started), and `-s workspace-write` blocks the
  network **including localhost** — add `-c sandbox_workspace_write.network_access=true` rather
  than falling back to `danger-full-access`.

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
- **2026-08-27** — *(Sonnet build, took over a stale Plan 14 claim — the prior
  Codex-via-Opus attempt only committed the plan doc itself, no process was running)*
  **Plan 14 done** (`09a42c54`) — closure-detection groundwork + the two show corrections. Part A:
  `places.businessStatus` added to `refresh-ratings.py`'s field mask, `CLOSED_PERMANENTLY`
  now routes to a new `docs/research/closure-review.csv` for human review; no `status`
  field anywhere, scan not run (key is a CI secret). Part B: emitted
  `docs/research/2026-08-27-plan14-sheet-payload.csv` (3 rows — Leduc rename ×2, Ottawa
  fold-in ×1) for Opus to write to the sheet; added 3 `redirects.json` entries for the
  changed slugs (derived via the repo's own `slugify`, not hand-written).

- **2026-08-27** — *(Opus review of `09a42c54`)* **Caught a real defect before push: the 3
  redirects shadowed live show pages.** They keyed on the shows' *current* slugs, which are
  still live (the sheet hasn't been written), and Astro's redirects config wins over the
  generated page — so the build silently swapped all three real show pages for redirect
  stubs. One was Leduc's Aug 29 show, which was **that coming weekend**. Page count
  1471 → 1468, all three dropped from the sitemap, the Event markup shipped earlier that
  same day went with them. `redirects.test.ts` stayed green because its shadow-check only
  matches `/store/...` paths. Also confirmed the "3 rows not 4" merge was correct (verified
  `capitaltradeshows.com` appears exactly once in `shows.json`, on the same row as the
  fold-in) and flagged a second, smaller gap: `closure-review.csv` was written every run but
  never reached the monthly PR. **Full review, including a likely-duplicate finding on the
  Ottawa row (see below), in the task transcript — not filed as a separate note.**

- **2026-08-27** — *(Fable, fix + verify)* Removed the 3 shadowing redirects (`0615115f`) and
  proved it with a build: page count 1471 → 1468 → 1471, all three URLs confirmed serving
  real content again and back in the sitemap — not just re-counted. Added
  `closure-review.csv` to `ratings-refresh.yml`'s summary and `add-paths` (same commit).
  **Independently re-verified the Ottawa duplicate finding** by reading both show records
  directly: `...ottawa-2026-09-12` (Sep 12–13, "Nepean Sportsplex (Curling Rink)") and the
  TCDb row being folded in (Sep 13, "Nepean Sportsplex CURLING RINK") are almost certainly
  one real event from two scrapes. Marked that row `HOLD` in the payload CSV with the
  reasoning inline (`3c09f41a`) rather than deciding it — delete-and-redirect vs.
  rename-in-place changes what gets pasted, and that's Nathan's call. Leduc rows marked
  ready. `npm run typecheck && npm test` (270/270) and `npm run build` (1471 pages) all pass
  on both fix commits. **Nothing sheet-side has been written — the CSV is guidance, not an
  action taken.**

### 2026-08-28 — Opus 5 · review of the monetization report, and the blocker it exposed

Reviewed `~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-scnm-metrics-outreach-monetization.html`
against its own sources and this repo. Most of it checked out — GSC figures, 689/146/0 counts,
competitor listing counts and the core "free outreach now, paid outreach much later" judgment
are all sound. Four things did not, and one of them was a live trap:

- **`PUBLIC_CLICK_TRACKER_URL` was never added to `site.yml`.** This file recorded the remaining
  step as one Nathan-only command. That command was necessary and not sufficient: the site builds
  on GitHub Actions, so a variable not passed into that build step doesn't exist at build time.
  Deploying the Worker would have produced a running counter receiving nothing, indefinitely,
  with green checkmarks on both workflows. Fixed in `0a5e9f8f`, verified both directions against
  a real build (unset → 0 `sendBeacon`; set → URL present, 4 `data-track-click` hooks).
- **The report's section 3 was stale within two hours of being written** — it recommended PostHog
  or GA4, both already considered and rejected by `9159e9e0`. Report patched with a visible
  correction banner rather than silently rewritten, so the staleness stays legible.
- **Ecosystem callout added to store + city pages** (`0a5e9f8f`, 937 pages). Note the report's
  premise was half wrong: `EcosystemFooter` is in `Base.astro` and has always been sitewide.
  Only the in-content callout was missing. Labelled as Nathan's own per about.astro's Independence
  section and PLAN.md G3 — `sell/index.astro`'s older callout does **not** carry that label and
  arguably should; flagged, not changed.
- **Did not redo the titles/meta pass.** This file says shipped `8bff32da`, do-not-redo; confirmed
  live on the real URL (`Outpost… — 4.7★, 365 Reviews · Edmonton`, and city descriptions now say
  "ranks first on our review-weighted score"). Also note `8bff32da`'s "Actions minutes exhausted
  until 2026-09-01" is stale — runs have succeeded since, including two `site --ref main` publishes.

Nothing published. `0a5e9f8f` changes copy on 937 live pages, so production is Nathan's call.
274 unit tests, typecheck clean, 1468 pages built.
