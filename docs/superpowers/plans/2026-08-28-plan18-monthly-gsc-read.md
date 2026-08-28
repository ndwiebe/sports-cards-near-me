# Plan 18 — make the monthly Search Console read self-serve

**Planned by Opus 5 · Executor: Codex (gpt-5.6-sol) · Review: Opus 5.**
Lane: **lib/scripts** + **docs**. Runs in worktree `scnm-gsc` — a sibling Codex run is live
in `scnm-refresh` at the same time. Do not touch anything outside your worktree.

## Why this exists

The PRD schedules a monthly read (first Monday: 8 Sep, 6 Oct, 3 Nov) and it drives real
decisions — the French pilot gate, the second CTR pass, the Featured-placement handoff.

The **analysis** is already solved and battle-tested: `scripts/analyze-gsc-export.py`
encodes the two errors that cost a week — reading a window **total** as a weekly **rate**,
and ranking page types by impressions-per-page instead of **clicks**-per-page. Do not
rewrite that logic. Read it first; it is the reference.

**What is missing is the data pull.** Today a human downloads CSVs from the Search Console
UI and hands them over. That step is now removable: Search Console is reachable in the
signed-in Chrome, verified 2026-08-28.

## Deliverable

**`scripts/fetch-gsc.py`** — pulls the Search Console exports for the property and drops
them where the existing analyzer already expects them, so the monthly job becomes:

```bash
python3 scripts/fetch-gsc.py                       # writes docs/research/gsc-export-<date>/
python3 scripts/analyze-gsc-export.py docs/research/gsc-export-<date>/
```

Plus a `docs/research/RESEARCH-TOOLING-NOTES.md` section on running it.

## Critical property detail — this cost a wrong conclusion on 2026-08-28

The property is the **URL-prefix** form:

```
https://sportscardsnearme.ca/          ← correct, owner access confirmed
sc-domain:sportscardsnearme.ca         ← WRONG, returns "you don't have access"
http://sportscardsnearme.ca/           ← WRONG, same
```

Probing the wrong two forms produced a confident "this account has zero properties", which
was false. **Hard-code the https URL-prefix form and assert on it.**

Owner is `dominathan@gmail.com`, the account signed into the AI Chrome.

## What it must do

1. **Check the browser first.** `curl 127.0.0.1:9222/json/version` must return 200. If not,
   **fail loudly** with "start AI Chrome" — do not proceed and produce empty files.
2. **Confirm access before pulling.** Load the performance page for the property and assert
   the page is NOT the `not-verified` interstitial. A silent redirect to that page is how a
   bad property id looks.
3. **Pull the same tables the analyzer consumes** — the analyzer accepts a directory of
   CSVs and expects the sheets Search Console exports (Chart / Queries / Pages / Countries /
   Devices; Search appearance may legitimately be empty). Read
   `scripts/analyze-gsc-export.py` for the exact filenames and shapes and match them, so
   the two scripts compose without a translation layer.
4. **Also capture two enhancement numbers** into a small `enhancements.json` alongside:
   - **Events**: valid / invalid counts. Baseline 2026-08-26: **4 valid, 0 invalid**. This
     should climb — the fix taking pages with a complete `location.address` from 39 to 200
     shipped 2026-08-27 and had not been recrawled at that baseline.
   - **Search Appearance**: baseline 2026-08-28 is literally **"No data"** — no enhanced
     result of any kind has surfaced yet. Record when that changes.
5. **Never fabricate a row.** If a table will not load, write nothing for it and say so.

## The traps this must encode

- **A window total is not a rate.** The analyzer already prints the settled trailing-day run
  rate and labels the total "NOT a weekly rate". Do not add a second, contradicting number.
- **Ten rows is a headline, not a sample.** The UI shows ten rows per table; the export is
  the real data. Pull the export, never scrape the visible table.
- **An empty table may be true.** "Search appearance" being empty is a real finding, not a
  failure — do not retry it into looking broken, and do not write a zero row.
- **Do not run `ask --new`-style destructive resets** on any shared browser tab; reuse one
  page object and leave the session as you found it.

## Hard rules

1. Read-only against Search Console. **Never change a Search Console setting.**
2. Write only under `docs/research/` and `scripts/`.
3. Do not modify `scripts/analyze-gsc-export.py` — compose with it, don't rewrite it.
4. Explicit `git add` paths only; a sibling session is live.

## Definition of done

- [ ] `python3 scripts/fetch-gsc.py` writes a dated export dir the existing analyzer accepts
- [ ] `python3 scripts/analyze-gsc-export.py <that dir>` runs clean on the output
- [ ] Fails loudly and usefully when Chrome is down or the property id is wrong
- [ ] `enhancements.json` captures Events valid/invalid and the Search Appearance state
- [ ] `npm test` and `npm run typecheck` still pass; nothing under `src/` changed
- [ ] No Search Console setting altered
