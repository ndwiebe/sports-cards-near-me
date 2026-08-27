# TCDB show enrichment report — 2026-08-27

## Result

- Attempted: **162**
- Loaded successfully: **162**
- Failed to load or parse: **0**
- Enriched with a validated street address: **156**
- Enriched with a validated website: **81**
- Enriched with admission: **0**
- Conflicts excluded: **5**
- No-data rows: **0**
- Valid postal codes captured in the review JSON: **133**
- Facebook photo/post permalinks moved to `social`, not Website: **56**

“No-data” means a successfully loaded, non-conflict row with no validated Address, Admission, or Website. Existing show values were carried through unchanged in the CSV; only validated scraped fields were eligible to fill blanks.

## Conflicts — excluded from enrichment

- `sports-cards-and-collectible-show-st-catharines-2026-09-12` — expected **St. Catharines, ON**; TCDB says **St. Catherines, Ontario** (https://www.tcdb.com/CardShows.cfm?MODE=VIEW&ID=21083)
- `sports-cards-and-collectible-show-st-catharines-2026-10-11` — expected **St. Catharines, ON**; TCDB says **St. Catherines, Ontario** (https://www.tcdb.com/CardShows.cfm?MODE=VIEW&ID=21084)
- `border-city-card-show-lloydminster-2026-11-07` — expected **Lloydminster, AB**; TCDB says **Lloyminster, Alberta** (https://www.tcdb.com/CardShows.cfm?MODE=VIEW&ID=17627)
- `sports-cards-and-collectible-show-st-catharines-2026-11-15` — expected **St. Catharines, ON**; TCDB says **St. Catherines, Ontario** (https://www.tcdb.com/CardShows.cfm?MODE=VIEW&ID=21085)
- `sports-cards-and-collectible-show-st-catharines-2026-12-27` — expected **St. Catharines, ON**; TCDB says **St. Catherines, Ontario** (https://www.tcdb.com/CardShows.cfm?MODE=VIEW&ID=21086)

No scraped Address, Admission, Website, or postal value was used for these rows.

## Detail pages that failed to load or parse

None.

## Fields deliberately left empty

### No street line

- `collector-verse-expo-oakville-ontario-oakville-2026-10-25` — the venue line is **1280 dundas st W** and there is no separate street line between it and the city line.

No address was inferred from the show name, venue name, Notes, or another source.

### Admission

Admission was filled for **0** shows. TCDB exposes no separate Admission field in these 162 detail blocks. The following **6** pages contain an `Admission:` phrase only inside Notes; the plan explicitly prohibits deriving Admission from Notes prose:

- `mississauga-tcg-and-toy-show-mississauga-2026-08-29`
- `the-london-toy-collectibles-expo-london-2026-09-06`
- `durham-card-show-ajax-2026-09-13`
- `west-van-card-show-delta-2026-09-20`
- `durham-card-show-ajax-2026-10-18`
- `durham-card-show-ajax-2026-12-13`

### Postal code

- `ancaster-toy-and-collectibles-expo-ancaster-2026-09-07` — TCDB shows malformed value `L0R150`; it was not corrected or used.

### Website

All Web Address values parsed as HTTP(S). Facebook photo/post/share permalinks were retained under `social` in the review JSON and left out of the CSV Website field because they are not organiser websites. Rows without a Web Address stayed empty.

## Output files

- `docs/research/2026-08-27-enrich-worklist.json` — 162-source resumable worklist
- `docs/research/2026-08-27-tcdb-enrichment.json` — keyed extraction, notes, validation, conflicts, and social links
- `docs/research/2026-08-27-enrichment-payload.csv` — 162-row sheet-review payload; the Google Sheet was not modified


---

## Reviewer addendum — Opus 5, 2026-08-27

**Verdict: accepted, with one override.**

Verified independently rather than from the report:
- Re-fetched 4 random enriched rows from live TCDB and matched them character-for-character:
  `6900 Airport Road` (The International Centre, Mississauga), `550 Beck Crescent` (Ajax
  Convention Centre), `2300 Lawrence Ave E` (White Shield Banquet Hall), `3012 Murray Street`
  (Site B Community Centre). **No invented addresses.**
- Payload integrity: 162 rows, correct columns, and **0 pre-existing values altered** —
  checked field-by-field against `shows.json`.
- Scope: exactly 4 new files, all under `docs/research/`; `src/` clean; sheet untouched at
  hand-off, as claimed.

**Override — the 5 "conflicts" were filled after all.** All five were the city misspellings
corrected in our own data earlier the same day: TCDB still writes *St. Catherines* and
*Lloyminster*. Codex's rule compared city strings pairwise, so it could not see that:
- the 4 St. Catharines rows scraped **`327 Ontario Street`**, the *identical* address that
  **5 sibling rows at the same venue** had already validated cleanly, and
- the Lloydminster row's own venue name — **Lloydminster Agricultural** — spells the city
  correctly, independently confirming it.

Both are corroboration, not inference, and the override script required one or the other
before filling anything. Result: **161 of 162 addresses**, up from 156.

**Codex's restraint was correct and is worth keeping.** It refused to derive Admission from
Notes prose because the plan forbade it, refused to guess the one genuinely missing street
line, and earlier refused to route around a sandbox block rather than break the plan. An
executor that stops is far more useful than one that improvises.

**The one remaining gap:** `collector-verse-expo-oakville-ontario-oakville-2026-10-25` has
its street *in the Venue field* (`1280 dundas st W`) and no separate address line. Moving it
would edit Venue, which is outside enrichment — left for a data pass.

**Effect after the sheet write:** street addresses 39 → **200 of 207**; websites 45 → **127**;
show pages emitting Event markup with a full `streetAddress` 39 → **200**.
