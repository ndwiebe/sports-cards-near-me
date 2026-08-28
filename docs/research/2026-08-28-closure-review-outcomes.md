# Closure review outcomes — 2026-08-28

The monthly closure scan flags shops Google reports as `CLOSED_PERMANENTLY`. It re-flags the
same shops every run, so without this record the next reviewer redoes the whole investigation.
**Read this before acting on `docs/research/closure-review.csv`.**

Full scan: 689 shops, 32 flagged. **29 marked closed. 3 held back.**

## Why Google's flag is not sufficient on its own

Google reports a business as permanently closed when it moves, rebrands, or is wrongly reported
by a user. Unlisting a business that is actually trading is the worst error this directory can
make, so each flag was checked against evidence Google does not provide.

## The 29 marked closed

Checked three ways: address-match quality against Google's own matched address (26 of 32 agreed
on both street number and postcode), every website we hold (13 fetched and followed — 8 dead:
404s, DNS failures, and one domain now resolving to an unrelated site, which is what an expired
domain looks like), and social presence for the survivors. Written to sheet column `Status` =
`closed`; they keep their pages, marked and noindexed.

## The 3 held back — do NOT mark these closed without new evidence

### BFireBallDragon (Val Caron / Greater Sudbury) — **RESOLVED: flag rejected**

Google matched a **different address**: our record says 1490 Main St, Google's matched result says
1642, with a different postcode. The closure notice belongs to another business at another
address. Our listing carries 117 Google reviews, which is a substantial real business.

> [!important] This one should not be re-raised. If the scan flags it again next month, it is the
> same bad match — the fix is a better match, not a closure. Its own website (`bfireballdragon.com`)
> is dead, but that is weak evidence next to a demonstrably wrong address match.

### Toyz Game Emporium (Grande Prairie) — **UNRESOLVED, needs a phone call**

- **Against closure:** Facebook page live, 5,800 followers, active "Call now" button, no closure
  notice on the page.
- **For closure:** Google says permanently closed.
- **The bigger problem, separate from closure:** our record has **empty `services` and empty
  `sports`** — no recorded evidence it sells cards of any kind. Its own Facebook page describes it
  as *"Grande Prairie's premier video game supplier"*. This may be a miscategorised listing rather
  than a closed one.

**Recommended:** decide the categorisation question first. If it is a video game shop that doesn't
sell cards, the listing should go regardless of whether the doors are open. That is Nathan's call,
not a closure call.

### Booster House (Kingston) — **UNRESOLVED, needs a phone call**

- **Against closure:** its site redirects to a live Square store actively selling Pokémon and MTG.
- **For closure:** Google says the location is permanently closed.
- Reads like Capital City Sports Cards — storefront gone, business still trading online — but that
  case had independent confirmation and this one does not.

**Recommended:** if confirmed, this is `online-only`, not `closed`. Marking it `closed` would be
wrong in the specific way the online-only status exists to prevent.

## Shared observation

All three lack an `hours` value, while 631 of 659 open shops now have one. A shop with no hours,
no services and no sports tags is a thin listing whether or not it is open — worth a pass of its
own, separate from closure.

## What would actually resolve the two open cases

A phone call each. Both have a number in the sheet. Nothing on the public web settled it: two
browser attempts (Google via the logged-in browser, then a headless search) returned no usable
evidence on 2026-08-28.
