# Q4 Plan — sheet-change engine, weekly digest, missing row-count guards

**Session:** Sonnet 5, worktree `scnm-q4-automation` (branch `q4-automation`).
Lanes touched: **data** (`scripts/*`) and **lib** (new files only — `src/lib/shows.ts`,
`src/pages/**`, `src/components/**` stay untouched; three parallel sessions own those).
Implements PRD `docs/PRD-q4-2026-growth.md` Phase 2b (sheet-change engine + digest) and
2c (closure auto-apply), plus the CLAUDE.md-flagged missing row-count guards on
`bake-shows`/`bake-resellers`.

**Hard limits for this whole plan:** no live Google Sheet writes, no live Places API calls,
no `.github/workflows` edits, no `src/data/*.json` edits, everything built and tested against
fixtures or an in-memory/file-backed mock. `npm run build` must still report 1548 pages before
the final commit.

---

## ⚠️ A conflict this plan surfaces but does not resolve

`src/lib/types.ts` (the `Store.status` field comment) and `scripts/refresh-ratings.py`
(the Part-A closure-scan comment, referencing a decision record from 2026-08-27) both say,
explicitly and for a reasoned cause: **`status` must never be written from Google's
`businessStatus`, because it reports moved/rebranded shops as permanently closed too, and
"unlisting a live business is the worst error this directory can make."** That is a
Nathan-decided rule (`~/jarvis-memory/decisions/2026/2026-08-27-scnm-show-naming-and-closed-shop-status.md`),
not a stray comment.

PRD Phase 2c, and this session's task brief, ask for the opposite: auto-apply
`CLOSED_PERMANENTLY` → `status: closed` (reversibly, logged, digested).

**Resolution for this plan:** build the CLOSURE classification and auto-apply *pathway* in
the new sheet-change engine exactly as the PRD asks — but do not touch
`scripts/refresh-ratings.py`'s existing scan-only behavior, and do not wire anything that
would let it run unattended against the real sheet. The engine treats a closure proposal
as just another `ProposedChange` object; nothing in this repo generates one automatically
from `refresh-ratings.py` today, and connecting those two is a separate, explicit decision
for Nathan to make (the plan doc for that step should point back at the 2026-08-27 decision
record and ask him to confirm or override it). This is called out again in the final report.

---

## 1. Shared dataset-shrink guard (`src/lib/dataset-guard.ts`)

Generalizes `assertCountSane` (currently store-only, in `stores-build.ts`) for reuse by
shows, resellers, and the change engine's delete/merge path. Unlike stores, shows and
resellers have **no absolute floor** — an empty sheet is a legitimate bootstrap state for
both (see the "NO count guard" comments already in `bake-shows.ts` / `bake-resellers.ts`).
What both scripts actually lack is protection against a sheet read going sideways (wrong
tab, truncated response, auth hiccup) and silently baking a near-empty file over a real one.

```ts
export function assertNoUnexpectedShrink(
  label: string,
  next: number,
  prev: number | null,
  { dropRatio = 0.5 }: { dropRatio?: number } = {},
): void {
  if (prev === null || prev === 0) return; // nothing to compare against, or a legitimate empty-start state
  if (next < prev * dropRatio) {
    throw new Error(`bake guard: ${label} ${next} is a >${Math.round((1 - dropRatio) * 100)}% drop from previous ${prev}`);
  }
}
```

50% is deliberately looser than the store guard's 10% — shows/resellers are smaller, more
volatile datasets (a single bad week of recurring-show de-duplication can look like a big
percentage move) and the goal is catching a sheet-read *failure*, not policing normal
editorial change. Documented inline so the threshold choice isn't silently copied verbatim
into a context where it's wrong.

Tests: `tests/unit/dataset-guard.test.ts` — passes on growth, on `prev === null`, on
`prev === 0`; throws on a >50% drop; does not throw on exactly the boundary in the safe
direction.

## 2. Wire the guard into `bake-shows.ts` and `bake-resellers.ts`

Same `previousCount()` pattern already used in `bake-stores.ts` (read the existing output
JSON, `.length`, `null` if the file doesn't exist yet). Call
`assertNoUnexpectedShrink('shows', shows.length, prev)` /
`assertNoUnexpectedShrink('resellers', resellers.length, prev)` **after** mapping/dedup,
**before** `writeFile`, mirroring where `bake-stores.ts` calls `assertCountSane`. Update the
"NO count guard" comments to describe what the new guard does and doesn't do, so the next
reader isn't told something false.

Tests: extend `tests/unit/stores-build.test.ts`-style coverage — add
`tests/unit/dataset-guard.test.ts` (pure function, above) rather than trying to unit-test the
bake scripts' file I/O directly (they aren't structured for that today, and restructuring them
is out of scope for a guard addition). The scripts stay thin wrappers; the guard logic is
where the tests live, same division already used for `assertCountSane`.

## 3. Sheet-change engine (`src/lib/sheet-change-engine.ts`, `src/lib/sheet-change-client.ts`, `scripts/sheet-change-engine.ts`)

**Payload shape** (`ProposedChange`): `sheet`, `rowKey`, one of four `op` kinds
(`update` | `add-row` | `delete-row` | `rename`; `merge` modeled as a tagged `delete-row`
with a `mergedInto` rowKey, so it reuses the same undo primitive), `source`, `reason`.
`update`/`rename` carry `column`/`oldValue`/`newValue` per the brief. `delete-row` carries a
`snapshot` of the full row (required — it's what makes undo possible without re-reading a
sheet that may have moved on).

**Classification** (`classifyChange`), safe-by-default (unrecognized shape → `risky`):

- `closure` — `sheet: 'Stores'`, `op: 'update'`, `column: 'Status'`, `newValue: 'closed'`,
  `source` in a small trusted-source allowlist (currently just `refresh-ratings.py`, since
  that's the only producer named in the PRD).
- `low-risk` — `add-row` from a trusted source (`tcdb`, `refresh-shows.py`); `update` on
  `Hours`, `Rating`, or `Logo`.
- `risky` — `delete-row`, `merge` (tagged delete), `rename`; any other `update` (including
  any `Status` update that isn't the closure shape above); any `add-row` from an
  unrecognized source.

**Mode switch** (`EngineMode`): `'review-all'` (default) or `'auto-low-risk'`.
`shouldAutoApply(level, mode)` returns `false` unconditionally in `review-all` — matching
the brief ("For the first two weeks everything runs in review-everything mode") literally,
including closures. In `auto-low-risk` it returns `true` for `low-risk` and `closure`,
`false` for `risky`.

**Guardrails, in `processChange`:**
1. Optimistic check — `client.getRow` and compare the current value at `column` (or row
   existence, for `add-row`/`delete-row`) against `oldValue`/`snapshot` before writing
   anything. Mismatch aborts with a clear "value changed since this was proposed" error —
   never silently overwrites.
2. Row-count guard on `delete-row` — `client.countRows(sheet)` before/after, run through
   `assertNoUnexpectedShrink`.
3. Append-only log entry for every outcome: `applied`, `queued`, `rejected`.
4. Auto-applied changes and manually approved changes both go through the same `apply()`
   path (no special-cased write route for "automatic").

**Change log** (`ChangeLog` interface + `JsonlChangeLog` implementation): one JSON object
per line, appended (never rewritten), at `docs/change-log/sheet-changes.jsonl`. Recommending
a repo file over a sheet tab: it's git-diffable, needs no extra Sheets write scope, and
survives the sheet being copied for a dry run. Documented trade-off in the plan (and
repeated in the final report): a sheet tab would be more visible to Nathan without opening a
terminal — worth revisiting once he's seen the file version in practice.

**Undo** (`undoChange`): looks up the `applied` log entry by id, builds the inverse op
(`update`/`rename` → swap old/new; `add-row` → `delete-row` using the row as its own
snapshot; `delete-row` → `add-row` from the logged snapshot), re-runs the optimistic check
against current sheet state, applies, logs an `undone` entry referencing the original id.
Refuses (rather than double-undoing) if the id is already undone or was never applied.

**Approve/reject** (`approveChange`, `rejectChange`): operate on a `queued` log entry by id;
approve re-validates and applies (same path as auto-apply); reject just logs, no write.

**CLI** (`scripts/sheet-change-engine.ts`): thin wrapper, subcommands `process
<payload.json> [--mode review-all|auto-low-risk]`, `list-pending`, `approve <id>`,
`reject <id> [--note ...]`, `undo <id>`. Defaults to a local `JsonFileSheetClient` backed by
`scripts/fixtures/sheet-state.sample.json` (a small representative Stores/Shows fixture) —
**there is no live-sheet client in this repo**, by design, per the hard limits. The CLI's
own `--help` and the plan/report both say plainly what a live client would need (see §6).

**Client abstraction** (`src/lib/sheet-change-client.ts`): `SheetClient` interface
(`getRow`, `updateCell`, `addRow`, `deleteRow`, `countRows`). Two implementations:
`InMemorySheetClient` (unit tests — constructed from a plain object, no I/O) and
`JsonFileSheetClient` (CLI demo/dry-run — reads/writes a local JSON file, still zero
network calls). No Google API or `gws` call is implemented anywhere in this plan.

Tests: `tests/unit/sheet-change-engine.test.ts` (classification table, mode switch, optimistic
check failure, row-count guard trip, full apply→undo round trip, approve/reject flow, merge
modeled as tagged delete, rename requires `oldSlug`/`newSlug` and the classifier always
returns `risky` for it) and `tests/unit/sheet-change-client.test.ts` (both `SheetClient`
implementations against a shared contract test).

## 4. Weekly digest generator (`src/lib/weekly-digest.ts`, `scripts/weekly-digest.ts`)

Pure function `buildDigest(input) -> string` (markdown) so it's unit-testable without file
I/O, plus a thin CLI wrapper that gathers its inputs and writes
`docs/digests/YYYY-MM-DD-weekly-digest.md`.

Inputs, each optional (the digest still renders sensibly when a source is missing — "not
reachable this run" rather than a crash):
- The change log (`JsonlChangeLog`, read-only) → applied changes this week, queued changes
  awaiting approval **with the exact `tsx scripts/sheet-change-engine.ts approve <id>`
  command**, and anything undone.
- The most recent `docs/research/click-events-report-*.csv` (from `docs/click-tracking.md`'s
  `click-report.py`, which needs authenticated Wrangler and isn't run by this generator) →
  month-over-month combined-taps trend by summing the `combined` column per month. Absent
  file → "Click data not reachable this run — run `python3 scripts/click-report.py` first
  (needs Wrangler login)."
- An optional job-status feed (`docs/digests/job-status.json`, shape
  `{ name, status, lastRun }[]`) → a "failing jobs" section. No file → "No job-status feed
  wired up yet"; §6 below describes what wiring it to `gh run list` would look like (not
  built here — no workflow-file or live `gh` calls in this plan).

Written in plain English throughout — Nathan is a CPA, not an engineer — per every
CLAUDE.md in this environment. Every jargon term (sheet tab, KV, row-count guard, optimistic
check) gets a plain-English gloss the first time it appears in the digest body, the same
rule that applies to every other artifact in this session.

Tests: `tests/unit/weekly-digest.test.ts` — renders with all three inputs present, renders
sensibly with all three absent, renders the exact approve command for a queued entry, sums a
two-month click CSV fixture correctly.

## 5. Order of work (TDD)

1. `dataset-guard.ts` + test → wire into `bake-shows.ts`/`bake-resellers.ts`.
2. `sheet-change-client.ts` (+ contract test) before the engine, since the engine depends on
   the interface shape.
3. `sheet-change-engine.ts` (classification → mode switch → guardrails → apply → undo →
   approve/reject), test-first for each piece.
4. `scripts/sheet-change-engine.ts` CLI, exercised manually against the sample fixture (not
   unit-tested line-by-line — it's a thin argv/file-I/O wrapper over already-tested lib code,
   consistent with how `bake-*.ts` are treated in this repo).
5. `weekly-digest.ts` (+ test) → `scripts/weekly-digest.ts` CLI → generate one sample digest
   against fixtures for the final report.
6. `npm run typecheck && npm test` after each numbered step, not just at the end.
7. Final `npm run build`, confirm 1548 pages, commit.

## 6. What Nathan would need to provide before any of this touches the real sheet

Listed here and repeated in the final report, not assumed or built around:

- A Google **service account** (or OAuth client) with **edit access to a copy of the sheet**
  for the first dry run — never the live sheet ID
  (`14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I`) until the dry run is reviewed.
- A decision on the §0 conflict: does the 2026-08-27 "never auto-set `status` from
  `businessStatus`" rule stand, or does he want to override it for the reversible/logged/
  digested version this plan builds the pathway for?
- A decision on where the change log should live long-term (repo file, as built here, vs. a
  sheet tab) once he's seen a real digest.
- Sign-off on the scheduled job this plan does **not** add: a weekly `workflow_dispatch` (or
  cron) running `scripts/sheet-change-engine.ts process` in `auto-low-risk` mode against the
  real client, once one exists. No `.github/workflows` file is touched by this plan; this is
  a description for Nathan to review, not a change.

---

## 7. Go-live (added 2026-09-26, session `q4-engine`)

Everything above this section was written before a real Google Sheets client existed. It now
does (`src/lib/google-sheets-client.ts`, `GoogleSheetsClient`), and the CLI
(`scripts/sheet-change-engine.ts`) has a `--live` flag that points it at the real production
directory sheet. This section is the plain-English "what happens when you actually run it"
that §6 said would need writing once that existed.

### How live mode works

The CLI's default behavior is unchanged: with no flags it reads/writes a local JSON file
standing in for the sheet, so it's always safe to run. Two flags change that:

- `--sheet-id <id>` points at a **real** Google Sheet by id (e.g. a **TEST COPY** you made
  with Google Sheets' own "Make a copy") — useful for a dry run against something real without
  any risk to the live directory.
- `--live` points at the **real production sheet** that feeds sportscardsnearme.ca. This is
  the one that matters, so it's gated harder than `--sheet-id`:
  - It requires the `SCNM_SHEET_KEY_FILE` environment variable — the local file path to the
    service account's private key (a service account is a Google-managed login that belongs
    to this automation, not to a person; Nathan created one for the sheet-automation trial,
    per his 2026-09-23 decision).
  - It ALSO requires the `SCNM_ALLOW_LIVE_SHEET=1` environment variable, set at the same time.
    Either one alone refuses with a clear error — a stray `--live` flag, or a leftover env
    var from an old session, should never by itself be enough to touch the real directory.
  - `--live` and `--sheet-id` can't be combined — `--live` always means the one real sheet.

The full contract another tool (or Nathan, by hand) uses to drive this:

```bash
SCNM_SHEET_KEY_FILE=~/.config/scnm/sheet-bot.json SCNM_ALLOW_LIVE_SHEET=1 \
  npx tsx scripts/sheet-change-engine.ts process <payload.json> --live [--mode auto-low-risk] [--log <path>]
SCNM_SHEET_KEY_FILE=... SCNM_ALLOW_LIVE_SHEET=1 npx tsx scripts/sheet-change-engine.ts list-pending --live
SCNM_SHEET_KEY_FILE=... SCNM_ALLOW_LIVE_SHEET=1 npx tsx scripts/sheet-change-engine.ts approve <id> --live
SCNM_SHEET_KEY_FILE=... SCNM_ALLOW_LIVE_SHEET=1 npx tsx scripts/sheet-change-engine.ts reject <id> --live
SCNM_SHEET_KEY_FILE=... SCNM_ALLOW_LIVE_SHEET=1 npx tsx scripts/sheet-change-engine.ts undo <id> --live
```

`reject` never writes to the sheet at all (it only logs a decision), so it works with or
without the env vars being set — they're listed above only for a consistent invocation.
The change log's default path (`docs/change-log/sheet-changes.jsonl`) is the same whether or
not `--live` is passed; there's no separate "live log", by design, so one file always has the
whole history.

### The trial lock (two weeks of review-only, even for closures)

Nathan approved a sheet-automation trial 2026-09-23 on the terms the PRD already stated for
this engine: "the first two weeks run in review-everything mode before automatic writes are
switched on." `src/lib/live-mode-guard.ts` is what actually enforces this once a live client
exists:

- **`LIVE_TRIAL_LOCK_UNTIL` = 2026-10-10T00:00:00Z**, a named constant in that file (not
  hardcoded anywhere else).
- Before that date, `--live` combined with `--mode auto-low-risk` is **refused outright**,
  with an error explaining the trial — it does not silently fall back to `review-all`, because
  that could look like the flag "worked" when it didn't do what was asked. Every live change
  during the trial queues for Nathan's review, including a shop closure, which is otherwise
  auto-appliable under `auto-low-risk` mode.
  - `--live` with `--mode review-all` (the default — you don't need to pass `--mode` at all)
    works throughout the trial, including before 2026-10-10.
- After 2026-10-10, `--live --mode auto-low-risk` is allowed, subject to everything else the
  engine already does (the optimistic check, the row-count guard, the append-only log).

### How Nathan approves a queued change

Whether a change is queued because of the trial lock or because the engine classified it as
`risky`, the process is the same, and needs no terminal skill beyond copy-paste:

1. `npx tsx scripts/sheet-change-engine.ts list-pending --live` (with the env vars set) prints
   every change waiting on him, in plain English, with the exact `approve` or `reject` command
   next to each one. The weekly digest (`docs/digests/`) shows the same thing without needing
   a terminal at all.
2. He can either run that exact command himself, or simply tell Claude "approve change
   `<id>`" (or "reject", or "undo") in a normal conversation — any session with this repo open
   can run the command on his behalf. There is no separate approval UI; the command IS the
   approval.
3. Every applied change, including an auto-closure, has a one-command undo next to it in the
   same log/digest, forever (not just during the trial).

### The workflow change `.github/workflows/ratings-refresh.yml` needs (not made here)

Per this session's hard limits, no `.github/workflows/*.yml` file is edited by this plan —
CLAUDE.md's Corollary means a workflow FILE's own definition needs a separate push to `main`
that Nathan reviews, distinct from ordinary `src/`/`docs/`/`scripts/` changes. `refresh-ratings.py`
now also writes `docs/research/ratings-refresh-payload.json` (see §3a), and the workflow should
be updated, when Nathan approves that push, to:

1. Add `docs/research/ratings-refresh-payload.json` to the **"Upload the CSVs as an artifact"**
   step's `path:` list, alongside the three files already there — so the payload survives the
   same failure modes (a lost untracked file, a blocked PR-creation step) the 2026-08-28 comment
   in that step describes.
2. Add the same path to the **`create-pull-request`** step's `add-paths:` list, so it's
   actually included in the PR the workflow opens, not just uploaded as a separate artifact.
3. Optionally extend the **"Summarise"** step to report how many proposed changes came out of
   this run (mirroring the CSV-count lines already there), e.g. counting entries in the JSON
   payload the same way it counts CSV rows today.
4. This does **not** by itself run the sheet-change engine against anything — the workflow
   still only produces a payload file for a human (or a separately-approved automation step,
   §6's still-unbuilt weekly `workflow_dispatch`) to feed into
   `scripts/sheet-change-engine.ts process`. Wiring that run to happen automatically, live, and
   unattended is the separate sign-off §6 already flagged and this section doesn't grant.
