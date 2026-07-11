# Plan 3 — Directory Data Accuracy Audit

Verification of the 69 live stores in `src/data/stores.json` plus the 19 coordinate-less
rows named in `docs/sheet-cleanup.md`, checked against live web sources on 2026-07-11.

Only exceptions, fixes, and gap-fills are listed below. Any store not appearing in these
tables was either verified as correct/operating, or is a well-established shop (active
website + strong recent reviews) treated as presumptively clean — see "Not individually
re-checked" at the bottom.

**Rule followed:** every value below carries a live source URL. Where a value could not be
confirmed from a live source, it is omitted (a gap is safer than a wrong "correction").

---

## 1. CORRECTIONS

The 9 city/address mismatches from `sheet-cleanup.md`. In 8 of 9 the **City column is wrong**
and the street Address is correct (the coordinates already match the real address). Slab
Savvy CPA needs no change.

| Store | Field | Current value | Correct value | Source URL |
|-------|-------|---------------|---------------|------------|
| Capital City Cards & Collectibles | City | Beaumont | **Edmonton** | https://urbanedmonton.ca/listing/capital-city-cards-collectibles/ (12011 111 Ave NW, Edmonton; IG handle "capitalcitycardsyeg" = YEG/Edmonton) |
| Common Box Games | City | Beaumont | **Edmonton** | https://commonboxgames.com/ (8932 118 Ave NW, Edmonton) |
| Taps Games | City | Beaumont | **Edmonton** | https://tapsgames.com/collections/events (2854 Calgary Trail NW, Edmonton) |
| YEG NHLHockeyStickers.Com | City | Beaumont | **Edmonton** | https://www.nearmetcg.com/edmonton (10323 78 Ave NW, Edmonton; "YEG" = Edmonton) |
| Dave's Card Shop | City | Brooks | **Edmonton** | https://www.hobbynext.ca/stores/daves-card-shop/ (15734 100 Ave NW, Edmonton) |
| Overtime Sports Cards & Grading | City | Calgary | **Balzac** (Rocky View County) | https://www.yelp.ca/biz/overtime-sports-cards-and-grading-balzac (New Horizon Mall, 260300 Writing Creek Cres, Balzac) |
| Lakeland Sports Cards | City | Cold Lake | **Bonnyville** | https://lakelandsportscards.com/home (pickup location Bonnyville; address 50 St, Bonnyville) |
| The Card Goat | City | Lethbridge | **Edmonton** | https://thecardgoat.ca/ + https://www.facebook.com/p/The-Card-Goat-61553849998810/ ("Edmonton AB"; 9704 39 Ave NW, Edmonton; existing coords are already Edmonton) |
| Slab Savvy CPA | City | Sherwood Park | *(no change — correct)* | Postal code T8A 4C5 = Sherwood Park. City is right; the thin "AB T8A 4C5" address is intentional (home/online listing). No fix needed. |

---

## 2. LIKELY CLOSED / VERIFY BY PHONE

Only one store shows a real closure signal; the rest are flagged "verify by phone" because
the evidence is circumstantial, not conclusive.

| Store | Evidence | Confidence |
|-------|----------|------------|
| Bill Sr's Sports Cards (Red Deer, 4781 49 St) | Directory listing explicitly states the store "has closed." Phone 403-347-9211 still listed. | Medium — verify by phone. Source: https://red-deer.cdncompanies.com/store/bill-srs-sports-cards-red-deer/ |
| Cool Pool Cards (Cold Lake, 5107 50 Ave) | No current listing found anywhere; its listed address (5107 50 Ave) is now occupied by Cloudy Days Vape Shop / Prairie Vapes. | Low–Medium — verify by phone. Source: https://www.waze.com/live-map/directions/prairie-vapes-50-ave-5107-cold-lake |
| The Memorabilia Shop (Chestermere, 210 Springmere Close) | Address is residential; no live business listing, hours, or reviews found. Possibly appointment/home-based. | Unconfirmed — verify by phone. Source (no result): https://www.yellowpages.ca/search/si/1/Sports+Cards+%26+Memorabilia/Chestermere+AB |
| Personalized Sportcards (Lethbridge, 2938 12 Ave N) | No storefront listing found; site personalizedsportcards.com suggests a custom-card maker (likely online/home). | Unconfirmed — verify by phone. Source (no result): https://www.canpages.ca/business/AB/lethbridge/sports-cards-and-collectibles/322-800500.html |
| Wonderland Games (Grande Prairie, 10032 100 Ave) | Still operating, but one aggregator flags "closing soon." Phone 780-532-1963. | Operating but at risk — verify by phone. Source: https://wonderland-games.wheree.com/ |

---

## 3. ENRICHMENTS

### 3a. Gap-fills for existing (69) stores

| Store | Field | New value | Source URL |
|-------|-------|-----------|------------|
| Taps Games | Phone | (780) 705-0132 | https://www.yelp.ca/biz/taps-games-edmonton |
| Taps Games | Hours | Mon–Sat 11:00–22:00, Sun 12:00–17:00 | https://www.yelp.ca/biz/taps-games-edmonton |
| Common Box Games | Phone | (587) 415-8488 | https://common-box-games.wheree.com/ |
| Common Box Games | Hours | Mon–Thu 12:00–20:00, Fri–Sat 11:00–21:00, Sun 11:00–18:00 | https://common-box-games.wheree.com/ |
| Capital City Cards & Collectibles | Phone | (780) 488-7586 | https://urbanedmonton.ca/listing/capital-city-cards-collectibles/ |
| Dave's Card Shop | Phone | (587) 982-8918 | https://www.hobbynext.ca/stores/daves-card-shop/ |
| The Card Goat | Phone | (780) 499-2454 | https://thecardgoat.ca/ |
| Anime Hypercubed | Hours | Mon–Fri 11:00–18:00, Sat 11:00–17:00, Sun closed | https://camrose.cdncompanies.com/other/anime-hypercubed-camrose/ |
| Georges II | Phone | (780) 467-1621 | https://www.yelp.ca/biz/georges-ii-sherwood-park |
| King Arthur's Collectibles | Phone | (403) 795-6683 | https://yably.ca/reviews/lethbridge/king-arthurs-collectibles-304-13th-street-north |
| King Arthur's Collectibles | Hours | Tue–Sat 11:30–17:30 (closed Sun/Mon) | https://yably.ca/reviews/lethbridge/king-arthurs-collectibles-304-13th-street-north |
| Comic Readers (Medicine Hat) | Phone | (403) 528-9474 | https://www.yellowpages.ca/bus/Alberta/Medicine-Hat/Comic-Readers/7502309.html |
| Comic Readers (Medicine Hat) | Hours | Mon–Fri 11:00–19:00, Sat 11:00–18:00, Sun 12:00–17:00 | https://www.yellowpages.ca/bus/Alberta/Medicine-Hat/Comic-Readers/7502309.html |
| The Cardboard Casket | Website | https://thecardboardcasket.ca/ (currently only a FB-group URL is stored) | https://thecardboardcasket.ca/contact-us/ |
| The Cardboard Casket | Phone | (403) 796-4822 | https://mufc.ca/the-cardboard-casket-4061851176561828656/ |
| Bingham's Sports Cards | Hours | Mon–Sat 9:30–17:30, Sun/Holidays 12:00–17:00 | https://centrevillagemall.ca/store-directory/ |
| Wonderland Games | Website | https://www.wonderlandgames.com/ (none stored) | https://www.wonderlandgames.com/ |
| Wonderland Games | Phone | (780) 532-1963 | https://wonderland-games.wheree.com/ |
| All In Sports Den | Social | Instagram @allinsportsden / FB facebook.com/YMMSportsDen (now branded "All-In Sports Den / The Music Room YMM") | https://www.instagram.com/allinsportsden/ |

### 3b. The 19 coordinate-less rows (from `sheet-cleanup.md`)

Coordinates below were geocoded from the confirmed street address via OpenStreetMap
(Nominatim) — approximate but good enough to place the pin. Address/phone/hours are from the
cited live sources.

| Store | Field | New value | Source URL |
|-------|-------|-----------|------------|
| **Cold Lake Sports Cards** (priority) | — | **Could not locate.** No street address, website, or current listing found anywhere online. Only appears in the sheet. Recommend using its existing phone number to confirm address before mapping. | (no live source found) |
| Al's Sports Quest | Address | 3-4164 Kepler St, Whitecourt, AB T7S 0A3 | https://www.yellowpages.ca/bus/Alberta/Whitecourt/Al-s-Sports-Quest-Equipment-Apparel/6466768.html |
| Al's Sports Quest | Coordinates | 54.1292, -115.6673 | https://nominatim.openstreetmap.org/ (geocode of address) |
| Al's Sports Quest | Phone | (780) 778-5103 | https://www.yellowpages.ca/bus/Alberta/Whitecourt/Al-s-Sports-Quest-Equipment-Apparel/6466768.html |
| D&C's Collectibles | Address | 4-4439 52 Ave, Whitecourt, AB | https://www.yellowpages.ca/bus/Alberta/Whitecourt/D-C-s-Collectibles/102713722.html |
| D&C's Collectibles | Coordinates | 54.1421, -115.6724 | https://nominatim.openstreetmap.org/ (geocode of address) |
| D&C's Collectibles | Phone | (780) 779-5019 | https://www.whitecourtchamber.com/members/listing/dcs-collectibles/ |
| Hockey Central Sports Memorabilia Inc | Address | 203-5227 Lakeshore Dr, Sylvan Lake, AB T4S 1Y8 | https://www.alberta-local.ca/biz/4616/hockey-central-sports-memorabilia-inc |
| Hockey Central Sports Memorabilia Inc | Coordinates | 52.3100, -114.1027 | https://nominatim.openstreetmap.org/ (geocode of address) |
| Hockey Central Sports Memorabilia Inc | Phone | (403) 858-1100 | https://www.alberta-local.ca/biz/4616/hockey-central-sports-memorabilia-inc |
| Stettler Game Corner | Address | 4940 50 St, Stettler, AB T0C 2L2 | https://fabtcg.com/locator/stettler-game-corner/ |
| Stettler Game Corner | Coordinates | 52.3258, -112.7056 | https://nominatim.openstreetmap.org/ (geocode of address) |
| THE FORT Gaming & Collectibles | Address | 2-10303 100 Ave, Fort Saskatchewan, AB T8L 1Y9 | https://directory.fortsask.ca/Home/View/the-fort-gaming-and-collectibles |
| THE FORT Gaming & Collectibles | Coordinates | 53.7127, -113.2119 | https://nominatim.openstreetmap.org/ (geocode of address) |
| THE FORT Gaming & Collectibles | Phone | (780) 589-3678 | https://directory.fortsask.ca/Home/View/the-fort-gaming-and-collectibles |
| One Man's Treasure | Address | 4912 50 Ave, Stony Plain, AB T7Z 1S9 | https://www.yelp.ca/biz/one-mans-treasure-stony-plain |
| One Man's Treasure | Coordinates | 53.5295, -114.0058 | https://nominatim.openstreetmap.org/ (geocode; matched the POI) |
| One Man's Treasure | Phone | (780) 963-7776 | https://www.facebook.com/onemanstreasurestonyplain/ |
| Wizard's Loft | Address | 110-5201 54 Ave, Red Deer, AB T4N 5K5 | https://www.yellowpages.ca/bus/Alberta/Red-Deer/Wizards-Loft/102461951.html |
| Wizard's Loft | Coordinates | 52.2718, -113.8188 | https://nominatim.openstreetmap.org/ (geocode of address) |
| Wizard's Loft | Phone | (403) 986-3706 | https://locator.wizards.com/store/9051 |
| Tailgate Mercantile Co. | Address | 2-21 Elizabeth St, Okotoks, AB T1S 2C1 | https://www.yelp.ca/biz/tailgate-mercantile-okotoks |
| Tailgate Mercantile Co. | Coordinates | 50.7257, -113.9785 | https://nominatim.openstreetmap.org/ (geocode of address) |
| Tailgate Mercantile Co. | Phone | (403) 995-0812 | https://www.yelp.ca/biz/tailgate-mercantile-okotoks |
| Yellow Shirt Relics | Phone | (403) 307-3244 (Sylvan Lake; exact street not published online) | https://yellowshirtrelics.com/contact/ |
| Level X Cards and Collectibles | Contact | Grande Prairie; levelxcards@outlook.com / https://levelxcards.com/ (no street address published) | https://www.facebook.com/levelxcards/ |

**Data-quality flags among the 19 (recommend NOT mapping as card shops without a second look):**

- **DJS Sportscards, Comics & Collectibles** — appears to be a **duplicate** of the already-mapped "D J's Sports Cards Comics" (5560 45 St, Red Deer; djsgaming.ca). Source: https://www.djsgaming.ca/
- **WAYNE'S SPORTS CARDS AND COLLECTIBLES** — **duplicate** of the already-mapped "Wayne's Sports Cards & Collectibles" (17020 90 Ave NW, Edmonton). Source: http://www.waynessportscards.com/
- **West's Sports Cards & Collectibles** — **duplicate** of the already-mapped "West's Sports Cards" (7910 118 Ave NW, Edmonton). Source: https://www.westssportscards.com/
- **The Mill Store - Okotoks** — is a **tack & feed / equestrian store**, not a card shop. Likely a false positive. Source: https://www.yelp.ca/biz/the-mill-store-okotoks
- **Whitecourt Collectors Corner** — a **Facebook buy/sell group**, not a storefront. Source: https://www.facebook.com/groups/524484261054738/
- **One Piece TCG Edson AB** — a Facebook page/group, not a confirmed storefront. Source: https://www.facebook.com/groups/1571619033288002/
- **Jesse Johnston · Edson Buy, Sell and Trade** — appears to be an individual/marketplace seller, not a fixed retail location. No storefront found.
- **Calgary Sports Cards** — no distinct store by this exact name found in Calgary; may be a generic/defunct listing.
- **Al's Sports Quest** and **Tailgate Mercantile Co.** are primarily **sporting-goods / sports-apparel** stores (they may carry cards, but aren't card shops); **One Man's Treasure** is a vintage/antique vendor mall that sells cards through vendors. Map with that context if desired.

---

## Notes / not individually re-checked

The following 69-list stores were treated as **presumptively operating** (active website and/or
strong recent review counts) and were not each independently confirmed open: Morrison Trading
Post, Snap! Collectables, Treasure Cove, Andys Sports Cards, Celly Sports & Games, Collectors
Books & Cards, Eastridge, Olympic Sports Cards, Sentry Box Cards, Battle River Sports, Quantum
Comics, Retro, The Data Base Camrose, 203 Collectibles, Capital City Sports Cards, Eclipse
Games, Froggers, Icons and Heroes, Prisma Games, Galactic Trading Post, Tactical Magic Games,
Strange Ideas Comics, Toyz Game Emporium, Evolution Sports Excellence, The Hobby Spot Leduc,
Pirates Cove, Showcase Comics, The Vault Sports Cards, Babs Gaming, Border City Games, Avalon
Hobbies, Games Galore, Collectible Card Caddy, D J's Sports Cards, Holmestead, ENV Collectible,
Sports Closet (both locations), Hyperspace Comics, Paradise Games, Mission: Fun & Games,
ThunderGround Comics, Holler Collectibles, CamroseNextGen Gaming, Wayne's Sports Cards, West's
Sports Cards.

**Verified operating during this audit:** Bingham's Sports Cards, Georges II, King Arthur's
Collectibles, Comic Readers (Medicine Hat), The Cardboard Casket, Anime Hypercubed, All In
Sports Den, Maple Leaf Sports (its stored "2400 Centre St NE #4" is correct — Yelp's "2404" is
a variant), Taps Games, Common Box Games, Capital City Cards, Dave's Card Shop, Overtime Sports
Cards, Lakeland Sports Cards, The Card Goat.

**Could not check (no usable live source):** Cold Lake Sports Cards (priority row — no web
footprint at all beyond the sheet), Calgary Sports Cards, and the exact street addresses for
Yellow Shirt Relics and Level X Cards (both publish only city + phone/email).
