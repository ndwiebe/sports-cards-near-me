# Click tracking — what the number is, and how to read it

`worker/click-tracker.js` has been counting taps on "Get Directions" and "Call" on each
shop's listing page since **2026-08-28**. This is the counter start date, not the start of
a city page's Search Console history. PLAN.md requires 90 days of history for the city
page, roughly 100+ impressions and 20+ outbound listing clicks per month. The present
store totals do not establish which city page generated a tap and do not clear that gate.

## What it counts

One anonymous counter per store, per method, per calendar month (UTC), stored in
Cloudflare KV under a key shaped `clicks:{storeSlug}:{directions|call}:{YYYY-MM}`. It
increments via `navigator.sendBeacon` from the store page — no cookies, no visitor
identity, nothing that needed a consent banner.

**It counts a tap. It does not count a person, and it never counts a sale.**

- One visitor tapping "Get Directions" twice (e.g. Maps didn't open the first time)
  counts as two. There is no dedup, by design — nothing to dedup against, since nothing
  identifies the visitor.
- A tap on "Call" means the phone dialer opened. It does not mean the call connected, was
  answered, or led to a purchase.
- A tap on "Get Directions" means Maps opened. It does not mean the visitor's car actually
  went there.

Read it as **intent signal**, not **traffic delivered**, and never as **revenue
delivered**. "We sent 14 taps toward you last month" is an honest sentence. "We sent you
14 customers" is not — don't let it get shortened to that in a pitch.

## Accuracy limits verified September 8

The Worker reads a KV value, adds one, then writes the replacement. Two requests can
read the same old value and overwrite each other. A local reproduction with ten
concurrent accepted requests stored only one increment. No production requests were
sent. This proves a possible undercount, not the amount lost in production.

Cloudflare documents [eventual consistency and the absence of atomic KV operations](https://developers.cloudflare.com/kv/concepts/how-kv-works/).
Treat these totals as approximate recorded taps. The existing sequential unit test
only verifies sequential behavior. Fix the storage model before using counts as a
commercial performance measure.

Origin checks and User-Agent filtering exclude common automated traffic, but do not
prove a human click. Forged requests, repeated taps and failed beacon delivery remain
possible. The tracker also accepts localhost requests. Do not test against the live
counter, because a test can contaminate totals.

## The caveat that matters most

A shop owner cannot independently verify this number. There's no dashboard on their end,
no call log they can cross-reference, no way to check our count against their own
records short of trusting us. The site's entire value proposition to a shop rests on this
number being honest, so it is worth being conservative in how it's described: present it
as "taps recorded," with the caveats above stated up front, not polished into a stronger
claim than the data supports.

## How to run the report

```bash
python3 scripts/click-report.py
```

Requires the `wrangler` CLI, already logged in (`npx wrangler whoami` to check — if it's
not, the report will tell you exactly what to run). It:

- reads the click counters straight from Cloudflare KV (nothing cached, nothing
  estimated — if it can't authenticate or a value doesn't parse, it fails loudly instead
  of printing a guess),
- resolves each store slug against `src/data/stores.json` for a name and city — a slug
  with no match prints flagged as an orphan rather than silently vanishing, since slugs
  are `name + city` and get reassigned when a row is renamed or reordered in the sheet,
- prints a per-shop, per-month table (directions and call shown separately as well as
  combined, sorted by combined clicks descending) plus site-wide monthly totals,
- writes the same data to `docs/research/click-report-YYYY-MM-DD.csv`.

A month with genuinely zero taps prints as "no clicks recorded," never as a bare `0` —
those look identical as a number but mean different things (checked-and-found-nothing vs.
never-checked), and this report only ever prints the former.

## Where this can't answer the question

This has no GA4-style event breakdown, no per-page traffic context, no way to tell a
"quiet month" from "the button/beacon silently broke." If a month's totals look
implausibly low against known site traffic, check that `PUBLIC_CLICK_TRACKER_URL` is
still wired into the production build (see `CLAUDE.md`'s note on `site.yml` needing its
own sync to `main` — this exact class of bug has already caused this pipeline to record
nothing for a period once) before concluding it was a quiet month.

## Required attribution work

Keep destination store totals distinct from source page totals. A store in Edmonton
receiving a tap does not establish an Edmonton city page referral.

1. Fix concurrent counting first with serialized increments or separate event records.
2. Define separate events for internal listing navigation and actual outbound website,
   directions and call selections. Internal navigation must not count as outbound traffic.
3. Carry only an allowlisted city page identifier for the immediately preceding city
   navigation. Discard query strings, fragments and external referrers. Do not infer a
   source city from the shop address or invent attribution for direct search arrivals.
4. Add separate reporting for attributed and unattributed actions. Retain historical
   counter totals as approximate legacy data, without backfilling missing attribution.
5. Verify concurrent updates, malformed input, bot filtering, direct arrivals and
   ordinary navigation. Update the disclosure with the exact fields before deployment.

No new tracking fields or storage resources were deployed during this review. The
existing workflow deploys the Worker independently from the site, so both releases
need verification when the implementation changes.
