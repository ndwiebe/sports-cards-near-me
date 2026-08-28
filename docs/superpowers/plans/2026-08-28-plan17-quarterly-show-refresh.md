# Plan 17 — a repeatable quarterly show refresh

**Planned by Opus 5 · Executor: Codex (gpt-5.6-sol) · Review: Opus 5.**
Lane: **lib/scripts** + **docs**. Runs in worktree `scnm-refresh` — a sibling Codex run is
live in `scnm-gsc` at the same time. Do not touch anything outside your worktree.

## Why this exists

TCDB publishes roughly a **four-month horizon** — verified 2026-08-27, when all four
Canadian provinces ended within a week of each other in late December. So the calendar
decays on its own: today's 204 shows thin out to nothing by about January with no warning
and no error. Shows are the **best-converting page type on the site (4.67% CTR)**, so the
decay is expensive and silent.

The 2026-08-27 import was done by hand and the method is written down. This plan turns it
into a script that can be re-run every quarter.

## Deliverable

**`scripts/refresh-shows.py`** — one command that reports what has changed since last time
and emits a review payload. It **never writes the sheet**. Plus a short section in
`docs/research/RESEARCH-TOOLING-NOTES.md` on how to run it.

## What it must do

1. **Fetch** every Canadian province page, then each show's **detail** page.
   - Provinces live at `/CardShows.cfm?MODE=Location&State=<Name>&Country=Canada`. Use the
     full name; `Québec` needs the accent, URL-encoded.
   - Only AB / BC / ON / SK had entries on 2026-08-27; MB / NS / QC were genuinely empty.
     **Check all seven anyway** — an empty province today may not be empty next quarter.
2. **Diff against `src/data/shows.json`**, and classify every row:
   - **NEW** — not in our data
   - **KNOWN** — already ours, unchanged
   - **CHANGED** — same show+city+date, but venue/hours/address differs upstream
   - **GONE** — ours, sourced from tcdb.com, in a province TCDB still covers, but no longer
     listed upstream. **Report only. Never auto-delete** — an upstream removal is not proof
     a show was cancelled.
3. **Emit** `docs/research/<date>-show-refresh-payload.csv` in the Shows-tab column order
   (`Show Name,City,Province,Venue,Address,StartDate,EndDate,Hours,Admission,Website,SourceUrl,Recurring`)
   plus a `_status` column carrying the classification above.
4. **Emit** `docs/research/<date>-show-refresh-report.md`: counts per class, every CHANGED
   and GONE row listed individually, and any province that failed to load.

## The traps this must encode — all of these cost real time on 2026-08-27

- **tcdb.com 403s every non-browser client.** curl, defuddle and fetch all fail. The only
  route is `dev-browser --connect`, driving the signed-in Chrome on 127.0.0.1:9222. Check
  the port first and **fail loudly** if it is closed — do not fall back to a scraper that
  will silently return nothing.
- **dev-browser runs a QuickJS sandbox**: no `require('fs')`, and no bare `document` — all
  DOM work goes inside `page.evaluate()`. Return data by printing JSON between marker lines
  and capturing stdout.
- **One page object, reused, ~1s between fetches.** Do not open a tab per show.
- **A round result count is a claim.** If any province returns exactly 100 rows, say so in
  the report — it is the signature of a hidden cap. The 2026-08-27 run tested this by
  comparing date horizons across provinces and found 100 was coincidence.
- **A zero is a claim too.** Distinguish "province page loaded and is genuinely empty" from
  "province page failed to load". Never record the second as the first.
- **Canonicalise by (city, venue) AFTER normalising the city**, not before. The first pass
  keyed on the raw city string, so *St. Catharines*, *St.Catharines* and *St. Catherines*
  read as three different cities and their duplicates survived.
- **Validate every city against `src/data/stores.json`'s spellings** — 689 human-checked
  Canadian towns. But **"not in that list" is NOT an error**: 14 legitimate towns simply
  have no card shop. Report unknowns, never auto-correct them.
- **Detail pages carry the street address; list pages do not.** Take the line(s) between
  the venue and the `City, Province POSTAL` line. **If there is no street line, leave it
  empty** — never infer one from the venue or the show name.
- **A Facebook photo/post permalink is not an organiser website.** Record it separately.

## Hard rules

1. **Never write the Google Sheet.** Emit the CSV; a human reviews and writes.
2. **Never edit `src/data/*.json`** — generated from the sheet.
3. **Never invent an address, a promoter, or a show.**
4. Explicit `git add` paths only; a sibling session is live.
5. Keep promoter names, phones and emails OUT of this public repo.

## Definition of done

- [ ] `python3 scripts/refresh-shows.py --dry-run` runs end to end and writes both files
- [ ] Re-running it immediately produces **0 NEW** (it is idempotent against current data)
- [ ] Every trap above is enforced in code or asserted in a test, not just mentioned
- [ ] `npm test` and `npm run typecheck` still pass; nothing under `src/` changed
- [ ] Sheet untouched
