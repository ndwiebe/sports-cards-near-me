# Sports Cards Near Me (SCNM) — repo rules

Canadian card-shop + card-show directory. Astro static site, ~1,471 pages, live at
**sportscardsnearme.ca**. 689 shops · 207 shows · 0 resellers.

**Read `SESSIONS.md` before you start work.** More than one Claude session works in this
repo at once. That file is the live board of who is touching what.

---

## 🚨 The three things that will burn you

### 1. `src/data/*.json` are GENERATED. Editing them does nothing.

`stores.json`, `shows.json` and `resellers.json` are baked from **one Google Sheet**
(`14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I`, tabs `Shows` / `Resellers` / stores-by-GID).
CI runs `npm run bake && npm run bake:shows && npm run bake:resellers` **on every deploy,
before the build.**

They are also committed to git. That combination is the trap: your local edit commits
cleanly, tests pass, the site builds — and then the next deploy silently overwrites it from
the sheet. It looks like it worked right up until it's gone.

**A data correction is a SHEET edit, not a JSON edit.** Adding a field means adding a sheet
column *and* updating the row-mapper (`rowToShow` in `src/lib/shows.ts`, etc.). A pinned
header test fails loudly if a column moves — that guard is deliberate, don't route around it.

Re-baking locally is how you verify: `npm run bake:shows` then check the diff is only what
you intended.

⚠️ `bake:shows` and `bake:resellers` carry **no row-count guard** (only stores does). A
malformed sheet silently deploys an empty calendar. Check counts after any bake.

### 2. Pushing `redesign` does NOT publish. Production needs a second, manual step.

The deploy is split, and it is genuinely confusing — verified 2026-08-27 after a push that
looked successful and changed nothing on the live site:

- `.github/workflows/site.yml` triggers on push to `redesign` and **always builds from
  `redesign`** (`ref: redesign`), whatever the trigger.
- The Cloudflare step deploys with `--branch=${{ github.ref_name }}`, so a push from
  `redesign` produces a **preview** deployment, not production.
- The `deploy-github-pages` job is gated `if: github.ref == 'refs/heads/main'` — it is
  **skipped entirely** on a `redesign` push.

So `sportscardsnearme.ca` (GitHub Pages, see `CNAME`) only updates when the workflow runs
with `github.ref == main` — while still building `redesign`'s code. **To actually ship:**

```bash
git push origin redesign                      # builds + previews, does NOT publish
gh workflow run site --ref main               # publishes redesign's build to production
gh run watch <id> --exit-status
```

Then **verify against the live URL**, not the build log. A green run on a `redesign` push
means "built fine", not "shipped".

There is also a **daily 09:00 UTC rebuild**, so a bad sheet edit reaches production with no
push at all. CI runs `npm test` before building, so a red test blocks the build.

⚠️ This split (build from one branch, publish gated on another) is fragile and worth fixing
properly rather than remembering.

**Corollary, hit twice now (`deploy-click-tracker.yml` 2026-08-28, then `site.yml` the same
day): a workflow file's own DEFINITION — job steps, env vars — is resolved from whichever ref
a run is dispatched against, not from wherever `checkout` later pulls code from.**
`PUBLIC_CLICK_TRACKER_URL` was added to `site.yml` on `redesign` and worked there, but
production dispatches against `main`, and `main`'s copy of `site.yml` predated that line — so
the live build silently never asked for it. The build didn't fail; it just quietly built
without a variable that existed and was set correctly, with a fully green run. **Any change to
a workflow FILE itself (new env var, new job, new step) needs pushing to `main` separately,
the same as a brand-new workflow does for visibility.** Content changes inside `src/`, `docs/`,
etc. don't have this problem — `checkout: ref: redesign` handles those correctly regardless of
which branch triggered the run. It's specifically edits to the `.github/workflows/*.yml` files
themselves that need the second push.

### 3. Never `git add -A` / `git add .` — stage explicit paths.

Another session is very likely live in this repo right now and you **cannot detect it**.
On 2026-08-27 a session found `src/lib/shows.ts` modified and an untracked test file mid-
flight from a parallel session; a broad stage would have swept them into an unrelated commit.
This has already caused real damage twice in other repos (Lightbearer, card-books).

Run `git status` before staging. If you see changes you did not make, **stop and read
`SESSIONS.md`** — do not commit them blind. If they are finished and green, commit them as
their own commit with their own message, crediting what they are.

---

## Working in parallel

Two worktrees of this repo already exist:

```
~/Projects/8-Web-Apps/scnm-plan4            [redesign]         ← main working copy, deploys
~/Projects/8-Web-Apps/sports-cards-near-me  [codex/hardening]  ← second worktree
```

**Same folder, different sessions → collisions.** Prefer a worktree per workstream:

```bash
cd ~/Projects/8-Web-Apps/scnm-plan4
git worktree add ../scnm-<topic> -b <topic>     # new isolated copy + branch
cd ../scnm-<topic> && npm ci                    # node_modules is not shared
# ... work, commit, then:
git worktree remove ../scnm-<topic>
```

`node_modules`, `dist/` and `test-results/` are per-worktree. Don't share them.

### Ownership lanes — pick one, claim it in `SESSIONS.md`

| Lane | Paths | Typical work |
|---|---|---|
| **data** | the Google Sheet, `scripts/bake-*.ts` | corrections, imports, new columns |
| **lib** | `src/lib/**` | logic, SEO helpers, structured data |
| **pages** | `src/pages/**`, `src/components/**`, `src/layouts/**` | templates, copy, new routes |
| **perf** | `src/layouts/Base.astro`, map/asset loading | Lighthouse, Core Web Vitals |
| **docs** | `docs/**`, `*.md` | plans, research, audits |

Two sessions in different lanes can share a folder safely. Two in the same lane should not —
use a worktree. `src/lib/shows.ts` and `src/lib/stores.ts` are the hottest files in the repo;
treat any edit there as a claim.

---

## Before you commit

```bash
npm run typecheck    # tsc --noEmit
npm test             # vitest, 266 tests
npm run build        # 1471 pages
```

All three must pass. CI runs the tests, so a red suite blocks the deploy — but a broken
*build* is only caught locally.

Known local-vs-CI gap: `PUBLIC_MAPBOX_TOKEN` only exists in the CI build, so a local build
compiles the map away. A green local build is **not** proof the map works. (This has already
produced one false pass.)

## Commands

| | |
|---|---|
| `npm run dev` | local server |
| `npm run bake` / `bake:shows` / `bake:resellers` | regenerate data from the sheet |
| `npm run typecheck` · `npm test` · `npm run test:e2e` | checks |
| `npm run build` | static build to `dist/` |

## Where things are written down

- `SESSIONS.md` — **who is working on what right now**
- `PLAN.md` — monetisation + services strategy, with the G2/G3/G5 gates. Read the gates
  before touching anything commercial, privacy copy, or the public sheet.
- `PLAN-REVIEW-LOG.md` — review history
- `docs/superpowers/plans/` — per-workstream implementation plans
- `README.md` — Mapbox token setup

Longer-form research and decisions live outside the repo in
`~/jarvis-memory/06-SportsCardsNearMe/`.

## House style

- TypeScript strict, no `any`. Comments explain *why*, not what — match the density already
  in `src/lib/nearby.ts` and `src/lib/shows.ts`.
- Test at 375px for anything visual.
- Commits: `Nathan Wiebe <dominathan@gmail.com>`.
- Don't publish a listing without an address and a second source (the publishing standard).
- Absence of data is not evidence of absence — an unrecognised town, a missing rating and a
  "permanently closed" flag are all things to review, never to auto-correct.
