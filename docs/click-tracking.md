# Click tracking — what the number is, and how to read it

`worker/click-tracker.js` has been counting taps on "Get Directions" and "Call" on each
shop's listing page since **2026-08-28**. That date is the start of the 90-day window the
plan needs banked before the number goes into a shop owner's pitch ("we sent you 14
people last month"), so it runs out in late November.

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
