# PRD — SCNM traffic & clicks: SEO + GEO to top-5

> ## AMENDMENT 1 — 2026-08-07, after the full Search Console export
>
> The PRD below was written on **top-10-only data**. The full export (1,000
> queries, 768 pages, daily chart) arrived hours after approval and corrects
> three things. **Sections 1c and 3 are superseded by this amendment; everything
> else stands.** Raw data: `docs/research/gsc-export-2026-08-07/`. Full reading:
> `jarvis-memory/06-SportsCardsNearMe/2026-08-07-gsc-full-export-read.md`.
>
> ### 1. The baseline was wrong, and traffic fell 81%
>
> "~10,400 impressions/week" was a **nine-day total** (Jul 28 – Aug 5) misread as
> a rate, and those nine days were a spike, not a plateau: 3,139 impressions on
> Aug 1, then 626 / 550 / 587. **Settled rate: 588/day ≈ 4,114/week, 42 clicks/week,
> CTR 1.02%.** Average position *improved* right through the fall (18.3 → 9.4),
> which reads as new-site discovery narrowing rather than a demotion — but it is a
> different starting line, and §1c's arithmetic assumed the phantom number.
>
> ### 2. Revised targets (replaces §1c)
>
> | Metric | Today | Sep 15 | **Nov 5** |
> |---|---|---|---|
> | Impressions/week | 4,114 | 5,500 | **8,000** |
> | Blended CTR | 1.02% | 1.4% | **1.8%** |
> | Clicks/week | 42 | 77 | **145** |
> | Avg position | 9.4 | 8.5 | **≤ 7.5** |
>
> **Impressions is now the primary metric**, because clicks cannot be the goal
> while the denominator is falling. **145 clicks/week replaces 300** — 300 needed
> ~7% CTR at the real impression rate, which nobody achieves. **1.8% blended
> replaces 2.5%**, for the structural reason in point 3.
>
> ### 3. The CTR ceiling is structural, and it reorders the workstreams
>
> Clicks per page, across all 768 pages — the number that actually matters:
>
> | Type | Pages | Impr/page | **Clicks/page** | CTR | Median position |
> |---|---|---|---|---|---|
> | **provinces** | 8 | 24.6 | **0.62** | 2.54% | 10.2 |
> | **shows** | 21 | 17.3 | **0.48** | 2.75% | 11.8 |
> | guides | 11 | **49.3** | 0.36 | 0.74% | **16.5** |
> | cities | 112 | 14.7 | 0.16 | 1.09% | 9.7 |
> | stores | 534 | 14.0 | 0.07 | 0.48% | 9.2 |
> | pokemon | 32 | 7.1 | 0.06 | 0.88% | 9.7 |
> | sell | 49 | 3.7 | 0.06 | 1.68% | 11.7 |
>
> *Caveat, stated loudly: 79 clicks site-wide over nine days. Every per-type
> figure rests on single-digit click counts. Directional, not precise — and the
> Sep 8 review re-tests all of it.*
>
> **a) Store pages are 76% of striking-distance impressions and convert at 0.34%.**
> The biggest one takes 253 impressions at position 7.4 with **zero** clicks; its
> query is "total sports cards" — the shop's own name, where the shop's own site
> and Google listing outrank us and should. **A large share of the traffic §3
> counted as recoverable is structurally unwinnable.** Store titles still get one
> pass, aimed at the queries a directory *can* win (hours, reviews, still open),
> but they are no longer the CTR story.
>
> **b) Guides need lifting, not multiplying.** Guides earn double the reach per
> page of anything else — and sit at **median position 16.5, which is page two.**
> Writing four more guides adds four more page-two pages. The corrected action is
> to move the guides that already have reach from page 2 to page 1 (internal
> linking, depth, schema), *then* expand. This refines rather than reverses
> Fable's guides-over-shows call: guides remain the reach play and the whole GEO
> bar, but "more guides" was the wrong first move.
>
> **c) Province pages are the cheapest win on the site and nobody has touched
> them.** Eight pages, best clicks-per-page anywhere, already converting at 2.54%
> at position 10.2. Promoted to its own early task.
>
> **d) Demote the sell-side guide** inside Workstream B — sell pages are the
> worst-performing surface on the site (0.06 clicks/page across 49 pages). A guide
> layered over a hub nobody finds inherits the problem.
>
> **e) Reframe Workstream C (shows)** as a differentiation/moat play — genuine, and
> the second-best converter — but *not* justified by current demand volume (364
> impressions across 21 pages).
>
> ### 4. Revised workstream order
>
> **A. Lift what already converts** — province pages (8), then city and show
> titles. Plus the one store-page pass. *(~3–4 Nathan-hours)*
> **B. Get the guides onto page one** — the existing 11, before writing new ones.
> The tax guide still leads the new-guide queue afterward, on E-E-A-T grounds.
> *(~6–8 h)*
> **C. Shows** — unchanged work, honest reframing. *(~6 h)*
> **D. TCG section + domain redirects** — unchanged. *(~4–6 h)*
> **E. French** — unchanged, still gated on Sep 8. The export confirms the signal
> is real but tiny: 22 queries, 95 impressions, 0 clicks. *(~5–7 h if gated in)*
>
> Everything below this line is the approved 2026-08-07 text, unrevised.

---


**Product:** sportscardsnearme.ca — the independent Canadian card-shop directory
**Author:** Claude (directed by Nathan Wiebe) · **Date:** 2026-08-07
**Inputs:** `docs/research/prd-input-brief-2026-08-07.md` (all numbers below trace to it), the 08-07 Search Console read, the 07-23 keyword research, the 07-29 publishing-standards decision, the 08-06 TCG-split decision.
**Data honesty note, applies throughout:** Search Console (Google's free report of which searches showed the site and which got clicked) only let us read the **top 10 rows** of each table this week. Totals are exact; the ~1,000-query long tail is unread. Nothing below extrapolates from rows we didn't see, and every "top 10" claim is labelled as such.

---

## 1. Mission and goals

**Conclusion first: the goal for the next 90 days is to turn impressions we already have into clicks, by moving pages that already rank at the bottom of page one into the top 5, and to become the source AI answer engines cite for Canadian card questions.** Not "more pages." The site already gets shown ~10,000 times a week; it gets clicked 79 times. That gap is the product problem this PRD exists to close.

The business reason for the deadline: Featured placement (the clearly-labelled paid slot that sits *outside* the organic ranking — the only thing SCNM will ever sell on a listing page) cannot honestly be sold until a city page has ~90 days of Search Console history and ~100+ impressions and 20+ outbound clicks per month. Earliest honest sale ≈ **November 2026**. This PRD is the work that makes that bar reachable.

### 1a. Classic-SEO acceptance bar — the named queries

Success is checkable. By **2026-11-05** (day 90), average Google position (as reported by Search Console, Canada) in the **top 5** for:

| Query | Today (top-10 data) | Day-90 target |
|---|---|---|
| card shops near me | ~pos 10–11, 98 impressions | top 5 |
| sports cards near me | 49 impressions | top 5 |
| card stores near me | 39 impressions | top 5 |
| card grading companies canada | page has 207 impressions | top 5 |
| card shows ontario 2026 (+ alberta / québec variants) | québec variant live at 9 impressions | top 5 |
| where to sell sports cards canada | not in readable top-10 rows — honestly unmeasured today | top 10 (stretch: top 5) |
| pokemon card shop toronto | not in readable rows — unmeasured | top 10 |

A caveat worth glossing: "near me" queries return different results depending on where the searcher stands, so Search Console's number is an *average* position across the country. Top-5 average is the target; it will never be top-5 everywhere at once.

### 1b. GEO acceptance bar — the named questions

GEO ("generative engine optimization" — being the source AI assistants cite when they answer a question) gets its own bar because AI answers trigger on *question phrasing*, never "near me" phrasing (a confirmed finding from the 07-23 research). Monthly spot-check in **ChatGPT search, Perplexity, and Google AI Overviews**; success = SCNM cited or linked in **at least 2 of the 3 engines for at least 3 of these 6 questions by day 90**:

1. "What companies grade sports cards in Canada?"
2. "Where can I sell my sports card collection in Canada?"
3. "Are old hockey cards worth anything?"
4. "What card shows are coming up in Ontario in 2026?"
5. "Do I have to pay tax when I sell sports cards in Canada?" *(testable only after the tax guide ships — Workstream B)*
6. "What are the best card shops in Toronto?"

### 1c. Traffic targets with dates

Grounded in the current run rate (impressions went 63 → 10,400 in one week, so ~10K impressions/week is the live baseline; 79 clicks; CTR — click-through rate, the percentage of times being shown turns into a click — 0.8%; average position 10.8). Three weeks of history is thin, so these are stakes in the ground to be re-set at each monthly review, not forecasts:

- **CTR ≥ 1.5% by Sep 15; ≥ 2.5% by Nov 5.** At today's impressions, 2.5% alone is ~250 clicks/week — a 3× improvement with zero new pages.
- **Clicks ≥ 150/week by Sep 30; ≥ 300/week by Nov 5.**
- **Average position ≤ 8 by Oct 15** across the named queries in 1a.
- **Featured gate check:** `/ontario/toronto/` (already at 150 impressions in the readable window) clearing 100+ impressions **and 20+ outbound listing clicks per month** by Nov 1 — the first sellable city.

---

## 2. Where traffic comes from today

**Conclusion: the site is shown plenty and clicked almost never, generic head terms have just started surfacing, and the best-performing page types are the ones we have fewest of.**

The verified numbers (2026-08-07 pull, 3-month window, site effectively 3 weeks old in search):

- **10,400 impressions, 79 clicks, 0.8% CTR, average position 10.8** (bottom of Google's first page), ~1,000 distinct queries. A week earlier: 63 impressions, 26 queries. The site crossed a visibility threshold this week.
- **Generic head terms now surface** — *card shops near me* (98 impressions), *sports cards near me* (49), *card stores near me* (39). A week ago only shop names ranked. Shop names still fill 6 of the top-10 query rows, but they are the low-impression rows (9–88).
- **Shows over-perform per page:** 3 of the top-10 pages come from a pool of only **45 show pages**, against 689 stores and 248 cities. The single best page on the site is a Moncton show two days out (4 clicks, 82 impressions).
- **One national guide beats 248 city pages:** `/guides/card-grading-companies-canada/` has **207 impressions — the most of any page on the site**, with no local angle at all.
- **Provinces beat cities:** `/nova-scotia/` (3 clicks) and `/new-brunswick/` (2 clicks) out-perform every city page except `/ontario/toronto/` (2 clicks, 150 impressions). The other 247 city pages produce very little — which is why this PRD does **not** contain a city-content push.
- **One French query already surfaces** (*card show québec 2026*, 1 click) against **zero French content** and 123 Quebec shops.

What this is *not*: a measured long tail. Everything past row 10 of each table is unread until the measurement fix in §6 lands.

---

## 3. Prioritized workstreams

**Conclusion: five workstreams, ordered by expected clicks per Nathan-hour.** Effort is in Nathan-hours (Claude writes all code and content; Nathan directs, reviews, tests — his calibration: simple 30min–1h, medium 2–4h, large 8–15h), against a budget of ~3–5 hours/week, bursty. The 90-day total below is ~32–44 Nathan-hours, which fits.

**Where this overrules the 08-07 draft order:** the draft ran CTR → shows → guides → Toronto → French. This PRD runs **CTR → guides → shows → TCG-section + redirects → French, with Toronto demoted from a workstream to a single task inside A.** Two disagreements, with reasons:

1. **Guides move above shows.** (a) The goal is top-5 *and* LLM citation, and only guides serve both — AI answers trigger on question phrasing, which is guide territory, not show-listing territory. (b) The best guide already out-impresses every other page on the site (207); the best show page's stats are partly an artifact of being two days from its date — show pages *expire* (the Moncton page's 4 clicks die on Aug 10), guides compound. (c) Guides are the one lane where Nathan's CPA credential is a real differentiator, and that credential is already wired into the site's Person/Organization schema (structured data — machine-readable labels in the page code — identifying the author). Shows are still the moat and still get a workstream; they just aren't the #2 use of scarce hours.
2. **Toronto is not a workstream.** One city page worth writing properly is a 1–2 hour task, not a peer of the others. It rides inside Workstream A's first batch.

### Workstream A — Fix click-through on what already ranks *(start immediately)*

**What:** rewrite titles and meta descriptions (the headline and two-line blurb Google shows for a page) on the top ~20 pages by impressions, plus the template formulas that generate them for every page type. Includes the one-off Toronto city-page upgrade (its `<h1>` is currently the bare word "Toronto").
**Why first:** 10.4K impressions/week × 0.8% CTR is the single largest measured leak. Every other workstream's output also flows through these templates, so this compounds with everything below. It needs **zero new pages**.
**How it survives the nightly rebake:** verified in the repo — titles and descriptions are generated by templates from `src/lib/seo.ts` and the store data, not hand-edited into output pages. All rewrites land as template changes (plus per-page overrides kept in the repo), so the nightly rebuild from the Google Sheet cannot erase them. Hand-editing built pages is the trap the brief warns about; this workstream never touches built output.
**Constraint that shapes the copy:** the absence-of-data rule (§7) applies to titles too — no "best card shops in X" framing for the 54 cities where no shop clears the 20-review bar, and no claim about any shop that its owner could email to dispute.
**Effort:** ~3–4 Nathan-hours (review two batches of Claude-drafted rewrites; spot-check live results). Claude drafts everything.
**Expected impact:** the largest of any workstream — CTR 0.8% → 2%+ is a ~2.5× click multiplier on existing traffic. Titles that answer the query better also tend to lift position itself.

### Workstream B — National guides: the grading / selling / valuation / tax cluster *(the GEO lane)*

**What:** deepen the cluster around the proven winner. The repo already has 13 guide pages (grading companies, grading 101, PSA Mississauga, PSA submissions, selling your collection, values, fakes, first show, best-of pages). New pages, in order:
1. **"Do I have to pay tax when I sell sports cards in Canada?"** — the one guide literally no competitor can write with authority; Nathan is a CPA who deals cards. (Educational content only — this is not selling tax services, which stay at KRP per the standing rule.)
2. **"Where to sell your sports cards in Canada"** guide-layer over the existing `/sell/` hub — 203 buyers across 107 cities is the inventory; the 07-23 research confirmed sell-side is high-intent and unowned in Canada.
3. **"What does card grading cost in Canada (2026)?"** — extends the 207-impression winner.
4. One refresh pass over the existing grading guide (it's the top page; keep it the best page on the topic in the country).

Each new/updated guide gets the GEO treatment via the existing skills (geo-citability, geo-schema, geo-content): clean question-and-answer capsules the LLMs can quote, FAQPage JSON-LD (question-answer markup in machine-readable form), and inclusion in `llms.txt` (the plain-text site map for AI crawlers — already generated at build time from live data).
**Why #2:** highest measured per-page return on the site; the only lane serving the GEO acceptance bar (§1b questions 1, 2, 3, 5); evergreen; E-E-A-T moat (Google's "experience, expertise, authoritativeness, trust" quality lens — Nathan's CPA-who-deals-cards bio is exactly what it rewards).
**Effort:** ~6–8 Nathan-hours (≈1–1.5h review per guide; the tax guide deserves his closest read since his name and credential carry it).
**Expected impact:** second-largest, and nearly all of the GEO bar. One existing guide = 207 impressions; four more at even half that rate materially moves national-query traffic and gives the LLM spot-checks something to cite.

### Workstream C — Shows: keep feeding the best page type

**What:** the infrastructure already exists (verified in repo: `/shows/this-weekend/`, per-province-year calendar pages, per-show pages). The work is (a) **more shows** — 45 through Dec 2027 is thin, and every added show is a page in the best-performing class; (b) richer per-show pages (venue details, dealer info where confirmed, answer capsule per show); (c) point `cardshowsnearme.ca` at `/shows/` with a proper 301 (see §4); (d) title/meta treatment from Workstream A applied to show templates, leaning on the confirmed time-modifier pattern ("this weekend", "2026") and regional synonyms ("expo" in Toronto, "exposition/salon" in French).
**Why #3 not #2:** best *per-page* type on the site (3 of top 10 from a 45-page pool) and the one asset a competitor cannot copy from a spreadsheet — but pages expire, the per-page stats are flattered by date proximity, and shows contribute little to the LLM-citation bar. Steady feeding beats a burst.
**Effort:** ~6 Nathan-hours across the 90 days (~30 min/week approving Claude-researched show additions, plus one review of the template upgrades). Organiser concentration (Capital Trade Shows at 62% of the calendar) is already decided as acceptable — no rebalancing work.
**Expected impact:** high and seasonal; each fall/winter show page is a near-guaranteed impression spike in its city and week, and the `card shows [province] 2026` query class in §1a is won here.

### Workstream D — TCG section + redirect hygiene *(the split, implemented — see §4 for the full recommendation)*

**What:** implement the 08-06 split decision as a **section of the existing site**, and fix the four half-broken domain redirects. Detail and defense in §4.
**Effort:** ~4–6 Nathan-hours (Cloudflare DNS move ≈ 1h of his hands; section review 2–3h; redirect verification 30 min).
**Expected impact:** medium on traffic directly, but it unblocks a decided strategic direction, stops sports rankings being distorted by board-game cafés, and captures the "pokemon card shop [city]" query class (§1a) — the top-3 autocomplete rider on nearly every city query per the 07-23 harvest.

### Workstream E — French / Quebec pilot *(gated — see roadmap)*

**What:** a pilot, not a translation project: French versions of the Quebec province page, Montreal city page, the Quebec show-calendar page, and one French sell-side guide ("Où vendre des cartes de hockey au Québec"), with `hreflang` tags (the code hint telling Google which language version to show which searcher). Written from the real French query text already in hand (*magasin carte de hockey montréal*, *exposition carte de hockey*, *évaluateur*).
**Why last among funded workstreams:** the signal is real (a live French query, 123 Quebec shops, zero competitors serving French) but it is one query with 9 impressions today — the thinnest data of any workstream. Gate: ship only if the September monthly review still shows French queries surfacing (top-10 limitation noted; the §6 measurement fix will make this readable properly).
**Risk to manage:** nobody on this team natively reviews French. Claude drafts; budget includes a native-speaker sanity pass (a favour or a $50 gig) before anything ships — publishing bad French to Quebec is worse than publishing nothing.
**Effort:** ~5–7 Nathan-hours if the gate opens.
**Expected impact:** unknown but uncontested — the cheapest differentiator on the board if the signal holds.

**Explicitly not funded in these 90 days:** the 248-city content push (the data says cities other than Toronto aren't where traffic is), any change to the ranking formula (settled: 20-review bar, Bayesian weighting, VOLUME_WEIGHT 0.35), any US content, and the Featured-placement *sales* build beyond keeping its traffic gate measured (selling starts only when the gate clears, ≈ November).

---

## 4. The TCG split: recommendation

**Conclusion: build it as a section of the existing site — a full TCG/Pokémon area on sportscardsnearme.ca with its own hub, navigation, and rankings — not a separate website, and not a mere filter. Hold `tcgshopsnearme.ca` as the future home behind a named graduation gate. All four held domains stay redirects, fixed to proper 301s.**

For orientation: the 08-06 decision settled the *direction* — TCG (trading-card games: Pokémon, Magic, Yu-Gi-Oh) separates from sports cards "almost entirely," because a Pokémon searcher and a hockey-card searcher are different people and one ranking can't serve both. This PRD's job is the *shape*. The candidates were: separate site, section, or filter.

### Why a section wins

1. **A separate site today would fork three weeks of hard-won trust into two cold starts.** Search engines grant trust to domains over time; sportscardsnearme.ca crossed into ranking for generic head terms *this week* (63 → 10,400 impressions). A new domain starts at zero, and the existing site loses its 62%-of-inventory TCG content (429 of 689 shops carry Pokémon). At ~3–5 Nathan-hours/week across seven other ventures, a second property is also the exact capacity risk the decision log already flags. The competitor datum cuts the same way: `tcgnearme.ca` registered in **February 2025** and is *still* "Launching Soon" 18 months later — running a second site is evidently hard even for someone doing only that.
2. **The category data cannot yet support a separate site.** The sports/TCG field was wrong for at least 26 of 281 TCG-tagged shops (15% of those with reachable websites) before this week's corrections. On a section, a misfiled shop appears in the wrong list — visible, fixable, low-harm. On a separate site, a misfiled shop lives on the wrong *property* and every correction is a cross-site move with redirects. The recommendation must tolerate imperfect data; a section does, a split site doesn't.
3. **A filter fails the decision.** "Almost entirely" separate means separate rankings, separate landing surfaces, separate answer capsules — a checkbox on a shared list is the shared-ranking frame Nathan already rejected.
4. **A section delivers everything the split was actually for.** The distortion that triggered this (a 513-review board-game café outranking a 46-review specialist sports shop) is fixed by separating the *ranking pools*, which a section does completely.

### What the section is

- Expand the existing `/pokemon/` hub (173 city pages, already baked nightly from the same sheet — near-zero marginal maintenance) into a proper TCG area: hub page, own nav entry, TCG city pages where TCG shops are ranked **only against other TCG shops**, Pokémon-first language throughout ("TCG" is insider shorthand; searchers type "pokemon card shop").
- Sports-card ranked surfaces (best-of pages, sell pages — the only pages that rank by quality; the main `/[province]/[city]/` directory pages render alphabetically and are unaffected) stop crowning or ranking shops known to be TCG-only, using the existing `carriesSportsCards()` predicate in `src/lib/seo.ts`. **This changes which shops are in each pool, not the ranking formula — the formula (20-review bar, Bayesian weighting, volume weight) is untouched**, satisfying the hard constraint.
- **TCG-only shops stay listed on the main city directory pages.** Removing them would delete real businesses from town pages, and the absence-of-data rule bites here twice: shops with *no* category data are never treated as TCG-only (missing data is not evidence — one of them is literally named "Dave's Card Shop"), and the 15%-wrong field means exclusion applies only to ranked/crowned surfaces where the harm of a mistake is small, never to listing existence. This answers the decision log's open question #2.

### Fate of each of the four domains

All four currently redirect half-broken: HTTP-only (no secure version), 302 ("temporary move" — passes no credit to the destination), no `www`. **First task: move DNS to Cloudflare and make all four proper 301s ("permanent move" — tells Google the redirect is real and passes the link credit) over HTTPS, both bare and www.** ~1 Nathan-hour, and it's pure hygiene owed regardless of shape.

| Domain | Fate under this recommendation |
|---|---|
| `pokemonnearme.ca` | **301 → `/pokemon/`. Redirect-only, forever.** Never a brand, logo, site title, or marketing address, and never a target of link-building. "Pokémon" is aggressively enforced by The Pokémon Company; building search equity on this domain means building an asset that a trademark dispute (domains have a fast-track dispute process, CDRP in Canada) can confiscate at exactly the moment it becomes valuable. Honest residual: even redirect-only use is not risk-zero — it is low-profile and low-value-to-challenge, and if a complaint ever arrives, the domain is surrendered without a fight because nothing was built on it. That is the whole design. |
| `tcgshopsnearme.ca` | **301 → the TCG hub. The designated future home** if the section ever graduates (gate below). Renewed indefinitely. |
| `tcgshopsnearme.com` | **301 → the `.ca`.** Purely defensive — no US expansion means the `.com` is protection against a squatter, not a property. |
| `cardshowsnearme.ca` | **301 → `/shows/`.** Shows are the best page type precisely *on* the domain that is finally ranking — forking the winner onto a cold domain would repeat mistake #1 above. Redirect, renew, revisit never (or only if shows someday outgrow the site). |

### The redirect endgame

- **Now → graduation (if ever):** the four domains are pure 301 feeders into sportscardsnearme.ca. All search equity accrues to one domain.
- **Graduation gate (named so it's checkable, not vibes):** the TCG section becomes a candidate for its own site at `tcgshopsnearme.ca` only when **(a)** the section sustains ≥ 5,000 impressions/month for two consecutive months, **(b)** the category field's error rate has been driven well under the current 15%, and **(c)** Nathan explicitly re-confirms capacity at that time. Until all three, the answer to "should this be its own site yet" is no, without re-litigating.
- **If graduated:** page-for-page 301s from every `sportscardsnearme.ca/pokemon/...` (and TCG) URL to its `tcgshopsnearme.ca` twin, held for 12+ months — the standard way to move a site without losing its rankings. `pokemonnearme.ca` re-points at the new site's Pokémon hub, still redirect-only. Nothing about this endgame is prejudged; the section is not a compromise that blocks the split — it is the split, staged.

---

## 5. 90-day roadmap

Weeks count from 2026-08-11. Monthly reviews (§6) are the gates: each month's plan is confirmed or re-cut against fresh numbers before the next month starts.

**Month 1 (Aug 11 – Sep 7): stop the leak.**
- Wk 1: Domain/DNS move to Cloudflare; all four 301s fixed and verified. Workstream A batch 1 — top-20-page title/meta rewrites + template formulas. Toronto city-page upgrade. Measurement fix (§6): wire the Search Console API so reads stop being top-10-only.
- Wk 2–3: Guide 1 (tax) drafted, reviewed, shipped with GEO treatment. Guide 4 (grading-guide refresh).
- Wk 4: Workstream A batch 2 (next tier of pages, informed by first post-rewrite data). Shows: first batch of new show additions.
- *Exit bar:* CTR trending toward 1.5%; 301s verified; 2 guide units live; full-table GSC reads working.

**Month 2 (Sep 8 – Oct 5): build the winners.**
- Monthly review #1 (Sep 8): full-table read — first look past row 10. Re-rank workstreams if the long tail surprises. **French gate decided here.**
- TCG section shipped: hub, nav, TCG-pool rankings, sports-surface pool separation via `carriesSportsCards()`.
- Guides 2 (sell-Canada) and 3 (grading cost) shipped.
- Shows: weekly feeding continues; show-template title/meta pass.
- *Exit bar:* clicks ≥ 150/week; TCG section live; 4 guide units live; first LLM spot-check recorded (baseline).

**Month 3 (Oct 6 – Nov 5): differentiate and gate-check.**
- Monthly review #2 (Oct 6): position check against the §1a table; second CTR pass on whatever now ranks 6–15 (the new top of the leak).
- French pilot ships (if gated in Sep): 4 French pages + hreflang + native review.
- LLM spot-check #2 against the §1b questions; fix citability gaps the geo-* skills find on any guide not being cited.
- Nov 1: **Featured gate check** on `/ontario/toronto/` (90 days history, 100+ impressions, 20+ outbound clicks/month). If green, Featured selling can begin honestly — outside this PRD's scope, but this is the handoff.
- *Exit bar = the acceptance bars in §1:* top-5 on the named queries, ≥ 3/6 questions cited in ≥ 2/3 engines, CTR ≥ 2.5%, clicks ≥ 300/week.

Capacity check: Month 1 ≈ 12–14 Nathan-hours, Month 2 ≈ 11–14, Month 3 ≈ 9–16 (upper end only if French gates in). All within 3–5 h/week, with slack for a bad week.

---

## 6. Measurement loop

**Conclusion: one fix, then a boring monthly ritual. The fix comes first because this week's read was top-10-blind.**

- **The fix (Month 1, week 1):** connect to the Search Console **API** (the programmatic route to the same data — free, and not limited to 10 visible rows or blocked downloads like the CSV path was this week). Claude pulls full query/page tables into `docs/research/` on demand. ~1 Nathan-hour once (authorization), then zero.
- **Monthly GSC review** (first Monday: Sep 8, Oct 6, Nov 3): full-table pull; update a running position table for the §1a named queries in `docs/research/`; CTR and clicks against the §1c targets; one paragraph of "what changed and what we're re-cutting." Decisions gated on it: French (Sep), second CTR pass targets (Oct), Featured handoff (Nov).
- **Monthly LLM spot-check** (same day): ask the six §1b questions, verbatim, in ChatGPT search, Perplexity, and Google AI Overviews; record cited / mentioned / absent per engine in a simple table. When a shipped guide isn't cited, run geo-citability on it and fix what it flags. Bing Webmaster stays connected (it feeds ChatGPT search); `llms.txt` continues to build from live data.
- **Weekly, zero-Nathan:** Claude tracks nothing weekly. Three weeks of history means weekly numbers are noise; reacting to them would burn hours the plan doesn't have. Monthly is the cadence, deliberately.

---

## 7. Risks and out-of-scope

**Hard lines (out of scope permanently, restated so no workstream drifts into them):**
- **Organic position is never for sale.** Featured is a labelled slot outside the ranking, one per city; nobody buys position or the word "best." No mechanism in this PRD touches that — the closest thing, TCG pool separation, changes who is *comparable*, never who *paid*.
- **Absence of data is never a negative claim about a business.** Binds every title rewrite, answer capsule, guide, and French translation this PRD ships. The test stays: could the shop email "that's wrong"? If our only defence is "we didn't find it," it's rewritten as our gap.
- **No US expansion.** `tcgshopsnearme.com` is a shield, not a beachhead.
- **The ranking formula is settled** (20-review bar, Bayesian mean-weighting, VOLUME_WEIGHT 0.35) and untouched here.

**Risks accepted or managed:**
- **Pokémon trademark.** Managed by design, not ignored: `pokemonnearme.ca` is redirect-only forever, no brand/logo/title/marketing use, no equity built on it, surrendered without a fight if challenged (§4). The word "Pokémon" in page *content* describing what shops sell is ordinary descriptive use; the risk lives in branding, and the branding is `sportscardsnearme.ca` / (someday) `tcgshopsnearme.ca`.
- **Three weeks of data.** Every target in §1c could be wrong in either direction; a Google ranking-system update could halve or double these numbers without anything changing on the site. Mitigation is the monthly re-cut, and the discipline of not reacting weekly.
- **Top-10-only visibility** until the API fix lands — this PRD's priority order was set on totals plus top-10 shape, which is why the Sep 8 full-table read is allowed to re-rank workstreams.
- **Category-field dirt (15% wrong at last measure).** Tolerated structurally: pool separation only affects ranked surfaces, listings are never removed on it, and correction passes continue.
- **Capacity.** ~32–44 Nathan-hours over 13 weeks fits 3–5 h/week, but he runs a full-time CPA job and six other ventures. The plan's shape *is* the mitigation: the biggest workstream needs zero new pages, everything else is Claude-drafted/Nathan-reviewed, and the two most expandable items (French, extra guides) are the designated cuts in a bad month.
- **`tcgnearme.ca` competitor.** A year in and still "Launching Soon" — watched, not feared. The response if they launch is the same as the plan without them: national coverage (every province vs. the other rival's self-described Ontario-only) is the statable advantage, and the section ships regardless.
- **The rebuild trap.** All content must survive the nightly rebake from the Google Sheet — templates and repo files only, never hand-edited output. Restated because it will tempt every quick fix.

---

### Appendix — glossary (one place, for reference)

- **Impression / click / CTR:** times Google showed a page / times someone clicked it / the ratio. 10,400 → 79 → 0.8% is this site today.
- **Average position:** where the page sits in results, averaged over all searches; 1–10 ≈ page one.
- **Title / meta description:** the headline and blurb Google shows for a page — the ad copy of organic search.
- **301 vs 302 redirect:** permanent vs temporary forward; only 301 tells Google "trust the destination like you trusted the source."
- **JSON-LD / schema / structured data:** machine-readable labels in page code (FAQ, breadcrumbs, author identity) that search and AI engines read directly.
- **GEO:** generative engine optimization — being the cited source when an AI assistant answers a question.
- **E-E-A-T:** Google's quality lens — experience, expertise, authoritativeness, trust. Nathan's CPA-who-deals-cards bio is the site's E-E-A-T asset.
- **hreflang:** the code hint pairing English and French versions of a page so each searcher gets the right one.
- **llms.txt:** an emerging convention — a plain-text map of the site written for AI crawlers, like robots.txt for answer engines.
- **CDRP:** Canada's fast-track domain-dispute process; the mechanism by which a trademark holder could take `pokemonnearme.ca`.
- **Bayesian weighting:** the settled rating math — each shop's score is pulled toward the directory average until enough reviews justify trusting its own number.
