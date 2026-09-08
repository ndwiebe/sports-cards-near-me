# SCNM review resolution, September 8, 2026

## Calendar

Applied to the source Shows sheet, read back, then baked: 215 valid events, up from 204.
Fourteen additions are recorded in `2026-09-08-calendar-additions.csv`. CardFesta's existing
row now spans September 19–20. Removed three Toronto Expo daily duplicates (November 6–8)
already covered by the November 5–8 event. Old public URLs have explicit redirects.
The earlier September 5 handoff's CardFesta venue conflict was not present in the actual sheet.

Primary CardFesta sources:
- https://www.cardfesta.com/upcoming-events
- https://bramaleacitycentre.ca/events/bramalea-city-centre-cardfesta-weekend-takeover/
Toronto dates: https://sportcardexpotoronto.com/

New-event CSV records an organizer source and independent TCDB listing per event. Organizer
venue announcements superseded stale TCDB addresses for Chonky (Lipont Place) and Coastal
(Croatian Cultural Centre). Saskatchewan's September 27 row and VanCity's October 3–4 rows
were already covered by existing multi-day events. The September 5–6 CardFesta booking was
past by this review. Scraped CHANGED rows were not applied wholesale: formatting differences,
separate promoters on the same date and day-specific hours do not establish corrections.

Refresh comparison now matches province, city, date interval and event identity. It omits
covered later days, flags ambiguous identities and adjacent new days for review, and no longer
renames unrelated shows from the most common promoter at their venue. Ten regression tests
run with `python3 scripts/test_refresh_shows.py`. The scraper remains a review tool, never an
automatic sheet publisher. TCDB's empty province responses do not replace organizer research.

## Existing shop identities

- Cartoon Kingdom and Cedar Creek Hobbies share 3160 Dougall Avenue and are a merged business.
  Retain one row named Cartoon Kingdom & Cedar Creek Hobbies, with the existing Cartoon
  Kingdom rating/review count (do not sum two review profiles). Preserve the Cedar Creek
  Pokemon/Magic/Other categories on the survivor. Both old URLs redirect to the combined listing.
  Sources: https://www.cartoonkingdom.ca/pages/location and
  https://windsorite.ca/lifestyle/now-open-new-location-for-cartoon-kingdom-and-cedar-creek-hobbies/
  Current categories corroborated at https://www.cartoonkingdom.ca/ .
- Le Roi des Cartes Valleyfield now uses TCG and Games Valleyfield. The old domain redirects
  to https://tcgandgames.com/ , which identifies the same address, 1175 Bd Monseigneur-Langlois,
  and phone. Independent address corroboration:
  https://www.hobbynext.ca/stores/le-roi-des-cartes-valleyfield/ . Rename and update the website,
  with a redirect for the previous listing URL. Do not infer a new location from the new brand.
- Retro Boyz remains Retro Boyz Collectibles on https://longlivethehunt.com/ and its contact
  page. Long Live The Hunt is its domain/tagline, insufficient evidence for a rename.

## Indexing alert resolution

Live HTTP checks of all 15 previously reported noindex/404 examples agree with the source:
- Six 404 category pages (pokemon/amos, sell/morinville, pokemon/summerside,
  pokemon/beloeil, pokemon/penticton, pokemon/val-d-or) no longer have qualifying stores.
- Six noindex pages are deliberate redirect stubs: Much Hobby, F.G. Bradley's, George's
  Trains, Hallmark, D.C.'s duplicate and West's old name.
- Three noindex pages are closed shops: Muskoka Cards, Nutts Collectables and EM Cards.

All 15 are absent from the built sitemap. Keep their intended behavior. A redirect stub on
GitHub Pages returns HTTP 200 with a meta refresh; do not report it as an HTTP 301.

## Reconciled priorities

City enrichment, 385 logos and the Node 24 action runtime fix were already shipped September 5.
Do not reopen them from the stale September 4 handoff. About/Privacy already distinguish
future paid Featured content from ad networks; the full paid-placement surface audit remains
a launch gate when those surfaces exist.

PLAN.md is authoritative for sponsorship evidence: 90 days of Search Console history for
the city page, roughly 100+ impressions and 20+ outbound listing clicks per month. The later
300-pageview/10-referral/90-counter-day formulation was not the approved PLAN threshold.
Store call/directions counts are not source-city attribution, website referral counts, product
signups or paid conversions. No sponsorship should be sold from sitewide search-click totals.

Outreach remains paused. Cloudflare dashboard verification was blocked by its security
challenge; no fresh referral totals have been claimed. The earlier bulk shop research remains
incomplete beyond the identity decisions above; weak evidence is not a removal instruction.
