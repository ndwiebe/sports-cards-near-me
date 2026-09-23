# Disclosure copy audit — PLAN.md gate G3

_Status: audit + launch-day draft. No live page is touched by this document._

**Plain-English summary:** "Gate G3" is the checklist item in `PLAN.md` that says the site's
public wording about advertising has to be accurate before we sell anything. This document
checks that today, and drafts the wording we'll need the day a Featured slot (a paid, clearly
labelled box next to the free listings — see `featured-pricing-and-order-form.md`) actually
goes live.

## Headline finding: G3 already shipped

`PLAN.md` lists G3 ("Disclosure audit") without the ✅ that G2 carries, which reads as still
open. It isn't. Nathan fixed this himself on **2026-07-31**, commit `7203a625f`
("G3: stop claiming money can never touch this site") — six months before this task was
assigned. That commit's own message records: *"Clean build, 1305 pages; all six old strings
absent from dist, all six new ones present. 191 unit + 85 e2e green."* It rewrote the two
absolute claims PLAN.md's G3 description quotes verbatim — *"does not run advertising"* and
*"no arrangement under which they could"* — on About, Privacy, the city pages, the Alberta
guide, and `llms.txt`.

**Recommendation (not done by this agent):** ask Nathan to add a ✅ to G3 in `PLAN.md`, the
same way G2 already carries one. `PLAN.md` is a shared file other parallel agents (titles/SEO,
shows, sheet automation) also read — editing a shared gate marker unilaterally, mid-way through
three other agents' sessions, is exactly the kind of collision `CLAUDE.md`'s multi-session rule
warns about, so this is flagged for Nathan rather than done here.

## Fresh audit, run today (2026-09-23)

Grepped the whole `src/` tree (`.astro`, `.ts`) for `does not run advertising`, `no arrangement`,
and more broadly for every remaining mention of `advertis`, `arrangement`, `pay to`, `paid to`,
`nobody pays`, and `sponsor`. Full result below; **none of it makes the false claim**.

### About page (`src/pages/about.astro`)

| Line | Current text | Verdict |
|---|---|---|
| 57–59 (FAQ: "Can a shop pay to rank higher?") | *"No, and that is a permanent rule rather than a description of today. ... What may be sold later is a Featured slot — a clearly-labelled paid box that sits beside the ranked list without changing its order. None are sold today."* | Accurate today and after launch. Feeds the FAQPage structured data automatically (the FAQ array is reused for JSON-LD), so the fix already covers structured data for this page. |
| 187–192 (Independence section) | *"Being listed here is free, and no shop has paid to be listed, to rank higher, or to be described as best. Position in a ranking is not for sale — permanently, not just at the moment. What may be sold later is a Featured slot: a clearly-labelled paid box that sits beside the ranked list and cannot reorder it. Nothing of that kind is running yet, and when it is, it will be marked as a paid advertisement everywhere it appears."* | Accurate today; written to flip to present tense on launch day (see below). |

### Privacy page (`src/pages/privacy.astro`)

| Line | Current text | Verdict |
|---|---|---|
| 33–36 (answer capsule) | *"...does not set cookies, does not run ad networks or ad-tech trackers, does not have user accounts, and does not sell visitor data."* | Accurate and stays true post-launch: a labelled Featured box served by SCNM's own build is not an "ad network" or "ad-tech tracker" (no third-party ad exchange, no retargeting). |
| 41–44 ("What this site does not do") | *"...no ad network, ad-tech tracker or retargeting pixel runs here. If a paid Featured listing appears on a page in future, it will be ordinary content served from this site and clearly labelled as a paid advertisement — not an ad delivered by a third party, and it will not track you."* | Accurate today; written to flip to present tense on launch day. |

### FAQ

There is no separate `/faq/` page — the FAQ live on `about.astro` (table above) and on each
guide/city/store page via `src/lib/seo.ts`'s FAQ builders. None of those builders (`seo.ts:453`,
`:511`, `src/lib/sell.ts:106`, `src/lib/tcg.ts:142`) mention advertising at all — they answer
"does a shop buy collections", unrelated to G3.

### Structured data

The About page's FAQ array feeds `faqPageLd()` directly (no separate structured-data copy to
drift out of sync — confirmed by reading `about.astro`'s own comment at the top of the FAQ
array). No other structured-data builder in `seo.ts` mentions advertising.

### `llms.txt` (`src/pages/llms.txt.ts:36`)

> *"Independent — being listed is free, and no shop can pay to rank, or to be called best. Any
> paid placement is a separate, clearly-labelled slot that never reorders the rankings."*

Already accurate, already fixed in the same 2026-07-31 commit (the commit message lists
`llms.txt` explicitly: *"same distinction, for the AI engines quoting it"*).

### Card and store-detail views

`src/components/StoreCard.astro` and `src/pages/store/[slug]/index.astro` make **no** claim
about advertising at all today — read-only inspection found no "featured ring" or paid-label
UI anywhere in either file. This matches PLAN.md step 5's own note: *"Verify the 'featured
ring' exists before relying on it. It is currently only in a year-old design spec, not in
shipped components."* There is nothing to fix here because there is nothing built yet — this is
what Task 4 (`src/lib/featured.ts`) prepares, unwired, for later.

### Guide pages

`src/pages/guides/card-grading-companies-canada.astro:335` says *"Being listed here is free and
nobody paid to appear"* — accurate, scoped to grading-service listings, not affected by
Featured (Featured never changes who's *listed*, only who gets a separate paid box).

## Launch-day copy (DRAFT — do not use until Nathan flips `FEATURED_PLACEMENTS_ENABLED`)

The four passages above are written in **future tense** on purpose, because nothing is selling
yet. The day a city actually clears the sellability bar and a Featured slot goes live, these
four passages need to flip to present tense. Drafted here so nobody has to improvise disclosure
wording under time pressure on launch day.

**1. `about.astro:187–192` (Independence section)**

> Being listed here is free, and no shop has paid to be listed, to rank higher, or to be
> described as best. Position in a ranking is not for sale — permanently, not just at the
> moment. Some shops now pay for a Featured slot: a clearly-labelled "Paid advertisement" box
> that sits beside the ranked list and cannot reorder it, disclosed with the label and link
> markup defined in `src/lib/featured.ts`. I run other card-hobby projects, which are linked in
> the footer and labelled as mine — none of them affect how shops are ranked on this site.

**2. `about.astro` FAQ ("Can a shop pay to rank higher?")**

> No, and that is a permanent rule rather than a description of today. Rankings are computed
> from public Google ratings and review counts, and no shop can buy a position in them, a
> mention, or the word "best". Being listed is free and always will be. A shop CAN buy a
> Featured slot — a clearly-labelled "Paid advertisement" box beside the ranked list that never
> changes its order. [N] cities currently have a Featured slot sold.

**3. `privacy.astro:33–36` (answer capsule)**

> Sports Cards Near Me does not set cookies, does not run third-party ad networks or ad-tech
> trackers, does not have user accounts, and does not sell visitor data. Paid Featured listings
> are served directly by this site, not by a third-party ad network, and carry no tracking
> beyond the same anonymous button counters described below. Cloudflare processes visit
> statistics and anonymous button counts without visitor profiles. If you submit one of our
> forms or email us, we keep what you send so we can act on it.

**4. `privacy.astro:41–44` ("What this site does not do")**

> No cookies are set by this site. There are no accounts, no logins, and no ad network, ad-tech
> tracker or retargeting pixel runs here. Paid Featured listings are ordinary content served
> from this site, clearly labelled "Paid advertisement", and carry no third-party tracking.
> Nothing you do here is sold, rented, or shared with a data broker, and there is no email list
> to be added to. Fonts are served from this site rather than a font CDN, so loading a page does
> not announce your visit to a third-party font provider.

## One source of truth for the label

The exact label text (`Paid advertisement`) and the outbound-link attribute
(`rel="sponsored noopener"`, per PLAN.md step 6 and Google's outbound-link qualification
guidance) are defined once, as `FEATURED_LABEL` and `FEATURED_LINK_REL` in
`src/lib/featured.ts` (Task 4). This document and the pricing/order-form document both quote
that file rather than hand-typing the string a second time, so a future wording change can't
drift between the library, the disclosure copy, and the pricing terms.

## Competition Bureau basis

Canada's Competition Bureau treats an undisclosed material connection (paying to appear, or
paying for placement) between a business and content that looks organic as potentially
misleading. The standard this site already applies — "Paid advertisement", plain language, no
euphemism ("Promoted", "Sponsored content" etc. deliberately avoided), placed on the item
itself rather than buried in a footnote — matches that guidance directly.
