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
