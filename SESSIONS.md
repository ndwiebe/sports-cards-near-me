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
| Capital City closure + `status` field design | **data** (sheet + `bake-stores`) | `docs/superpowers/plans/2026-08-27-data-fixes-and-gsc-wins.md` | ✅ unblocked — full closure scan ran 2026-08-27: **32 of 689 shops CLOSED_PERMANENTLY**, real enough to justify designing the field now. Data sits on branch `chore/ratings-refresh` (the monthly workflow's PR-creation step is blocked by a repo Actions permission, `default_workflow_permissions: read` — flagged to Nathan, not fixed unilaterally, it's repo-wide) |
| ~~Calgary Genesis Centre triple~~ | — | — | ✅ shipped 2026-08-27 — deleted via direct sheet write (`gws`), not a CSV hand-off. See log. |
| ~~Leduc rename~~ | — | — | ✅ shipped 2026-08-27, same sheet write |
| ~~Ottawa fold-in~~ | — | — | ✅ **CLOSED 2026-08-28** (`a547ddfb`) — Nathan delegated the call. Confirmed DELETE, not rename: the TCDb Sep-13 row is day 2 of `...ottawa-2026-09-12` (Sep 12→13, same curling rink/address/hours/promoter). Settled by a pattern in our own data — all 3 Curling Rink bookings are 2-day with an EndDate, all Hall A&B are 1-day. Row removed from the payload. No site data changed; the existing redirect is safe (source isn't a real show, target is, nothing shadowed). ⚠️ The earlier HOLD marker was **destroyed** by `70bedb36` regenerating the payload — annotations in generated files don't survive. Reasoning now lives in the vault decisions log. |
| ~~`noindex` the empty `/resellers/` pages~~ | — | — | ✅ shipped 2026-08-27, `ede35311` |
| ~~Titles + meta descriptions on store/city pages~~ | — | — | ✅ shipped 2026-08-25, `8bff32da` — do not redo |
| ~~Click tracking (Directions/Call)~~ | — | — | ✅ **LIVE, verified 2026-08-28.** Two sessions converged on the same diagnosis independently (this row's earlier note re: local unpushed `main` commit `22bab42f` is now superseded, not lost — same root cause, different fix commit landed first). Nathan ran `deploy-click-tracker` from the app; it failed on 3 real bugs (checkout ref, a regex that never matched wrangler's real output, a namespace-title mismatch — see the log entry below), fixed in `ea0d7e55` + synced to `main`. Re-run succeeded, Worker live at `https://scnm-click-tracker.dominathan.workers.dev` (spot-checked: OPTIONS→204, malformed POST→400). Repo var `PUBLIC_CLICK_TRACKER_URL` set. First site redeploy still shipped nothing — `main`'s `site.yml` predated the env var line (same "workflow file needs its own sync" bug as the visibility fix, one level up — see `CLAUDE.md` §2 corollary). Fixed in `de192904`, synced to `main`. **Confirmed live** by curling a real store page: both the Worker URL and the `sendBeacon` call are present in the served HTML. Nothing further needed on this item. |
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

- **2026-08-28** — *(Opus 5, `scnm-plan4`)* **Ottawa Sep-13 duplicate closed (`a547ddfb`), and
  outreach is now formally gated on product readiness.** Nathan delegated the Ottawa call; it was
  a DELETE, not a rename. The TCDb row is day 2 of a show already listed — decided on a pattern in
  our own data (all 3 Curling Rink bookings are 2-day with an `EndDate`; all Hall A&B are 1-day)
  rather than on argument. Chose delete over rename specifically because it needs no slug change,
  hence no redirect — this repo removed three redirects that were *shadowing live show pages* on
  2026-08-27 (`0615115f`). Verified the pre-existing TCDb-slug redirect is safe. No site data
  changed; `shows.json` was already correct.
  - ⚠️ **Process finding worth more than the fix:** the original `HOLD` marker (`3c09f41a`) was
    silently destroyed when `70bedb36` regenerated the payload from TCDb. The row returned looking
    like any other ready-to-paste row. A re-run would have created the duplicate and thrown away
    the earlier session's work. **An annotation inside a generated file is not a durable decision.**
    Row is now deleted rather than re-marked, and the reasoning lives outside the repo.
  - **Outreach: parked, not cancelled.** Nathan's call — hold the 4 drafts and 8 promoter
    candidates until SCNM is "ready to show off as a legit directory and useful tool". This
    overrides the monetization analysis's "start now, no traffic bar", which will keep saying
    otherwise every time it's re-read. Decision note:
    `~/jarvis-memory/decisions/2026/2026-08-28-scnm-outreach-gated-on-product-readiness.md`.
    Does **not** block directory-quality work — the 32 closed-but-listed shops are now the most
    valuable thing on the board, since that's what closes the gate.

- **2026-08-28** — *(Opus 5, `scnm-plan4`)* **Analyzer now reports position by device
  (`44ec7309`).** Follow-through on today's diagnosis: the monthly read was steering by blended
  average position, which is a quarter desktop — a segment at ~position 24 driving a fifth of
  clicks that no work moves. Blended 10.77 vs mobile 8.34 against a ≤7.5 target, so the November
  goal looked nearly twice as far away as it is. The new `DEVICES` section prints the per-device
  split, names the dominant row as the one to steer by, and shows the drag the blend carries.
  Also warns when a device shows a plausible CTR at a deep average position (desktop: 0.97% at
  17.9, where page two earns ~0.2%) — that average is the midpoint of two populations and is not
  a rank to chase. Devices stays optional; verified both ways against the real 2026-08-25 export
  — reproduces 8.34/17.90/10.77 exactly, and runs clean with the sheet deleted. Does **not**
  attempt to fix desktop: five hypotheses eliminated, no fixable cause found, recorded as such.

- **2026-08-28** — *(Opus)* **First closure scan run — 5 candidates, results rescued.** The scan
  works; its output nearly didn't survive. Two independent failures: the new untracked
  `closure-review.csv` never made it into the PR commit, and the PR step fails outright on
  *"GitHub Actions is not permitted to create or approve pull requests"* — a **repo setting**
  (Settings → Actions → General → Workflow permissions), not a code bug. Added an
  `upload-artifact` step with `if: always()` so the CSVs survive both; results now downloadable
  with `gh run download <id> -n ratings-refresh-csvs`. Committed as
  `docs/research/2026-08-28-closure-review.csv`.
  ⚠️ **`gh workflow run <wf>` defaults to the DEFAULT BRANCH (`main`), not your branch.** My
  first re-run silently used main's old workflow, so the artifact step "didn't run" — it wasn't
  there. Use `--ref redesign`. Same family as the site.yml deploy trap already documented above.
  ⚠️ The summary line says **6** CLOSED_PERMANENTLY; the CSV holds **5** data rows. The count
  appears to include the header line — off by one, worth fixing in `refresh-ratings.py`.
  🚨 **Search Console is NOT reachable from this machine.** `dominathan@gmail.com` — the only
  account signed into AI Chrome — has **zero** Search Console properties (it lands on the
  "Welcome/Add a website" screen). SCNM's property lives under a different Google account, so
  the generative-AI eligibility check cannot be done from here by anyone until that account is
  signed in or `dominathan@` is added as a property owner.

- **2026-08-28** — *(Opus 5, `scnm-plan4`)* **Diagnosed the desktop/mobile ranking gap the 25 Aug
  read flagged as never-investigated — and found my own click-tracker fix was inert in
  production.** Full diagnosis:
  `~/jarvis-memory/06-SportsCardsNearMe/2026-08-28-desktop-mobile-ranking-gap-diagnosis.md`.
  - **The gap is real and site-wide**, median **+23.8 positions** worse on desktop across every
    page type. Ruled out, each with evidence rather than argument: query composition (the
    bad-position pool is 8× too small, and the withheld long tail derives to position 10.44 —
    *better* than visible queries); the 2026-08-12 spike (strip the day, desktop is still 17.35);
    local intent (`/guides/card-grading-companies-canada/` has zero local intent and is among the
    worst hit, 35.5 vs 11.7); content differences (static site, byte-identical HTML per device);
    and Core Web Vitals (Search Console has "not enough usage data" for **both** devices).
  - **No mechanism established, and no fixable defect found.** Recording that as the answer rather
    than dressing up a guess. Loose end: desktop CTR of 0.97% at position 17.9 is internally
    inconsistent — desktop is near-certainly bimodal, so 17.9 describes no real query.
  - **The actionable finding is a measurement one.** The plan tracks *blended* position against
    ≤7.5 by 5 Nov. Mobile — 74% of impressions, 76% of clicks — is already at **8.34**, so the site
    is 0.84 short, not the 1.7 the blend implies. Desktop drags the blend ~4.5 weighted points that
    cannot be won back. Recommend reporting mobile position as the headline.
  - **Method note for the next pull:** the staged export can never answer device questions —
    Search Console exports each dimension separately, so `Devices.csv` is three rows of totals.
    Device × query and device × page were pulled live via `dev-browser`. The property is a
    **URL-prefix** property (`https://sportscardsnearme.ca/`); `sc-domain:` returns "no access".
  - **Left for Nathan:** `22bab42f` on local `main`, unpushed — see the click-tracking row above.

- **2026-08-28** — *(Fable, SST cwd)* **`deploy-click-tracker` visibility bug found + fixed —
  and then a real run revealed 3 more bugs the visibility fix alone couldn't have caught.**
  New `workflow_dispatch` workflows are invisible in the Actions UI (web + mobile) until they
  exist on the default branch, confirmed against GitHub's own docs — same shape as a fix
  already sitting in this repo's history for `ratings-refresh.yml`. Pushed just the workflow
  file to `main` via an isolated `git worktree` (confirmed first: `site.yml` only triggers on
  push to `redesign`, so this couldn't fire a production deploy; confirmed after: nothing did).
  Nathan then actually ran it from the app — and it failed, for three real reasons only a live
  run surfaces: (1) `actions/checkout` had no `ref`, so a run dispatched against `main`'s copy
  checked out `main`, where `worker/` doesn't exist — pinned to `ref: redesign`; (2) the KV-id
  regex (`id = "..."`) never matched wrangler's real output (`"id": "..."`, JSON-shaped) — it
  had **created a namespace successfully on every possible run and then reported failure
  regardless**, confirmed by testing the fixed pattern against the actual failing run's log
  line; (3) the "find existing namespace" check looked for a title ending in
  `scnm-click-tracker-CLICKS`; a bare `wrangler kv namespace create CLICKS` with no project
  config actually titles it exactly `CLICKS` — the old check would never have found it on a
  second run and would have tried to create a duplicate every time. A real namespace already
  exists from Nathan's run (`67ed7ea5b1f44afaae3d9797d1c0b2a0`, titled `CLICKS`) — the fixed
  lookup will find and reuse it. Fixed on `redesign` (`ea0d7e55`), re-synced to `main` the same way (isolated worktree again).
  **Not yet re-run** — waiting on Nathan to retry from the app.

- **2026-08-28** — *(Opus, `scnm-plan4`)* **Plan 14 verified — no work needed, it was already
  done correctly by the parallel session.** I claimed lib+data to run Plan 14 through Codex;
  Codex could not execute (see below) and by the time I fell back to doing it myself, the
  other session had already implemented it *and* fixed two things past what my plan said.
  Credit where due: **my Plan 14 was wrong about Ottawa.** It said "fold the TCDb row into the
  Capital Trade Shows series by renaming it". The surviving series row runs **2026-09-12 →
  09-13** — a two-day event at the same curling rink — so the TCDb single-day 09-13 row is a
  *duplicate of day two*, not a differently-named show. Renaming it would have published the
  same weekend twice. The right action was delete + redirect to the surviving row, which is
  what shipped. My verification had asked only "does a row exist with startDate 09-13", which
  a multi-day event answers "no" to.
  Verified at HEAD: 204 shows, **0 broken show redirects** (all 5 resolve to real pages),
  Ottawa duplicate gone, Leduc renamed, 274 tests, 1468 pages. Nothing left to commit.
  ⚠️ **`codex exec` is currently unusable on this machine (2026-08-28).** Turns write a
  `task_started` event to `~/.codex/sessions/` and then sit at 0% CPU indefinitely — three
  runs killed after 20+ minutes each. Auth is fine (`codex login status` responds instantly),
  and disabling MCP servers (`-c 'mcp_servers={}'`) does not help. A recurring
  `codex_models_manager: failed to renew cache TTL: missing field 'base_instructions'` error
  accompanies it. It worked on 2026-08-27 (Plan 13). Treat Codex as unavailable until a run
  proves otherwise, and check for a session file before assuming a run has begun.

- **2026-08-28** — *(Opus 5, `scnm-plan4`)* **Reviewed the 2026-08-27 monetization report and
  found a live trap in the click-tracker handoff.** Most of the report checked out against its
  sources — GSC figures, 689/146/0 counts, competitor listing counts, and the core "free outreach
  now, paid outreach much later" judgment. Four things did not:
  - **`PUBLIC_CLICK_TRACKER_URL` was never added to `site.yml`.** This file recorded the remaining
    step as one Nathan-only command; that command was necessary and *not sufficient*. The site
    builds on GitHub Actions, so a variable never passed into that build step doesn't exist at
    build time and the listener was omitted from every page. Deploying the Worker alone would have
    produced a running, correctly-configured counter receiving nothing, indefinitely, with green
    checkmarks on both workflows. Fixed in `0a5e9f8f`; verified both directions against a real
    build (unset → 0 `sendBeacon`; set → URL present, 4 `data-track-click` hooks).
  - **The report's section 3 went stale two hours after it was written** — it recommended PostHog
    or GA4, both already considered and rejected by `9159e9e0` (Cloudflare has no event model;
    GA4 is a cookie-consent decision that is Nathan's). Report patched with a visible correction
    banner rather than silently rewritten, so the staleness stays legible.
  - **Ecosystem callout added to store + city pages** (`0a5e9f8f`, 937 pages = 689 + 248, confirmed
    in built output). The report's premise was half wrong: `EcosystemFooter` is in `Base.astro` and
    has always been sitewide, so only the in-content callout was missing. Labelled as Nathan's own
    per about.astro's Independence section and PLAN.md G3. **`sell/index.astro`'s older callout does
    not carry that label and arguably should — flagged, deliberately not changed here.**
  - **Did not redo the titles/meta pass** — this file says shipped `8bff32da`, do-not-redo. Confirmed
    live on the real URL rather than trusted: `Outpost… — 4.7★, 365 Reviews · Edmonton`, and city
    descriptions now read "ranks first on our review-weighted score". Also note `8bff32da`'s
    "Actions minutes exhausted until 2026-09-01" is **stale** — runs have succeeded since, including
    two `site --ref main` publishes on 2026-08-27.

  Nothing published: `0a5e9f8f` changes copy on 937 live pages, so production is Nathan's call.
  274 unit tests, typecheck clean, 1468 pages built.

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
