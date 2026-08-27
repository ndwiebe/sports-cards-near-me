# Plan 14 — implement Decisions A and B

**Planned by Opus 5 · Executor: Codex (gpt-5.6-sol) · Review: Opus 5.**
Decision record: `~/jarvis-memory/decisions/2026/2026-08-27-scnm-show-naming-and-closed-shop-status.md`
(status: decided by Nathan 2026-08-27). Supersedes Tasks 1 and 3 of the 08-27 data-fixes plan.

Lanes touched: **lib/scripts** (`scripts/refresh-ratings.py`) and **data** (a sheet payload
+ `src/data/redirects.json`). Claim both in `SESSIONS.md` before starting.

---

## Part A — closure detection (scan only; NO `status` field)

**Decided:** add the Google field now, defer the schema change until the scan returns a number.
689 shops have never been checked; this may be 1 closure or 15, and that changes the design.

### A1. Extend the field mask
`scripts/refresh-ratings.py`, `FIELD_MASK` (line ~53). Add `places.businessStatus` only:

```python
FIELD_MASK = (
    'places.id,places.displayName,places.formattedAddress,'
    'places.rating,places.userRatingCount,places.regularOpeningHours,'
    'places.businessStatus'
)
```

Extend the existing comment above it to say why this one is free: it sits in a cheaper
Places tier than the Enterprise fields already requested, so it rides the same call.
**Flag in the run output that billing should be confirmed on the first real run** — do not
assert it is free, say it is expected to be.

### A2. Emit a closure-review CSV — never write a store row
Map `businessStatus`:
- `OPERATIONAL` → nothing
- `CLOSED_TEMPORARILY` → **nothing.** A temporary closure is not actionable and unlisting on
  one would be wrong.
- `CLOSED_PERMANENTLY` → append to `docs/research/closure-review.csv`, same shape as the
  existing `ratings-review.csv`, with at minimum: slug, name, city, province, current
  address, rating, reviewCount, the Places `formattedAddress`, and the Places place id.

**Do NOT add a `status` field to any record, sheet column, or row-mapper.** That is
explicitly deferred. **Do NOT unlist, hide or delete any shop.** Google's
`CLOSED_PERMANENTLY` is wrong often enough — a shop that moved or rebranded reads the same —
and unlisting a live business is the worst error this directory can make.

### A3. Do not run it
The API key is a GitHub Actions secret and is unreadable locally by design. **Do not attempt
to run the scan, and do not invent an API key path.** Verify by reading the code and by
`npm test` / any Python tests present. The monthly workflow (or a `workflow_dispatch`) runs it.

---

## Part B — the two show corrections (naming rule: clauses 1 and 3 only)

**Decided rule:** use the operator/host business name where the venue *is* a card business;
never invent an operator from a neutral venue. **The "else use the city name" clause is
dropped** — it manufactures names nobody uses.

⚠️ **Slugs derive from the name** (`slugify(name)-city-date`). Every rename changes a live URL
and 404s the old one. Each rename below MUST get a `src/data/redirects.json` entry.

### B1. Leduc — rename (evidence: the shop's own site says "its 41st Monthly Card Show")
2 rows, `Monthly Card Show` → `The Hobby Spot Monthly Card Show`

| old slug | new slug |
|---|---|
| `monthly-card-show-leduc-2026-08-29` | `the-hobby-spot-monthly-card-show-leduc-2026-08-29` |
| `monthly-card-show-leduc-2026-09-26` | `the-hobby-spot-monthly-card-show-leduc-2026-09-26` |

Derive the new slugs with the repo's own `slugify` — do not hand-write them. Verify they
match what `bake:shows` produces before adding redirects.

### B2. Ottawa — fold into the existing series, do NOT invent a name
1 row, `Monthly Sports Card & Comic Book Show` (Ottawa, 2026-09-13) →
`Capital Trade Shows: Card & Comic Show`. Evidence: that record's own notes read
"Capital Trade Shows FREE ADMISSION / FREE PARKING", same venue and same Sunday 10:00–15:00
window as the existing 28 events. Redirect entry required, same as B1.

### B3. Leave these alone — this is the decision, not an oversight
- `Cards & Collectibles Show` (Fort Saskatchewan, 8 rows) — no real name found. Pioneer House
  is a volunteer hall, not the promoter.
- `Sports Cards and Collectible Show` (St. Catharines, 9 rows) — no real name found. The
  Facebook events with a similar title were created by **a vendor at the show, not the
  organiser**; adopting a vendor's wording would be inventing.

### B4. Incidental correction
1 row still points at `capitaltradeshows.com`, which now redirects to `capitaltradeshows.ca`.
Update it to the `.ca` in the same payload.

### B5. Output — a sheet payload, NOT a sheet write
`docs/research/2026-08-27-plan14-sheet-payload.csv`, columns:
`slug,Show Name,City,Province,Venue,Address,StartDate,EndDate,Hours,Admission,Website,SourceUrl,Recurring`
Only the 3 renamed/folded rows plus the 1 URL fix — 4 rows total. Opus writes the sheet after
review.

---

## Hard rules

1. **Do NOT write the Google Sheet.** Emit the CSV. The sheet is live production data baked
   nightly.
2. **Do NOT edit `src/data/shows.json` or `stores.json`** — generated (`CLAUDE.md` trap 1).
   `redirects.json` IS hand-maintained and IS in scope.
3. **Do NOT `git add -A`.** Explicit paths only.
4. **Never invent a promoter, an address, or an API key.**
5. Promoter names, phones and emails stay OUT of this public repo — they live in the private
   vault note. Do not copy them in.

## Definition of done

- [ ] `FIELD_MASK` extended; closure rows go to a review CSV; **no `status` field anywhere**
- [ ] 3 show rows corrected in the payload; 1 URL fixed; the 17 rows in B3 untouched
- [ ] A `redirects.json` entry for every changed slug, slugs derived not hand-written
- [ ] `npm run typecheck && npm test` pass; `redirects.test.ts` still green
- [ ] `git status` shows only: `scripts/refresh-ratings.py`, `src/data/redirects.json`, and
      new files under `docs/research/`
- [ ] Sheet untouched; no scan executed
