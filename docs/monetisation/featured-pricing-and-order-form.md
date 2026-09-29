# Featured slot — pricing and order form

**DRAFT — for Nathan to approve. PLAN.md gate G5 ("Commercial terms approved"). Nothing here is
live; no code reads these numbers; no slot can be sold until `FEATURED_PLACEMENTS_ENABLED` is
turned on (Task 4, `src/lib/featured.ts`) AND a city clears the sellability rule below.**

**Plain-English summary:** this is a draft price list and contract-terms sheet for a "Featured
slot" — one paid, clearly-labelled box per city that sits above the free (organic) shop list
but never reorders it. It's a draft because Nathan, not an agent, sets the actual price and
signs off on the legal terms (GST/HST, cancellation, etc. are all things a CPA should personally
approve, not accept from an AI's draft).

## 1. When a city is even allowed to be offered (the sellability rule)

PLAN.md step 9, in one sentence: **"if you cannot show the shop the number, you cannot sell the
slot."** A city is not offered a Featured slot until its own page clears all three:

1. **90 days of Search Console history** (Search Console is Google's free report on what people
   searched to find the site).
2. **100+ appearances in Google search results per month** for that city's page.
3. **20+ outbound taps per month** — someone actually pressing Call or Directions and reaching
   the shop, not just seeing the page.

### Where the six candidate cities actually stand

From `docs/research/2026-09-04-traffic-bar-status.md` (measured 2026-09-04, a 36-day window):

| City | Appearances/month clears 100+? | 90-day mark | Taps |
|---|---|---|---|
| London, ON | Yes (2,241 over the window) | ~late Oct 2026 | site-wide total was 7 taps as of the last count — taps are the binding constraint everywhere, not any one city |
| Toronto, ON | Yes (1,972) | ~late Oct 2026 | same |
| Ottawa, ON | Yes (1,903) | ~late Oct 2026 | same |
| Mississauga, ON | Yes (1,197) | ~late Oct 2026 | same |
| Edmonton, AB | Yes (745) | ~late Oct 2026 | same |
| Markham, ON | Yes (734) | ~late Oct 2026 | same |

**The honest read, unchanged since that research:** the impressions bar is already cleared by
six cities. The 90-day clock and the tap count are what's actually blocking a sale — and taps
were the harder of the two even before this quarter's shop-card redesign (Phase 1a, already
shipped separately) made Call/Directions full-width buttons instead of a plain phone number.
**Re-check the tap count before offering ANY city** — this document sets the price, not the
go/no-go date.

## 2. What's actually for sale

- **One Featured slot per city.** Not a range — PLAN.md step 7 fixed this at exactly one,
  2026-07-31, on purpose: scarcity is the product, and multiple paid shops in one city would
  create an internal paid ordering, which is the one thing this whole plan refuses to sell.
- The slot is a separate box, above the organic (free) list, labelled **"Paid advertisement"**
  with a `rel="sponsored noopener"` link (defined once in `src/lib/featured.ts`) — it never
  changes the order of the free list underneath it.
- v1 is **shops only**, on city pages only (PLAN.md step 4). Shows and resellers are out of
  scope until their own eligible surfaces exist.

## 3. Price options (draft — Nathan picks or amends)

All prices are **before GST/HST** (see section 4) and are per city, per term.

### Option A — Flat monthly rate, one price for every sellable city

**$149/month per city**, no tiers, no discount for buying multiple cities.

*Reasoning:* simplest to explain, sell, and invoice. Doesn't try to price London differently
from Edmonton before there's real click-through data proving one city's slot is worth more than
another's — the traffic-bar research only measures *appearances*, not what a Featured box
actually converts to for the buyer, so pricing by city size today would be guessing at a number
we can't yet defend to a shop owner. Straightforward to raise later with real conversion data
in hand.

### Option B — Founding-city discount for the first cohort

**$99/month per city** for the first 6 cities to clear the sellability rule (the same six
above), locked in for that shop's first 6-month term; **$149/month** for every city after.

*Reasoning:* rewards being first, which matters because the first sale is also the first real
proof point ("here's what a Featured slot in London actually did") that makes every later sale
easier. Costs revenue on the first 6 slots in exchange for faster initial adoption and word of
mouth among shop owners, who talk to each other.

### Option C — Two tiers by city traffic

**Tier 1 (Toronto, Ottawa — the two biggest by appearances): $199/month.** **Tier 2 (everyone
else that clears the bar): $99/month.**

*Reasoning:* prices for what's actually different between cities (audience size), rather than
one flat number. Riskier to defend without click-through data specific to the paid box (the
appearances number measures the free listing's visibility, not the Featured box's) — a shop
owner in Toronto could reasonably ask "why does that cost twice as much" and today's honest
answer is "more people see the page," not "more people click Featured," which is a weaker pitch.

**Recommendation if Nathan wants one:** Option B. It's honest about the newness of the offer
(discount = "we're new at this too"), doesn't require defending a size-based price difference
before there's data to back it, and creates urgency for the first six shops without permanently
underpricing the product.

## 4. Taxes — GST/HST

Nathan is a CPA; this section states the mechanics plainly rather than telling him how to do his
own job.

- Whoever is the seller of record (see section 5) needs to confirm their own GST/HST
  registration status and collect at the applicable rate for the buyer's province before the
  first invoice goes out — this is not optional once total revenue (across all of Nathan's
  applicable businesses, not just SCNM) crosses the small-supplier threshold, and may already
  apply depending on what else is registered under the same CRA business number.
  A monthly $99–199 recurring charge is straightforward to add to an existing HST filing if one
  already exists (e.g. via Slab Savvy CPA); if none exists yet, that's a registration decision
  for Nathan, not something this draft resolves.
- Each invoice states the price, the applicable GST/HST amount and rate, and the total,
  separately — never a single bundled number.
- Barter (PLAN.md step 13) is out of scope for Featured specifically — that rule was written for
  services engagements, and Featured is priced in cash only in this draft, capped at whatever
  Nathan decides if he later wants to extend the barter option here too.

## 5. Order-form terms (draft — every line needs Nathan's sign-off before use)

| Term | Draft position |
|---|---|
| **Seller of record** | Nathan Wiebe, operating as [Slab Savvy CPA or a separate trade name — Nathan's call; PLAN.md's G1 already settled that "Slab Savvy CPA" is Nathan's accepted brand for non-accounting services]. Not SCNM as an entity — SCNM has none. |
| **Term** | 1 month, auto-renewing, unless the shop opts for a longer initial term at the same per-month rate (no discount for prepaying multiple months in this draft — keeps cash flow monthly and cancellation simple). |
| **Renewal** | Automatic at the then-current rate, with email notice at least 7 days before each renewal charge. |
| **Cancellation** | Shop can cancel any time, effective at the end of the current paid month — no mid-month proration, no refund for the current month, but no further charge after cancellation is confirmed in writing. |
| **Refunds** | No refund once a month's slot has started running, except: (a) SCNM fails to display the slot at all for more than 48 continuous hours due to a build or site fault (pro-rated refund for the downtime), or (b) content rejection after payment (see below) — refund in full if SCNM can't fix and re-run the accepted content within 5 business days. |
| **Chargebacks** | A chargeback while the slot is actively running results in immediate removal of the Featured box (organic listing is never affected) and the shop is barred from re-purchasing until the disputed amount is resolved. |
| **Content rejection / removal rights** | SCNM can reject or remove Featured content that: makes a claim the shop can't support, violates the site's absence-of-data standard (see the publishing-standards vault note), or otherwise conflicts with the editorial-independence policy. Rejection before the term starts = no charge. Removal mid-term for a rule violation = no refund for that month, same as a voluntary cancellation. |
| **Performance disclaimer** | Featured buys **visibility** — placement in a labelled, separate box — not any guaranteed number of clicks, taps, calls, or sales. No promise of outcome is made in the order form or in any sales conversation. |
| **Make-goods** | If a build failure or bug hides the slot for part of its paid period (see PLAN.md step 15's monitor-expiry requirement), the shop gets the missed days added to the end of the current term, or a pro-rated refund — shop's choice. |

## 6. Known gap to close before real money changes hands

`src/lib/featured.ts` (Task 4) keys placements to a store's **slug**, per this task's literal
spec. PLAN.md step 3 explicitly warns against this: slugs are generated from `name + city` and
de-duplicated by row order, so a rename, a row reorder, or a duplicate-removal pass can silently
reassign which business a slug points to — meaning an active, PAID placement could silently
repoint to a different shop after a routine sheet edit. This draft pricing document is safe to
approve as-is (no money moves yet), but **the immutable store-ID column (PLAN.md step 3) should
land before the first slot is actually sold**, not after. Flagged here rather than fixed
silently, since adding that column is a data-lane change (the Google Sheet + `stores-build.ts`)
outside this task's scope.
