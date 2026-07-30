# The 10 "missing" shows: browser re-check — RESOLVED

Date: 2026-07-29. Method: `dev-browser --connect` (real Chrome), which the previous
text-only pass correctly predicted would do better against Canva/Wix/Elementor sites.

## Verdict: the earlier exclusions were CORRECT. Do not re-research these.

Every one of the 10 shows excluded on 2026-07-28 was re-checked against the
organiser's own site or ticketing channel. **None has an announced future date.**
They were excluded for the right reason, and this pass confirms it with a primary
source rather than a crawl failure.

| Show | Last known date | Primary-source status |
|---|---|---|
| Collectors Clash (Vaughan/Woodbridge) | 2026-02-07 | Eventbrite organiser page: **"Upcoming — Nothing planned right now"** |
| PegSpo (Winnipeg) | 2026-03-07 | pegspo.com: **"already working on PegSpo 2027 … date announcement coming"** — explicitly unannounced |
| GTA Card Show (Markham) | 2026-02-07/08 | past only |
| The Collectors Supershow (Mississauga) | 2026-02-13/15 | past only |
| Kernel Mustard's Emporium (Perth) | 2026-03-14 | past only |
| NXT Gen Memorabilia (Concord) | 2026-03-15 | past only ("inaugural") |
| Hat Trick Heroes x Artifacts Alley (Winnipeg) | 2026-03-14/15 | past only |
| National Collective Convention (Abbotsford) | 2026-03-28/29 | past only |
| Card Yard Collectibles Expo (Oakville) | 2026-04-18 | past only |
| True North Card Expo (Markham) | 2026-05-30/31 | past only |

## What the browser pass DID unlock

**Capital Trade Shows published a full 2027 schedule** — 20 new shows added
(12 Card & Comic, 8 Pokémon), all sourced to `capitaltradeshows.ca/schedule`.
The schedule is a **JPEG on a Wix page**, invisible to every text-based tool;
it was read visually. All 22 dates verified against the calendar: every
single-day show is a Sunday, and both "Curling Rink" entries are exactly
Saturday+Sunday. Zero transcription errors.

## Data-quality findings

- **GRADEx has a wrong date.** `gradexmedia.com/shows/` lists the Capital Pokemon
  Show as "Sunday, Nov. 12, 2026". **Nov 12 2026 is a Thursday.** The organiser's
  own schedule says **Nov 22** (a Sunday), which is what our data already had.
  Our row was right; the aggregator is wrong. GRADEx is otherwise stale — nearly
  every other entry on it is now in the past.
- **10 existing Capital Trade Shows rows still cite `gradexmedia.com` as `sourceUrl`**
  despite `capitaltradeshows.ca/schedule` being the primary source, and despite
  GRADEx being demonstrably wrong on one of those dates. Worth re-pointing. Not
  changed in this pass (out of scope).
- **Bossa Productions' own site contradicts itself.** The Metro Vancouver Card Show
  detail page says **Aug 29–30**; the homepage promo poster for the same show says
  **Aug 22–23**; a second poster says **Sept 5–6**. All three are valid Sat/Sun pairs,
  so the calendar cannot arbitrate. Their Showpass organiser page has **zero bookable
  events**, and every future-dated ticket button on the site links to the generic
  organiser page rather than a real event — i.e. placeholders. **All Bossa dates held.**
  Resolve via @bossa.sports on Instagram before publishing any of them.

## Still unresolved

- **Saskatoon Sportscard & Collectible Show** — the dates page cited in the sheet
  (`thecentremall.com/events/the-centre-sportscard-collectible-show-dates`) now
  renders with **no event content at all**: no dates, no images. Needs a new source.
- **Manitoba Sports Card and Collectibles Show** — only source is a Facebook event,
  which is login-walled per `RESEARCH-TOOLING-NOTES.md`. Unverifiable by policy.
- Both, plus PegSpo, sit in the Shows sheet with an **empty Start Date** and are
  silently skipped by `bake:shows` (3 rows skipped, logged as a warning). That is
  correct behaviour — it is the "never publish a date you can't attribute" rule
  working — but the rows are invisible unless you read the bake log.

## Tooling note to add to RESEARCH-TOOLING-NOTES.md

Organiser schedules are frequently **images** (Wix/Canva/Elementor). `defuddle`,
WebFetch and Firecrawl all return the surrounding page text and miss the schedule
entirely — a silent false negative that looks like "no dates published". Download
the image and read it. Both wins in this pass (Capital 2027, and catching Bossa's
self-contradiction) came from reading JPEGs, not HTML.
