# Show refresh 2026-09-05 — payload verification

**Do not paste the payload as-is.** 20 rows are marked NEW; **about 15 are real shows.**
Two would duplicate a show already on the site, and four are second and third days of
events that belong in one row each.

Run: `python3 scripts/refresh-shows.py`, 2026-09-05.
NEW 20 · CHANGED 23 · KNOWN 137 · GONE 0 · PREVIOUSLY-REJECTED 3.

## The one thing to understand before reading the rows

**TCDB publishes one row per DAY. We store one row per EVENT, with an `EndDate`.**

Nothing in the comparison can see that, because it matches on start date — and day 2 of a
show has a different start date from day 1, so it looks brand new. This is the same defect
that produced the Ottawa fold-in decision on 2026-08-28, and it is not going away: it is
structural to the source.

The site's own guard already catches part of it. Sports Card Expo Calgary comes back as
three day-rows (Sep 18, 19, 20); 19 and 20 are flagged **PREVIOUSLY-REJECTED**, because a
past session deleted exactly those two day-rows for exactly this reason. That is the guard
working, and it is also proof the pattern repeats every quarter.

## Rows to DROP — already on the site (2)

| Payload row | Why |
|---|---|
| VanCity Card Show, Vancouver, **2026-10-03** | Day 2 of `Vancity Card Show` which we already list as **2026-10-02 → 2026-10-04**, same venue |
| VanCity Card Show, Vancouver, **2026-10-04** | Day 3 of the same listing |

Adding these gives one show three separate pages.

## Rows to MERGE before pasting (4 rows → 2 shows)

| Payload rows | Paste instead |
|---|---|
| CardFesta, Brampton, 2026-09-05 **and** 2026-09-06 — same venue (Brampton Soccer Centre), same hours | one row, StartDate 2026-09-05, **EndDate 2026-09-06** |
| MEGA MIRAJ SHOW **DAY 1** by metamiraj, Surrey, 2027-02-06 **and** 2027-02-07 — same venue, same hours, and TCDB titles *both* rows "DAY 1" | one row, StartDate 2027-02-06, **EndDate 2027-02-07** |

## One row that needs a judgement call (1)

**CardFesta - 30th Anniversary Show, Brampton, 2026-09-19.** We already list a
`CardFesta - 30th Anniversary Show` in Brampton on **2026-09-20**, same hours. Adjacent
days, identical name — so this is very likely day 1 of a two-day event where we captured
day 2.

⚠️ But the venues do not match: TCDB says **Bramalea City Centre**, and our row's venue is
not the same. Either the show moved, or these are two different bookings. Settle it from
the promoter's own listing before pasting. If it is one event, edit our existing row to
start 09-19 rather than adding a second row.

## Genuinely new, paste as-is (13)

Card Summit (Edmonton, 09-26) · Chonky Card Show (Richmond, 09-12) · The REDEYE Show by
Jetlagged Cards (Richmond, 09-18) · Collector's Fest by Lazy Trading Cards (Richmond,
09-19) · **Metamiraj Card Show (Surrey) × 4 — 09-12, 10-10, 11-07, 12-13**, a monthly
series and correctly four separate shows, not a multi-day split · Coastal Collectibles
Convention (Vancouver, 09-26) · North American Card Exchange (Brampton, 09-20) · COLLECT
EX: Burlington (09-19) · Collectors Summit (Hamilton, 09-09) · Living Sky Card Show (Moose
Jaw, 11-14) · Saskatchewan Card & Collector Experience (Saskatoon, 09-27).

## GONE 0 is correct, and it was checked

Six provinces returned **empty** from TCDB — Manitoba, New Brunswick, Newfoundland, Nova
Scotia, PEI and **Québec** — which looks alarming next to "GONE: 0".

It is right. Every show we carry in those provinces was found by hand from the promoter's
own website (collectionsmontreal.ca, sportcardexpomontreal.com, sportscardsfest.com,
atlanticexpo.ca), not from TCDB, so none of them were ever in the comparison. Verified row
by row, not assumed.

**The standing consequence: TCDB's Canadian coverage is effectively Alberta, BC, Ontario
and Saskatchewan only.** Québec has 6 upcoming shows and the Maritimes 1, and this
quarterly script will never find any of them. Québec coverage is hand-maintained or it
does not happen.

## Calendar horizon after this refresh

The four-month decay is real and this refresh pushes it out: the payload reaches to
2027-02-07. Paste the corrected rows and the calendar is healthy into the new year.
