# Editorial independence policy

_Per PLAN.md step 14: "Write the editorial-independence policy BEFORE the first client, not
after." This is that policy. Effective the day it's approved — before any Featured slot or Slab
Savvy CPA services client is signed, not after._

**Plain-English summary:** this is a written promise that paying Sports Cards Near Me (SCNM)
for anything — a Featured slot (a paid, labelled box, defined below) or a Slab Savvy CPA
services engagement — never changes how a shop is ranked, reviewed, corrected, or refreshed on
this site. It also says what happens if that promise is ever broken, and how anyone (including
Nathan checking his own work) can verify it's being kept.

## 1. What "ranking function" and "relationship field" mean

- **Ranking function** — the code that decides the order shops appear in on a city, province,
  sport, or "best of" page. Today that's `rankScore`, `byWeightedRankIn`, `byRecommendedRank`,
  `bySportsCardRank`, and `topRatedStore`/`topRatedSportsCardStore`, all in `src/lib/seo.ts`.
  Every one of them takes only `rating`, `reviewCount`, and (for `bySportsCardRank`) the shop's
  own `sports`/`services` tags as input. None of them takes anything about money.
- **Relationship field** — any piece of data recording that a shop is a paying customer:
  whether it holds a Featured placement (`src/lib/featured.ts`'s `FeaturedPlacement` records),
  whether it's a Slab Savvy CPA services client, or any future commercial flag. Relationship
  fields live in their own records (placement records, a private client list), never as a
  property on a `Store` object the ranking functions read.

## 2. What is prohibited, in writing

1. **No ranking intervention of any kind.** No shop's rating, review count, or rank position is
   ever adjusted, overridden, or excluded/included because it pays for anything. The ranking
   functions listed above read only public Google rating data and the shop's own service/sport
   tags — never a commercial flag. A Featured slot buys a separate, clearly-labelled box; it
   never buys a better spot in the organic list.
2. **No preferential handling of corrections.** A paying shop's correction request (address
   change, hours fix, listing removal) goes through the exact same review-then-rebuild path as
   any other shop's, on the same daily cadence. No client gets a faster queue.
3. **No review or rating manipulation.** SCNM never asks, pays, or incentivizes anyone to leave
   a Google review for a client, never suppresses or hides a client's negative reviews, and
   never edits the rating/review-count numbers pulled from Google for any shop.
4. **No unequal data-refresh treatment.** Every shop — client or not — is refreshed on the same
   schedule (daily rebuild from the sheet; monthly Google rating refresh via
   `refresh-ratings.py`). No client gets a manual, off-cycle refresh a non-client wouldn't also
   get if they emailed in a correction.

## 3. What is required, in writing

- **Disclosure on the listing.** A shop that is both listed in the directory AND a paying
  services client (Slab Savvy CPA) gets a visible marker on its own listing saying so, with the
  shop's contractual consent obtained first (PLAN.md step 12 — consent is required before any
  such disclosure or before passing the shop's details to KRP for a tax/accounting referral).
  This marker is separate from, and in addition to, the Featured "Paid advertisement" label —
  a shop can be a services client without buying Featured, and vice versa, and each gets its own
  honest label.
- **The "Paid advertisement" label and `rel="sponsored noopener"` link attribute** (defined once
  in `src/lib/featured.ts` as `FEATURED_LABEL` / `FEATURED_LINK_REL`) on every Featured
  placement, every time, with no exceptions and no A/B test that removes it.

## 4. The auditable exception process

There is no silent judgment call. If a deviation from section 2 or 3 is ever proposed or
happens — intentionally or by a bug — it must be recorded with:
1. What happened (the specific shop, the specific field, the specific page).
2. The named reason (not "seemed fine" — an actual business or technical reason).
3. Who approved it. For anything touching ranking, only Nathan can approve a deviation, and the
   approval itself is recorded in the same place as the deviation, not assumed from silence.
4. The fix or reversal, and the date it landed.

This record lives in `SESSIONS.md` (the existing "who's touching what, and what happened" log)
or a dedicated `docs/monetisation/exceptions-log.md` if the volume ever justifies a separate
file — whichever exists first when the first exception happens. **No exception is ever "just
this once and we forgot to write it down."**

## 5. How this is actually enforced, not just promised

A written policy with no test behind it is a promise, not a control. Two mechanical
enforcements exist or are being built:

- **`tests/unit/featured.test.ts`'s ranking-invariance test** (Task 4 of
  `docs/superpowers/plans/2026-09-23-q4-sellprep-guides.md`) proves mechanically that giving a
  shop an active Featured placement does not change its position under `byRecommendedRank` —
  the worst-rated shop in the test still sorts last even while holding an active placement.
  This is a repo-wide regression test: it runs on every `npm test`, including in CI, so a future
  change that accidentally lets a commercial field leak into a ranking function fails the build
  before it ships.
- **`superlative-claims.test.ts`** (existing, unrelated to Featured but the same enforcement
  pattern) already scans every page for claims about a named business that the code doesn't
  actually support. The same pattern — a repo-wide scan that fails the build — is the template
  for any future "relationship field reached a ranking function" guard, if one is ever needed
  beyond the invariance test above.

Neither test currently exists to catch a *services-client* relationship field leaking into
ranking, because no such field exists in the codebase yet (Slab Savvy CPA services haven't
started). **Before the first services client is signed, add the equivalent test**: a services
client flag, attached to a shop only in a private record (never on the public `Store` type),
with the same invariance proof. Recorded here as a required follow-up, not done by this
document.

## 6. Three relationships, one shop owner — the risk this policy exists to control

PLAN.md's own risk log names it: Nathan can simultaneously be a shop's directory ranker, a
Featured-slot supplier, and (via Slab Savvy CPA) a services vendor to the same shop owner.
Disclosure (section 3) plus the mechanical ranking-invariance guard (section 5) are the two
controls that exist today. This policy does not claim the conflict is eliminated — it is
managed, visibly, with a test behind the one promise (rankings stay unbuyable) that matters
most to why anyone trusts this directory at all.
