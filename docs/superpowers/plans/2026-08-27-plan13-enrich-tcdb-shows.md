# Plan 13 — enrich the 162 TCDB shows from their detail pages

**Planned by Opus 5 · Executor: Codex (gpt-5.6-sol) · Review: Opus 5.**
Lane: **data** (produces a sheet payload; does NOT write the sheet).

## Why

162 of 207 shows carry a venue and a date but **no street address, no admission, no
website**. That is the single biggest quality gap on the calendar and it blocks two things
at once: a show page cannot answer "where is it" and Google's Event rich result wants a
full `location.address`.

**The key fact this plan rests on, verified 2026-08-27:** the fields are already on TCDB —
just on the **detail** page, not the list view I scraped. Detail page for ID 22352 returns:

```
New Horizon Mall
260300 Writing Creek Crescent
Balzac, Alberta T4A0X8
Canada

Web Address:
https://www.facebook.com/photo?fbid=...
```

So this is a **bounded, deterministic scrape of 162 known URLs**, not open-ended research.
Every `sourceUrl` is already in `src/data/shows.json`.

## Hard rules

1. **NEVER invent, infer or complete an address.** If the detail page has no street line,
   leave the field EMPTY. A wrong address sends a real person to the wrong building. This
   is the site's standing absence-of-data rule and it is not negotiable.
2. **Do NOT write to the Google Sheet.** Emit a file. The sheet write is a separate,
   reviewed step. The sheet is live production data baked nightly.
3. **Do NOT edit `src/data/*.json`** — they are generated (see `CLAUDE.md` trap 1).
4. **Do NOT `git add -A`.** Stage explicit paths only; another session may be live.
5. **TCDB 403s every non-browser client.** `curl`, `defuddle`, `fetch` all fail. The only
   working route is `dev-browser --connect`, which drives Nathan's already-running signed-in
   Chrome on port 9222. Verify it is up first: `curl -s -o /dev/null -w '%{http_code}'
   http://127.0.0.1:9222/json/version` must return 200.
6. **Be polite to the source.** Reuse ONE page/tab across all 162 fetches, and wait
   ~800–1500 ms between them. Do not open 162 tabs or fire concurrent requests.

## Steps

### 1. Build the work list
From `src/data/shows.json`, take every show whose `sourceUrl` contains `tcdb.com`.
Expect **162**. Each has a unique `MODE=VIEW&ID=<n>` URL. Write the list to
`docs/research/2026-08-27-enrich-worklist.json` so a resumed run does not re-fetch.

### 2. Scrape each detail page
Extract, per show, from the block under the show title:
- **address** — the street line(s) BETWEEN the venue name and the `City, Province POSTAL`
  line. In the example: `260300 Writing Creek Crescent`. If the only lines present are the
  venue and the city line, there is no street address → leave empty.
- **postal** — the Canadian postal code on the city line, if present (`T4A0X8` → `T4A 0X8`).
- **website** — the value under `Web Address:`, if present.
- **admission** — only if the page states one explicitly. Do not derive it from Notes prose.
- **notes** — the `Notes:` block verbatim, for the reviewer. Not for publishing.

Write results incrementally to `docs/research/2026-08-27-tcdb-enrichment.json` (one object
per show, keyed by slug) so a crash does not lose completed work.

### 3. Validate before emitting — every check must pass
- **City agreement:** the detail page's city MUST match the show's `city` (case- and
  punctuation-insensitive). On mismatch, record the row as `"conflict"` and DO NOT use it.
- **Province agreement:** same, against `province`.
- **Address sanity:** a kept address must contain at least one digit and be ≥ 6 characters.
  Reject anything equal to the venue name.
- **Website sanity:** must parse as an `http(s)` URL. A Facebook *photo/post* permalink is
  NOT an organiser website — record it under `social` instead, leave `website` empty.
- Count and report: enriched with address / with website / with admission / conflicts /
  no-data.

### 4. Emit the sheet payload
`docs/research/2026-08-27-enrichment-payload.csv`, one row per show, columns exactly:

`slug,Show Name,City,Province,Venue,Address,StartDate,EndDate,Hours,Admission,Website,SourceUrl,Recurring`

Carry existing values through unchanged; fill ONLY Address / Admission / Website where the
scrape produced a validated value. `slug` is the join key for the reviewer — it is not a
sheet column, it is first so it is easy to strip.

### 5. Report — write `docs/research/2026-08-27-enrichment-report.md`
Counts from step 3, every `conflict` row listed with both values, and any show whose detail
page failed to load. State plainly what was NOT filled and why.

## Definition of done

- [ ] All 162 attempted; failures listed individually, not summarised away
- [ ] Zero invented addresses — every kept address traceable to a fetched page
- [ ] Conflicts reported, never silently used
- [ ] `npm run typecheck && npm test` still pass (nothing in `src/` should have changed)
- [ ] `git status` shows ONLY new files under `docs/research/`
- [ ] Sheet untouched, `src/data/*.json` untouched

## Explicitly NOT in scope

Writing the sheet · re-baking · deploying · editing show names or dates · touching the 45
pre-existing non-TCDB shows · Tasks 1/2/3 of the 08-27 plan (they await Nathan's decisions).
