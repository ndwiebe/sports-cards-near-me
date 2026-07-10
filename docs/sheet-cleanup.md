# Google Sheet Cleanup Report

Plain-English list of things worth fixing by hand in the store spreadsheet. None of these break the site — it's already working around them — but fixing them in the sheet will make store pages and the map more accurate. The site pulls fresh data from the sheet once a day, so any edit you make will show up on the live site the next morning without any other action needed.

## 1. City column doesn't match the street address (9 stores)

These stores have a "City" value in the sheet that doesn't actually appear anywhere in their "Address" value — usually because the City column has the town the owner lives in or does business as, while the Address is the actual street location (often in a different town). Worth a quick double-check against Google Maps and correcting the City column to match the real address.

**How to fix:** open the sheet, find each row below, and update the City cell to match the town in the Address cell (or fix the Address if it's the one that's wrong).

- Capital City Cards & Collectibles — City: "Beaumont" — Address: "12011 111 Ave NW, Edmonton, AB T5G 0E7"
- Common Box Games — City: "Beaumont" — Address: "8932 118 Ave NW, Edmonton, AB T5B 0T6"
- Taps Games — City: "Beaumont" — Address: "2854 Calgary Trl NW, Edmonton, AB T6J 6V7"
- YEG NHLHockeyStickers.Com — City: "Beaumont" — Address: "10323 78 Ave NW, Edmonton, AB T6E 1N8"
- Dave's Card Shop — City: "Brooks" — Address: "15734 100 Ave NW, Edmonton, AB T5P 0L1"
- Overtime Sports Cards & Grading — City: "Calgary" — Address: "260300 Writing Creek Cres, Balzac, AB T0M 0E0"
- Lakeland Sports Cards — City: "Cold Lake" — Address: "50 St, Bonnyville, AB T9N 2G3"
- The Card Goat — City: "Lethbridge" — Address: "9704 39 Ave NW #116, Edmonton, AB T6E 6M7"
- Slab Savvy CPA — City: "Sherwood Park" — Address: "AB T8A 4C5"

## 2. Thin address, no street info (1 store)

- Slab Savvy CPA — Address: "AB T8A 4C5" (just a province and postal code, no street or city). This is fine if it's intentional (e.g. a home-based or online-only listing), but it will render thin on its store page since there's no street to show. Worth a quick check on whether a real street address exists to add.

**How to fix:** if there's a real street address, add it to the Address cell; if not, no action needed.

## 3. Rows with no map coordinates — invisible on the site (19 stores)

These rows are missing latitude/longitude in the sheet, so the bakery script (the daily process that turns the sheet into the site's data file) skips them entirely — they don't show up on the map or in search at all until coordinates are added.

**How to fix:** add a lat/lng pair for each row (Google Maps: right-click the pin location and copy the coordinates shown).

- Al's Sports Quest
- Calgary Sports Cards
- Cold Lake Sports Cards *(see note below)*
- D&C's Collectibles
- DJS Sportscards, Comics & Collectibles
- Hockey Central Sports Memorabilia Inc
- Jesse Johnston · Edson Buy, Sell and Trade
- Level X Cards and Collectibles
- One Man's Treasure
- One Piece TCG Edson AB
- Stettler Game Corner
- Tailgate Mercantile Co.
- THE FORT Gaming & Collectibles (board games & card ...)
- The Mill Store - Okotoks, AB
- WAYNE'S SPORTS CARDS AND COLLECTIBLES
- West's Sports Cards & Collectibles
- Whitecourt Collectors Corner
- Wizard's Loft
- Yellow Shirt Relics

**Worth prioritizing: "Cold Lake Sports Cards".** It's the only row in the entire sheet that has a phone number filled in — every other store's Phone cell is blank — and it's currently invisible on the site for lack of coordinates. Adding its lat/lng would be the highest-value single fix on this list.

## 4. Two other columns that are basically empty

- **Hours:** every row's Hours cell contains a single invisible icon character (not real text), so the site's cleanup step strips it out and shows no hours anywhere. Worth filling in real open/close times over time.
- **Phone:** empty for every store except Cold Lake Sports Cards (above). Worth collecting phone numbers when you have time — the upcoming research helpers (Plan 3) will help backfill this automatically.
