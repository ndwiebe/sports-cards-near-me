# Backlog triage report — 2026-09-04

Plain-English summary first, details below. "The sheet" means the Google Sheet that feeds
this website — nothing on the live site changes until a human copies rows from these CSV
files into that sheet. I did not touch the sheet, the site's data files, or git. Everything
below is a recommendation for a human to act on.

## The one-line version

I went through all four backlogs — 69 Alberta shops, 52 Quebec shops, 57 already-listed
shops with no card evidence on file, and 36 show-schedule rows — and checked each one by
visiting its website, searching independent local news/directories, or comparing it against
what's already on the site. I did not just re-read the old notes; I went and looked again,
today. Roughly a third of everything turned out to already be handled (either already listed,
or a confirmed non-card business), a smaller chunk is genuinely ready to add, and a real
chunk still needs a human — a phone call or an in-person look — because the internet simply
doesn't say enough either way.

---

## A. Alberta gap (69 shops, not 59 — see note below)

**File:** `docs/research/2026-09-04-alberta-triage.csv`

The source file (`2026-08-28-alberta-coverage-gap.csv`) actually contains 69 candidate rows,
not the 59 mentioned in the brief — I processed every row in the file rather than guessing
which 10 to drop.

| Outcome | Count | What it means |
|---|---|---|
| Already listed | 13 | Same shop, same address, already on the site — often under a slightly different name or with a fuller unit number. No action needed. |
| Real card shop, add it | 4 | I found actual card-selling evidence on the shop's own website. Ready to paste. |
| Not a card shop | 33 | I visited the site and it's a Magic/Pokemon/Warhammer/board-game store, an RC-hobby shop, a coin-and-stamp shop, etc. — genuinely no sports cards. |
| Needs a human | 17 | Website dead, Facebook-only (can't be checked — Facebook business pages are locked behind a login), or the site loaded but said nothing useful. |
| Borderline, worth a second look | 2 | Real business confirmed, but the evidence is thin or contradictory. |

**I verified, confidently:**
- **Screen Free Games Calgary** and **West Edmonton Coin & Stamp** — both have a dedicated
  "Sports Cards" section on their own website. Add these.
- **Overtime Sports Cards North Hill Centre** — a second, genuinely separate location of a
  chain we already list (the Balzac location). Add it.
- **Double Z Collectibles** (Balzac) — an independent listing confirms it buys/sells NBA
  cards. Add it.

**This looks likely, not verified:** **Sunshine Game & Hobby** (St. Paul) and **Brick Road
Collectibles** (Rocky Mountain House) — both are real, established businesses, but I
couldn't pin down from the web alone whether they specifically carry sports cards versus
just games/collectibles generally.

**A finding worth flagging on its own:** three of the original "Tier A — explicit card
signal" listings turned out, on inspection, to be pure hobby/RC/model shops with zero card
evidence (**Hobby Wholesale**, **Hobby Hub**, and — once I checked — a couple of the "Tier B"
game stores too). The original tiering by name/category alone wasn't reliable; visiting each
site directly caught this.

---

## B. Quebec re-verification (52 candidates)

**File:** `docs/research/2026-09-04-qc-triage.csv`

Good news up front: **the five recommendations from the July pass (Jeux Mania, Hobby
Champion, Jeux 3 Dragons, Jeuxjubes, and L'Entre-Jeux Shawinigan) are already live on the
site.** Someone already acted on that earlier research. That's five fewer things to do, not
five things forgotten.

| Outcome | Count | What it means |
|---|---|---|
| Already added since July | 5 | Confirmed above. |
| Already listed under another name/chain | 5 | Same mall, same chain (e.g. "Boutique Imaginaire de X" is just the L'Imaginaire chain's own store in that city, already listed) — not new shops. |
| Real card shop, add it | 10 | Confirmed with independent evidence (own website, local news, a second directory). |
| Not a card shop | 23 | Confirmed TCG-only (Magic/Pokemon/Yu-Gi-Oh), a diecast-model shop, a board-game cafe, etc. |
| Needs a human | 9 | Not walk-in retail (office/supplier/drop-off model), or nothing findable online. |

**I verified, confidently — genuinely new, real, ready to add:**
- **Le Roi des Cartes** (Beloeil) — a 2021 local news article covers the father-and-son
  business's founding; explicitly sells hockey, baseball, football and basketball cards.
- **Le Roi des Cartes Valleyfield** — sister store of the above, same chain, same explicit
  sports-card evidence.
- **L'Univers des Cartes** (Chateauguay), **Electric Avenue Montreal**, **Geekstuff**
  (Laval), **Le Coin Du Hobby** and **Maitre des Jeux (Le)** (both Saint-Eustache) — all
  confirmed via their own websites or independent write-ups to sell sports cards.
- **Card Caster** (Blainville) — mostly a Pokemon/Magic store, but its own site lists
  "Upper Deck Hockey" as a product line, which is real sports-card evidence.
- **Sport Cards Hall Of Fame** (Dollard-des-Ormeaux) — real, but note it appears in the
  source file **twice** under its French and English names at the identical address. Add it
  once, not twice.

**A duplicate worth a one-line fix, not a new listing:** **Bluenose Collectibles**
(Pointe-Claire) is almost certainly the same business as the already-listed "Les Entreprises
Bluenose" — same name, same street, one block off in the street number. Worth checking the
address on the existing listing rather than adding a second one.

**This looks likely, not verified:** **AGS Collectibles** (Terrebonne) is a real, established
collectibles dealer, but I couldn't confirm sports cards specifically versus general
antiques/collectibles. **Card Caster's Mirabel location** — same chain as the Blainville one
above, but I found no sports-card-specific evidence for this particular location.

---

## C. No-card-evidence review (57 already-listed shops)

**File:** `docs/research/2026-09-04-noncard-triage.csv`

To be precise about scope: the source file has 111 rows total across five different
automated-scan outcomes; the 57 in the brief are specifically the ones the scan flagged
**"no card evidence found."** These are all shops **already live on the site today** — this
was never a delete list, and I'm not recommending removing any of them. The job was to find
real evidence one way or the other.

| Outcome | Count | What it means |
|---|---|---|
| Found real card evidence — scan was wrong | 14 | Keep listed, with more confidence than before. |
| Confirmed genuinely no evidence | 33 | I looked and it really is a bookstore, a metaphysical shop, a record store, an RC-hobby shop, etc. Still not a removal recommendation — just an honest finding. |
| Still couldn't tell | 10 | Site was empty/broken, or too vague. Needs a human. |

**The big finding here:** the automated website-scanning tool that flagged these 57 has a
real blind spot — it can't read Instagram bios, and it seems to miss content that isn't in
the obvious spot on a homepage. Fourteen shops that scanned as "no evidence" turned out, on
an actual visit, to sell sports cards, including some with names that give zero hint of it:

- **GNU Books** (Oshawa) — sounds like a used bookstore. Its own site sells "2023 UPPER DECK
  HOCKEY EXTENDED HOBBY" boxes for $120 and has dedicated hockey-card and baseball-card
  categories.
- **418 Sports** (Quebec/Charlesbourg) — the name literally says "sports" and the scan
  *still* missed it. Confirmed hockey/football/basketball/baseball cards.
- **The Nut Man** (Regina) — a nut-and-candy shop since 1983 that's also a Saskatchewan
  fixture for sports cards, tied to provincial National Hockey Card Day coverage.
- **Capital City Cards & Collectibles** (Edmonton) — the evidence was sitting in its
  Instagram bio, which the scanning tool can't read at all.
- Also: Arkane Angel, Hyper Games Chamber, Paradise Games and Customs (all AB), Blue Moon
  Collectables (BC), Box Of Cards — both locations (ON), Stephen Licence Bicycles & Hobbies
  (ON), Hall Of Fame Collection (ON, though note it's specifically Formula 1 racing cards —
  worth your call on whether that fits the site's scope), Les Entreprises Bluenose (QC), and
  Skies the Limit Fireworks & Toys (SK, hockey-card trade days documented in local news).

**Confirmed genuinely not card shops, worth a look at how they got listed in the first
place:** Nepal Handicrafts, Valixya (a witchcraft/metaphysical shop), Royal Cat Records (a
record store), The Bookshelf (a bookstore/cinema/bar), Seven Sisters Ritual Apothecary,
Hi-Times (a cannabis head shop), Putali Chowk (a board-game bar), and a handful of pure
RC/diecast-model or video-game resale shops. None of these are being flagged for removal by
me — that's not what this pass was for — but if the directory ever does a real cleanup
pass, these are the ones to look at first.

---

## D. Show payload verification — the Calgary question, answered

**File:** `docs/research/2026-09-04-show-payload-verification.md`

**Same real event, scraped twice.** I checked this three separate ways and they all agree:
1. The organiser's own website (fetched live today) describes one 3-day event, Sept 18–20,
   at the Genesis Centre.
2. The site's existing show listing already has this exact event, correctly, as one 3-day
   show.
3. There's already a note in the site's own "redirect" file (a list of old web addresses
   that should forward somewhere) showing that two of these three duplicate dates were
   **already caught and fixed by a previous session** — someone already made this exact call
   before I started.

None of the three Calgary rows should be pasted.

I then checked the other 33 rows in the same payload the same way (comparing against what's
actually on the site today, not just trusting the old file's labels). The picture: **24 of
the 36 rows are duplicates of shows already on the site** (mostly the same recurring Ottawa
and Ontario shows scraped a second time under a slightly different name). **Two shows are
genuinely missing and well-documented enough to add today**: Metamiraj Card Show (Surrey,
BC) and Trading Card Con Vancouver (a 3-day event, Sept 4–6). **Five more shows are
genuinely missing but only have a single, unverifiable source** (an Instagram post or a
Facebook share link, which — per this project's own rule — can't be independently confirmed)
— those need a human to find a second source before they go anywhere near the sheet.

---

## What I could not resolve, and exactly why

- **Facebook-only businesses** (about a dozen across all three lists): Facebook business
  pages require a login to view, so there is no way for me to independently verify them.
  This isn't a guess — it's a documented, structural limit, not laziness.
- **Dead or JavaScript-only websites** (Square-based storefronts especially): a handful of
  sites returned nothing to the tools I have, even though the business may be perfectly
  real. These need either a phone call or a different browsing tool than what I had access
  to in this pass.
- **Generic "collectibles" wording**: several real, established shops describe themselves
  only as selling "cards" or "collectibles" without saying which kind. I did not guess in
  either direction — I flagged these for a human rather than assuming sports cards either
  are or aren't in the mix.

## My recommendation

- Paste the 4 Alberta and 10 Quebec "ready to add" rows — they're each backed by the shop's
  own website or independent local coverage, not just a name match.
- Don't touch the show payload at all — it would only create duplicate listings. Add the two
  genuinely-new shows (Metamiraj, Trading Card Con Vancouver) instead, using the details in
  the verification report.
- Leave every "no card evidence" shop exactly as it is on the site. Nothing here justifies
  removing a live listing — the review only found reasons to trust 14 of them *more*, and
  found honest gaps in the rest.
- The "needs a human" rows in all three lists (about 38 shops total) are the one category
  where more internet searching won't help — they need someone to actually call or visit.

---

## Orchestrator verification pass (2026-09-04, after the research above)

Every row proposed for adding was screened against the live directory and against the other rows in
the same file, because a payload's job is to be pasteable and a duplicate listing is the one error
this directory cannot afford. Three rows changed verdict. **Nothing else was altered.**

### 1. Two of the Quebec "add" rows are the same shop

`Cartes Sportives Temple De La Renomee` and `Sport Cards Hall Of Fame` were both marked INCLUDE,
both in Dollard-des-Ormeaux, both at **4067 Boul. Saint-Jean** — and the French row's own source
column cites the English row's Facebook page. "Temple de la Renommée" is French for "Hall of Fame".
The French row is now `DUPLICATE`; add the English one only. **Net: 9 Quebec adds, not 10.**

### 2. "Le Roi des Cartes" in Beloeil is not safe to paste

Marked INCLUDE at 347 rue Duvernay (leroidescartes.ca). The directory already lists
**DSM Sports Cards Collectors (Le roi des cartes)** in Beloeil at **272 rue Duvernay**
(dsmsportscardscollectors.com) — same street, different number, postal code and website.

Three readings, and no way to choose from a desk: two real shops on one street; one shop that moved,
leaving our listing stale; or an earlier conflation — note that the existing entry carries
"(Le roi des cartes)" in parentheses appended to a *different* business name, which is what a
previous merge looks like. Downgraded to `REVIEW`. A phone call settles it.

The Valleyfield sister store is unaffected — different city, and the shop already listed there
(`Sport Collect 2010`) is a different business at a different address.

### 3. Overtime Sports Cards, Calgary — check before adding, don't just paste

The row is sourced live from the shop's own site naming a North Hill Centre location, so it looks
real. But the directory already lists **Overtime Sports Cards & Grading in Balzac**, and
`redirects.json` sends the old Calgary URL to the Balzac page — an earlier session concluded that
shop had *moved*. A genuine second location is plausible (the slug wouldn't clash), but if it moved
rather than expanded, adding this row republishes a store that isn't there. Note added to the row.

### What this pass did NOT cover

`audit-noncard-scanned.csv` holds 111 rows. This triage worked the 57 marked `NO-CARD-EVIDENCE`,
which is the correct subset and was verified as such — but **33 rows marked `AMBIGUOUS` and 7 marked
`UNREACHABLE` in that same file have still never been triaged by anyone.** They are not covered by
this report and should not be assumed resolved.

Two counts in the original brief were also wrong and are worth correcting at the source: the Alberta
gap file holds **69** rows (not 59) and the Quebec candidates file holds **52** (not 41). Both were
worked in full; the smaller numbers came from a stale handoff note.
