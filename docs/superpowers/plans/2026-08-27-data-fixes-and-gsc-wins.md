# Plan — data corrections + the measured GSC wins (2026-08-27)

**Planned by Fable 5. Intended executor: Sonnet. Review: Fable.**
Source analysis: `~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-reseller-gap-verdict-and-empty-network.md`
and the 25 Aug Search Console read.

---

## 🚨 CORRECTION 2026-08-27 — every data task below is a SHEET edit, not a JSON edit

**The original draft of this plan was wrong and would have produced work that silently
vanished.** `src/data/stores.json`, `shows.json` and `resellers.json` are **generated**,
baked from one Google Sheet (`14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I`) by
`npm run bake*`, which CI runs **on every deploy before the build**. The files are also
committed to git — so a local edit commits cleanly, passes tests, builds fine, and is then
overwritten on the next deploy. It looks like it worked right up until it's gone. There is
also a **daily 09:00 UTC rebuild**, so this happens with no push at all.

Wherever a task below says "set a field" or "drop a row", read it as:
1. Edit the **sheet** (correct tab).
2. Adding a field = adding a sheet **column** *and* updating the row-mapper
   (`rowToShow` / the store mapper). A pinned header test fails if a column moves — that
   guard is deliberate.
3. Re-bake locally (`npm run bake:shows`) and confirm the diff is only what you intended.
4. ⚠️ `bake:shows` and `bake:resellers` have **no row-count guard**. Check counts before
   and after; a malformed sheet deploys an empty calendar silently.

See `CLAUDE.md` at the repo root. Claim your lane in `SESSIONS.md` before starting.

---

## Decisions — RECOMMENDED (Fable, 2026-08-27). Await Nathan's yes before Task 1/Task 3.

**Decision A — how to represent a shop that closed its storefront. → ADD A `status` FIELD.**

`stores.json` has **no `status` / `closed` / `active` field at all** (verified: keys are
slug, name, city, citySlug, address, province, rating, reviewCount, website, services,
sports, lat, lng).

Why this is cheaper than it looks: `scripts/refresh-ratings.py` already calls Google Places
`searchText` monthly with field mask
`places.rating,places.userRatingCount,places.regularOpeningHours`. Google returns
**`businessStatus`** (`OPERATIONAL` / `CLOSED_TEMPORARILY` / `CLOSED_PERMANENTLY`) on that
same call. Adding `places.businessStatus` to the mask is a one-line change, and it sits in
a cheaper SKU than the Enterprise-tier fields already being requested — so it should add no
cost. *Confirm actual billing on the first run.*

Rejected alternatives: deleting the row loses a page with 46 reviews; leaving it publishes
false information about a real business.

⚠️ **Sequencing: run the closure scan BEFORE building Task 1.** 689 shops have never been
checked and the industry lost ~90% of its storefronts. This may be 1 closure or 15, which
changes the scope of the fix.

**NOT BLOCKED — corrected 2026-08-27.** An earlier note here said this was waiting on
Nathan's API key. Wrong. `GOOGLE_PLACES_API_KEY` **already exists as a GitHub Actions repo
secret** (set 2026-07-29, confirmed via `gh secret list`). It is unreadable locally because
Actions secrets are write-only by design — that is correct behaviour, not a missing setup.

**So the scan runs in CI, not locally, and needs nothing from Nathan.**
`.github/workflows/ratings-refresh.yml` already runs `refresh-ratings.py` monthly (06:00 UTC
on the 1st, plus `workflow_dispatch`), bakes stores from the sheet first, and **opens a PR
with CSVs rather than writing anything** — a human-in-the-loop step that already exists.

Adding `places.businessStatus` to the field mask therefore needs **no new workflow, no new
secret, and no local run**. The next scheduled refresh picks it up; `workflow_dispatch` runs
it on demand.

That workflow's own header comment independently confirms the safety rule below — Text
Search "once put a shop with no public street address at an unrelated address in another
city." Closure candidates go to a review CSV, never a direct write.

**Exact change when the key is available** — `scripts/refresh-ratings.py`, the `FIELD_MASK`
constant (~line 53). The existing comment above it already explains Google's tier billing;
extend that comment to cover the new field.

```python
FIELD_MASK = (
    'places.id,places.displayName,places.formattedAddress,'
    'places.rating,places.userRatingCount,places.regularOpeningHours,'
    'places.businessStatus'          # Essentials tier — below the Enterprise
                                     # fields above, so no extra cost on this call
)
```

Then map `businessStatus` → the store `status` field:
`OPERATIONAL` → `open` · `CLOSED_TEMPORARILY` → `open` (leave listed, do not act on a
temporary closure) · `CLOSED_PERMANENTLY` → flag for **Nathan's review, do not auto-write**.
A permanent-closure flag from Google can be wrong (moved, rebranded, wrongly reported), and
unlisting a live business is the worst error this directory can make. Write candidates to
`docs/research/closure-review.csv` in the same shape as `ratings-review.csv`.

**Decision B — show-naming rule. → ADOPT, WITH A RESEARCH GUARD.**
Precedence:
1. Operator/host business name if the venue **is** a card business → `The Hobby Spot Monthly Card Show`
2. Else city name → `Fort Saskatchewan Cards & Collectibles Show` (also an SEO win: people
   search by city)
3. Never invent an operator from a neutral venue (a Holiday Inn does not run the show).

🚨 **Guard: research each show's `sourceUrl` before renaming.** If a real promoter name
exists and we simply don't have it, publishing an invented city-prefixed name is *worse*
than leaving the generic one. Rename only what genuinely has no name.

---

## Task 1 — Capital City Sports Cards is no longer a storefront

**Verified independently, not just asserted.** The shop opened in Edmonton in 2021 and after
several moves and a series of break-ins closed its doors and moved inventory online
(now at `capitalcitysportscards.company.site`). Address in our data —
7633 50 St NW #101 — matches the reported former location.

Target row: `slug: capital-city-sports-cards-edmonton` (rating 4.5, 46 reviews).

⚠️ **Do not confuse with `capital-city-cards-collectibles-edmonton`** ("Capital City Cards &
Collectibles", 12011 111 Ave NW) — a *different, separate* Edmonton business. Leave it alone.

Steps (assuming Decision A → option 2):
1. Add optional `status` to the store type in `src/lib/` and to `stores.json` schema/tests.
   Absent or `"open"` must behave exactly as today (no migration of 689 rows).
2. Set `status: "online-only"` on `capital-city-sports-cards-edmonton`.
3. Exclude non-`open` shops from: city page listings, province counts, `/sell/[city]`
   buyer lists, map pins, and the sitemap. Keep the `/store/[slug]/` page itself resolving
   (it has 46 reviews of accumulated value) but add a clear "no longer a walk-in
   storefront — now online only" notice and `noindex` it.
4. Update any hardcoded shop counts in copy/tests that now shift by one.

**Strategic note for Nathan, not the executor:** this business is a verified, established
dealer with 46 reviews who lost the storefront and kept dealing. That is precisely the
Verified Reseller thesis. They should be reseller application #1.

---

## Task 2 — the Calgary Genesis Centre show is one event stored as three rows

**This is a live duplicate bug, same class as the St. Catharines one fixed on 2026-08-27.**

| name | date | venue | source |
|---|---|---|---|
| Sport Card & Memorabilia Expo — Calgary | 2026-09-18 | Genesis Centre | sportcardexpocalgary.com (official) |
| Sports Card Expo | 2026-09-19 | Genesis Centre | TCDb ID 24790 |
| Sports Card Expo | 2026-09-20 | Genesis Centre | TCDb ID 24791 |

Sept 18/19/20 2026 is Friday–Sunday. One three-day show, imported twice under two names
from two sources.

Steps:
1. **Verify against the official site first** (`sportcardexpocalgary.com/tickets/`) — confirm
   the real date range before merging. Do not merge on inference alone.
2. If confirmed: keep the officially-named row, set `startDate: 2026-09-18` /
   `endDate: 2026-09-20`, drop the two TCDb rows.
3. Add `redirects.json` entries from the two dead slugs to the surviving one.
4. **Then generalise the check**: scan all 207 shows for same-venue rows on consecutive
   dates carrying different names, and report them. Do not auto-merge others — report
   for Nathan's review.

---

## Task 3 — generically-named shows (pending Decision B)

Four distinct shows, 21 date-instances, currently carry names that say nothing:

**✅ RESEARCH COMPLETE 2026-08-27 — the guard paid off. Only ONE of the four gets renamed.**
Two would have received invented names had we followed the original proposal.

| current name | inst. | city | verdict |
|---|---|---|---|
| Monthly Card Show | 2 | Leduc, AB | ✅ **RENAME → `The Hobby Spot Monthly Card Show`.** The Hobby Spot is a real card shop in Leduc and the show runs *inside the shop*. The shop's own YouTube recaps use exactly this phrase ("its 41st Monthly Card Show"). https://thehobbyspot.ca/cardshows/ |
| Cards & Collectibles Show | 8 | Fort Saskatchewan, AB | ⛔ **LEAVE AS IS — no real name found.** Pioneer House is a volunteer-run hall, not the promoter. *Lead, unconfirmed:* a vendor says this is the same show relocated from Lorelei-Beaumaris Hall in north Edmonton, whose predecessor listing carried a named promoter. Nathan-only step: one email to confirm before naming anything. |
| Sports Cards and Collectible Show | 9 | St. Catharines, ON | ⛔ **LEAVE AS IS — no real name found.** The TCDb listing gives only two first names and a phone number — no business name. Facebook events titled "St. Catharines Sports Card & Collectibles Show" were created by a **vendor at the show, not the organiser**. Do not adopt a vendor's wording as the show's name. |
| Monthly Sports Card & Comic Book Show | 1 | Ottawa, ON | ✅ **FOLD into the Capital Trade Shows series — do NOT rename.** Hypothesis confirmed: the TCDb record's own notes read "Capital Trade Shows FREE ADMISSION / FREE PARKING." Same venue, same Sunday 10:00–15:00 window as the existing 28 events; "curling rink" vs "Hall A & B" is just the room the Sportsplex assigned. |

🔒 **Promoter names, phone numbers and emails are deliberately NOT in this file.** This repo
is **public**; appearing on a hobby database is not consent to be republished on GitHub.
They live in `~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-show-promoter-contacts-private.md`
(private vault). Do not copy them back in.

**Leduc vs Edmonton: LEDUC IS CORRECT** (Nathan's recollection of Edmonton was wrong — the
shop is physically in Leduc and draws the Edmonton crowd ~33 km away). No city-field bug.
This is the case that motivated the metro/nearby work — see Task 5.

**Incidental data corrections found during research:**
- `capitaltradeshows.com` now **redirects to `capitaltradeshows.ca`** — update the stored
  URL on all 28+ Capital Trade Shows records.
- TCDb misspells the city as "St. Catherines" on some entries; **our "St. Catharines" is
  correct** — do not let a future import overwrite it.

🚨 **Critical implementation detail: slugs are derived from the name.** Pattern is
`slugify(name)-city-date` (e.g. `burnaby-card-show-burnaby-2026-10-18`). **Renaming a show
changes its URL and 404s the old one.** Every rename MUST add a `src/data/redirects.json`
entry. Verify no live URL breaks — several of these have been indexed.

---

## Task 4 — stop asking Google to index the empty resellers page

`/resellers/` returns HTTP 200, sits in `dist/sitemap-0.xml`, has **no noindex**, and its
body reads *"Verified reseller profiles are coming."* A coming-soon page submitted for
indexing is explicitly called out in Google's helpful-content guidance.

Steps:
1. Add `noindex, follow` to `src/pages/resellers/index.astro` **and** `resellers/join/`
   while `resellers.json` is empty.
2. Exclude both from the sitemap while empty.
3. Make it conditional, not hardcoded: once `resellers.json` has entries (suggest a
   threshold constant, e.g. ≥ 5), the pages index normally. Add a unit test for both states.
4. Leave the pages reachable for humans — the join form should keep working.

---

## Follow-ups — NOT this session (bigger, separate plans)

- **Titles + meta descriptions pass on store and city pages.** The measured win: stores +
  cities are 78% of near-page-one impressions converting at 0.73%, against 2.8–3.3% on
  sell and show pages. Lifting that band to 2% hits the 5 Nov target of 145 clicks/week
  with zero new pages. Two specific openings in the query data: `[shop] reviews`
  (76 queries, page-one positions, ~1 click total) and generic "near me" phrasing.
- **Per-city show pages.** Never built; Phase 2 of the 07-23 content plan. Shows are the
  best-converting page type on the site (4.67%) and the most under-exposed. Ottawa has
  32 upcoming shows — more than 10× Toronto's 3.

## Definition of done for this session

- [ ] Decisions A and B answered by Nathan
- [ ] Capital City corrected; the *other* Capital City business untouched
- [ ] Calgary triple verified against the official site, merged, redirects added
- [ ] Generic shows renamed **with redirects**; Leduc/Edmonton discrepancy resolved
- [ ] Empty resellers pages noindexed + out of sitemap, conditionally, with tests
- [ ] Full test suite green; site rebuilds; no URL that was previously live now 404s
