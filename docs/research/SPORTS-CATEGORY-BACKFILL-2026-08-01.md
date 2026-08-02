# Sports-category backfill — what the 82 empty records actually turned out to be

Run 2026-08-01, to answer the open question from
`decisions/2026/2026-07-29-scnm-publishing-standards.md`: **backfill the missing
`sports` data before tiering rankings by sports-card evidence?**

Answer: **yes, and the backfill found a bigger problem than the one it was sent
to fix.** Nothing here has been applied. Every row is a proposal with its
evidence, for review.

## Method

`scripts/scan-sports-evidence.py` — fetches each shop's own website and looks for
category-specific phrases. Sibling of `scan-card-evidence.py`, same defaults for
the same reasons: browser User-Agent, HTTP status recorded separately from
evidence, multi-word phrases only.

**Calibrated first, on 40 shops whose categories are already known** (20 tagged
with a sport, 20 tagged TCG-only). Result after two fixes: **0 verified false
positives in 34 reachable shops, 3 misses.** The misses leave a shop untagged,
which is the safe direction. Two patterns were removed or added because
calibration caught them failing:

- `memorabilia` scored Treasure Cove Comics as a sports shop. Its site means oil
  and gas memorabilia, knives, swords and war medals. Narrowed to
  `sports memorabilia`.
- Two Quebec shops scored TCG-only purely because their sites say *cartes de
  hockey*, not *hockey cards*. French forms added for every category.

## Result on the 82

| | count |
|---|---|
| Resolved — sports, evidenced on their own site | 6 |
| Resolved — sports, business name states it (no usable site) | 10 |
| Resolved — TCG-only | 4 |
| **Still unknown** | **62** |

`docs/research/sports-backfill-review-2026-08-01.csv` carries every row with its
proposal, confidence and basis.

**Website scanning cannot close the remaining 62, and it is worth being clear
why:** 16 have no website at all, 17 are unreachable — 10 of those are Facebook
pages, which are login-walled and unverifiable per the standing tooling note —
and 39 have a site that loads but never says what it sells.

## The finding that matters more

**Of the 62 still unknown, 24 have a working website with zero card terms on it.**
Names include Nepal Handicrafts, Seven Sisters Ritual Apothecary, Hi-Times (a
head shop), The Bookshelf, Royal Cat Records, Horizon Diecast and a Warhammer
store.

For a meaningful share of these records, **the category field is empty because
they are not card shops** — the empty field was a signal, not only a gap. This is
the directory-miscategorisation pattern already documented in
`RESEARCH-TOOLING-NOTES.md`.

**This is a review list, not a delete list**, under the standing rule and for the
same reason it protected the last one: 14 of the earlier 111-shop list turned out
to sell cards, including one named *Card House*.

## The finding that changes the tiering decision

Calibration turned up something the backfill was not looking for. Four shops
tagged TCG-only scored as selling sports cards, and **all four were verified by
hand against their own websites — the scanner was right and the existing tags are
wrong.** Hobbiesville has a Sports Cards section covering hockey, soccer,
football, basketball, baseball, golf, UFC and racing. Emmett's ToyStop lists
basketball, baseball, hockey and soccer cards plus Topps Chrome baseball. KadOone's
navigation carries Sports Cards with Panini, Topps and Upper Deck.

Scanning all 281 TCG-tagged shops:

- **15** name a specific sport on their own site (*hockey cards*, *Topps*, *Upper Deck*)
- **11** say *sports cards* / Panini / rookie cards without naming a sport
- **26 total — 15% of the 173 with a reachable website**

A further 15 matched only *graded cards* or *PSA*. **Those are excluded on
purpose**: PSA grades Pokémon constantly, so neither phrase is evidence of sports.
Two spot-checks confirmed both shops resting on that signal alone showed nothing
else sports-related.

List: `docs/research/tcg-tagged-with-sports-evidence-2026-08-01.csv`.

### What this means for the tiering plan

Tiering today would demote **at least 26 verified sports-card sellers** into the
lower tier — including 401 Games, Hobbiesville and L. A. Mood. That is the same
class of error the tiering was meant to correct, pointed the other way.

15% is a floor, not a ceiling: 108 of the 281 have no reachable website, so their
tags have never been checked against anything.

**Recommendation:** the `sports` field is not yet trustworthy enough to tier on.
Fixing the 82 empty records was the visible problem; the 281 tagged records are
the larger one, and 26 corrections are already sitting in the CSV above with
evidence. Apply those first, then re-measure.
