# Capital City Sports Cards — online-only, and Verified Reseller application #1

**2026-08-28.** For Nathan, not for the site. This is a research/decision note — nothing
here is page copy, and the reseller network still has zero members. Do not market this on
the store page.

## What happened to the shop

Capital City Sports Cards (slug `capital-city-sports-cards-edmonton`, Edmonton, 4.5★/46
reviews) closed its physical storefront after a series of break-ins. It moved its inventory
online rather than closing outright, and its online store —
`https://capitalcitysportscards.company.site` — is **verified live (HTTP 200)** as of
2026-08-28.

Google's Places data never flagged this business as `CLOSED_PERMANENTLY`, so it was **not**
among the 29 shops already marked closed on 2026-08-28 (`16bdcd35`). Nothing in the existing
closure-detection pipeline (`refresh-ratings.py`) would have caught it — a moved-online shop
still answers as open to Google, correctly, since it hasn't shut down.

⚠️ **Do not confuse this shop with `capital-city-cards-collectibles-edmonton`.** Similar
name, different business, still operating a physical location. Both exist in the sheet;
only the Sports Cards one is affected by this note.

## The site fix (this workstream)

Implemented in this branch: a new `Store.status` value, `'online-only'`, distinct from
`'closed'`. Same mechanism as the closed-shop handling shipped 2026-08-28 — the shop's
record moves from `stores.json` into `stores-closed.json` at bake time, so it drops out of
every listing, count, map and guide with no code change at those ~31 call sites, and out of
the sitemap (which already builds its exclusion set from `stores-closed.json`). Its own page
survives, `noindex`ed, with no `Store` JSON-LD (that schema asserts a walk-in address, which
would no longer be true) — but unlike a closed shop, the page keeps the star rating visible
(it's still a real, reviewed business) and says "no longer a walk-in storefront — now online
only," never "permanently closed."

## What still needs to happen (post-merge, sheet-side — NOT done here)

This workstream is code only. The actual data change is a Google Sheet edit, and is
explicitly out of scope for this branch:

1. **Sheet column M (`Status`)** on the Capital City Sports Cards row needs the value
   `online-only`.
2. **The Website cell needs fixing.** It currently holds
   `https://www.facebook.com/groups/577619796765695/` — a Facebook *group* URL, not the
   shop's actual storefront. It should be updated to
   `https://capitalcitysportscards.company.site` so the new online-only banner on the store
   page links somewhere a buyer can actually check out, not a group wall.

Both are one sheet write for the orchestrator; `bake-stores.ts` picks them up on the next
bake with no further code change needed.

## Why this is Verified Reseller application #1

This shop is also the first real candidate for the site's Verified Reseller program
(`/resellers/`, see `src/pages/resellers/index.astro`) — a program that currently has **zero**
members and exists today only as a "coming soon, applications open" page. Capital City is a
plausible first applicant: a known, previously-verified, actively-reviewed business (46
reviews, 4.5★) that genuinely sells online with no walk-in location — exactly the shape the
Verified Reseller page describes wanting.

This is **Nathan's call, not a code decision**, and nothing about it should appear on the
store page or anywhere else on the site until he's made it. Flagging it here so it isn't
lost, not acting on it.

## Verification performed for this note

- Confirmed `https://capitalcitysportscards.company.site` returns HTTP 200 (live).
- Confirmed the shop's current sheet-derived record in `src/data/stores.json` has no
  `status` field (reads as open today, correctly, since Google hasn't flagged it).
- Confirmed the shop is distinct from `capital-city-cards-collectibles-edmonton` by slug,
  address, and business name — not the same listing under two slugs.
