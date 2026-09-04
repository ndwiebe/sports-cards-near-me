# Show refresh payload verification — 2026-09-04

Checked every row of `docs/research/2026-08-28-show-refresh-payload.csv` (36 data rows,
covering 8 "new" + 25 "changed" + 3 "previously-rejected") against the live
`src/data/shows.json` (204 shows) and `src/data/redirects.json`. Method: exact
name/date/venue/address comparison, not guessing — plus two live-source checks (the
Calgary organiser's own site, and a web search for the Mississauga venue name).

## The Calgary question — answered

**Same real event, scraped twice. None of the three Calgary rows should be pasted.**

Evidence, three independent ways:

1. **The organiser's own site** (`sportcardexpocalgary.com`, fetched live today) describes
   **one** three-day event, Sept 18–20, 2026, at the Genesis Centre, 7555 Falconridge Blvd
   NE — Friday 3–8pm, Saturday 10–5, Sunday 10–4, with Friday/Saturday $20 adv/$25 door and
   Sunday $15 adv/$20 door.
2. **`shows.json` already carries this exact event correctly**, as one row: "Sport Card &
   Memorabilia Expo — Calgary," Genesis Centre, 7555 Falconridge Blvd NE, startDate
   2026-09-18, endDate 2026-09-20, hours "Fri 3-8, Sat 10-5, Sun 10-4" — matches the live
   site word for word.
3. **`redirects.json` already has explicit entries from a past session** settling this:
   `/shows/sports-card-expo-calgary-2026-09-19/` and `-09-20/` both redirect to the Sept 18
   show page. That is why the refresh script marked those two rows PREVIOUSLY-REJECTED —
   someone already made this exact call and left a record.

The payload's row 1 (Sept 18, marked CHANGED) is the same event's opening day under
TCDB's own name for it ("Sports Card Expo" vs. our "Sport Card & Memorabilia Expo —
Calgary"); it never got its own redirect entry, probably because it was caught before a
page was ever published. All three rows are the same duplicate. Paste none of them.

## Everything else, row by row

Checked every remaining row against `shows.json` by city, and where the same-date match
looked wrong (venue didn't match), searched further rather than trusting the date alone —
that caught two cases below where a same-day match was NOT the same show.

### Already listed — do not paste (24 rows)

These matched an existing show exactly or fell inside an existing show's date span. A
few "CHANGED" rows are just TCDB's generic naming for a show we already have under its
real organiser name (Capital Trade Shows in Ottawa alternates "Card & Comic Show" /
"Pokemon Show" month to month; TCDB flattens both to "Monthly Sports Card & Comic Book
Show").

| Show | City | Date(s) | Why it's a duplicate |
|---|---|---|---|
| Sports Card Expo (rows 2–4) | Calgary | Sep 18–20 | See above |
| Card Summit | Edmonton | Aug 29 | Exact match already in shows.json |
| VanCity Card Show (rows 12–14) | Vancouver | Oct 2–4 | Already one 3-day show, Oct 2–4; rows 13–14 are days already inside that span |
| Hobbycon Guelph ×3 | Guelph | Sep 7, Nov 14, Dec 19 | Exact matches, same venue/address |
| Hanover Card, Toy & Collectible Show | Hanover | Sep 13 | Exact match (TCDB's "address" field is actually a copy-pasted date string, ignore it) |
| Nostalgia Fest Expo @ Square One | Mississauga | Oct 9 | Exact match |
| Sport Card Expo Toronto | Mississauga | Nov 5 | Matches "Sport Card & Memorabilia Expo — Toronto (Fall)," same venue/address, Nov 5–8 span |
| Hobby Con Mississauga | Mississauga | Nov 7 | Exact match |
| Monthly Sports Card & Comic Book Show ×7 (rows 25–31) | Ottawa | Sep 12–13, Oct 11, Nov 1, Nov 22, Dec 6, Dec 13 | Every date matches an existing Capital Trade Shows entry at Nepean Sportsplex, same address; Sep 13 was already explicitly rejected in `redirects.json` |
| Greater Toronto Sports Card Show ×2 | Toronto | Sep 13, Dec 27 | Exact matches |
| Border City Card Show | Lloydminster | Nov 7 | Exact match |
| Saskatchewan Card & Collector Experience (rows 36–37) | Saskatoon | Sep 26–27 | Already one 2-day show, Sep 26–27; row 37 is inside that span |

### Genuinely new — worth adding, but each has a gap (7 shows / 8 rows)

Searched the **entire** shows.json (not just same-city) for these — no match anywhere,
confirmed absent. Still short of the "address + second independent source" bar in at
least one way each, so none are pasted; a human should close the gap first.

| Show | City | Date(s) | Address | Source | What's missing |
|---|---|---|---|---|---|
| Metamiraj Card Show | Surrey, BC | Sep 12 | Sheraton Hotel Guildford, 15269 104 Ave | metamiraj.com/sept-12-2026/ (organiser's own site) | Nothing — **ready to paste**, only one with a real organiser site as source |
| Trading Card Con Vancouver — Day 1 | Vancouver, BC | Sep 4–6 (3-day) | Sheraton Vancouver Wall Centre, 1000 Burrard St | tradingcardcon.com/event/vancouver-canada/ (organiser's own site) | Nothing — **ready to paste** as one 3-day show (Sep 4 start, Sep 6 end), not three rows. TCDB's date-matching falsely flagged rows 9–10 as "changed" against an unrelated same-date show ("Vancouver Card Show," Croatian Cultural Centre) — different venue, different event, ignore that match. |
| Chonky Card Show | Richmond, BC | Sep 12 | Lipont Place, 4211 Number 3 Rd | Instagram post only | No independent second source — Instagram is a single unverifiable source per house rule |
| Coastal Collectibles Convention | Vancouver, BC | Sep 26 | South Hall Event Centre, 8273 Ross St | Instagram post only | Same gap — single source |
| Living Sky Card Show | Moose Jaw, SK | Nov 14 | Cosmo Senior Centre, 235 3rd Ave NE | Facebook share link only | Facebook is documented as unverifiable (login wall) — needs a second source |
| Hobby Con Ottawa | Ottawa, ON | Sep 12 | Mosaic Convention Center, 2465 St. Laurent Blvd | tcdb.com only | Matches the known recurring chain's real venue exactly, and the date fits its monthly cadence (all of Sep 12/Oct 10/Nov 14/Dec 19 fall on the 2nd Saturday), but TCDB is the only source — worth a quick check of the organiser's own listings before adding |
| NorthSide TCG Cards & Collectibles Show (rows 19–20) | Mississauga, ON | Aug 29 | none given ("St Judes Ac Dome") | tcdb.com (×2 different IDs, same show) | **No street address at all** — fails the publishing standard outright. Also: confirmed by web search this is a real, separate touring show (different organiser/venue from our already-listed Aug 29 Mississauga show, "Mississauga TCG and TOY show" at Ace Active Zone — the two are not the same event, just a date coincidence), so it's a real gap, not a duplicate. TCDB itself lists it twice under different detail-page IDs for the same date — only one occurrence, not two, if it's ever added. Needs an address before it can go anywhere near the sheet. |

## Bottom line

- **0 of the 36 rows should be pasted as-is.** 24 are confirmed duplicates of shows
  already in `shows.json`. The remaining 8 (Metamiraj + the 3-day Trading Card Con
  Vancouver) are genuinely missing and well-sourced — 2 shows, 4 rows if you count the
  multi-day one per day — but nobody has pasted them yet either, since they weren't
  reviewed before now.
- **Ready to paste today, no further work needed:** Metamiraj Card Show (Surrey) and
  Trading Card Con Vancouver (as one Sep 4–6 show).
- **Needs a human decision, not more scraping:** the four Instagram/Facebook-only shows
  (Chonky, Coastal Collectibles, Living Sky) and the address-less NorthSide TCG show — the
  facts are as complete as they'll get without a phone call or a DM to the organiser.
- **Confirms a prior finding still holds:** the Ottawa "Capital Trade Shows" duplicate flagged
  HOLD in `SESSIONS.md` on 2026-08-27 is resolved by this pass — `redirects.json` shows
  someone already merged it, and the current `shows.json` entry (Sep 12–13, Nepean
  Sportsplex Curling Rink) is the correct single record.
