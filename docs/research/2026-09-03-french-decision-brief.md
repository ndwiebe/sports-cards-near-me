# Should SCNM be published in French? — decision brief

**Date:** 2026-09-03 · **For:** Nathan · **Status:** decision requested
**Scope:** research only. No code was written, no file under `src/` was touched, no git command was run.

---

## How to read this document

Two labels are used throughout, and they mean different things:

- **VERIFIED** — I opened the file or ran the numbers myself, today, in this repo. You can re-run it.
- **JUDGEMENT** — my read. Argue with it.

Every technical word is explained the first time it appears.

---

## The answer, up front

**Don't build the French site. Not the route tree, not the French guides, not the pilot.**

The reason is not that French is a bad idea. It is that the thing everyone assumed was broken
turns out not to be broken. **Google is already showing the English pages to people searching in
French, and already putting them near the top of page one.** There is no gate to unlock. What
there is, is roughly **five French searches a week** — against **12,859 searches a week the site
already earns and mostly fails to convert into clicks.**

Spending 15–25 of your hours plus ~$5,000 of translation on the five is the wrong trade while the
12,859 are sitting at position 8.

Do one thing instead, and it takes under an hour: **set up the measurement so the tripwire below can
actually fire.** Then revisit when it does, or in January, whichever comes first.

---

## 1. What the repo actually is (VERIFIED)

Plain-English glossary for this section, in the order the terms appear:

- **Static build** — the site is not a live database. A program runs, produces ~1,500 finished HTML
  files, and those files get uploaded. Nothing is computed when a visitor arrives.
- **Route** — a URL pattern. `/quebec/montreal/` is a route.
- **Template** — one file that generates many pages. One city template produces all 249 city pages.
- **Canonical tag** — a line in a page's code saying "this is the official address of this page."
  It exists to tell Google which copy to index when several URLs show similar content.
- **Sitemap** — a machine-readable list of every page you are asking Google to index.
- **hreflang** — a line in a page's code that says "this page has a French twin, and it lives at
  this other address." It is how you tell Google to show the French one to a French searcher and
  the English one to an English searcher. It only works if both twins point at each other.

What I found:

| Thing | Finding |
|---|---|
| Framework | Astro 7, static build, 1,489 finished pages, 1,431 of them in the sitemap |
| Language setting | **One line**, `src/layouts/Base.astro:46` — `<html lang="en">`, hardcoded, no variable |
| hreflang | **Zero occurrences anywhere in `src/`.** Nothing exists to build on |
| Multi-language config | **None.** `astro.config.mjs` has no i18n (internationalisation) section at all |
| Where the words come from | `src/lib/seo.ts` — 4,533 words of code that *writes English sentences* |
| Hand-written prose | 18 guide files, ~34,900 words of file content. JUDGEMENT: ~20,000–25,000 of that is actual reader-facing prose, the rest is markup |
| Tests | 30 unit-test files + 10 browser-test files (`CLAUDE.md` says 266 tests) |
| Data flow | Shop and show data is rebuilt from one Google Sheet on **every deploy plus daily at 09:00 UTC** |

**The one structural fact that matters most.** `src/lib/seo.ts` does not store sentences — it
*assembles* them, and the assembly is English-grammar-shaped. Real examples from the file:

- `total === 1 ? 'shop' : 'shops'` — singular/plural switch
- `pokemonShops.length === 1 ? 'carries' : 'carry'` — verb agreement
- `buyers.length === 1 ? 'lists' : 'list'` — verb agreement again
- `joinWithAnd(names)` — builds "A, B, and C"

French needs all of that **plus** things English doesn't have: nouns have a gender (*le* magasin,
*la* boutique), adjectives must agree with that gender *and* with singular/plural (*un magasin
ouvert* / *trois magasins ouverts*), and vowel-starting words trigger contractions (*de* + *Ottawa*
→ *d'Ottawa*). None of that machinery exists. It is not a translation job. It is a rewrite of the
sentence-assembly engine, and then a translation job.

**Quebec's share of the site (VERIFIED, today's data):**

| | Count |
|---|---|
| Quebec shop listings (114 open + 9 closed) | **123** |
| Quebec city pages built | 66 |
| Quebec pages currently live under `/quebec/` | 67 |
| Quebec shop pages | 123 |
| "shops that buy" pages for Quebec cities | 23 |
| Pokémon/TCG pages for Quebec cities | 38 |
| Quebec show pages + calendar | 8 |
| **Total Quebec-specific pages** | **259** |
| Plus shared pages a French visitor needs (home, hubs, about, privacy) | ~9 |
| Plus the 18 guides | 18 |
| **A French mirror of the Quebec experience** | **≈ 286 new pages** |

---

## 2. The measurement that decides it (VERIFIED — this is the new information)

Someone pulled a fresh Search Console export into this repo today
(`docs/research/gsc-export-2026-09-03/`). *Search Console is Google's free report showing which
searches your site appeared in, and which of those appearances got clicked.* I read it. Nobody had
yet.

**Site totals, 36 days (Jul 28 – Sep 1):** 41,667 appearances, 574 clicks, 1.38% click rate.
**Last 7 days: 12,859 appearances, 217 clicks.** The site is growing fast — the August plan was
working off ~4,100 appearances a week.

**French searches, same window:**

| | Value |
|---|---|
| French-looking searches found | 27 |
| Total appearances from them | **218** |
| Share of all site appearances | **0.52%** |
| Clicks from them | **2** |

That 0.52% is already small. But it splits into two very different things, and the split is the
whole decision:

**Of the 218 French appearances, 150 (69%) are somebody typing a shop's own French name.**
"le coin de la carte sportive" (32), "coin de la carte sportive" (21), "mb cartes" (18), "la carte
cachée" (12), "boutique la coupe stanley" (6), "entre jeux shawinigan" (10), and so on. These
people are not looking for a directory. They are looking for *that shop*. The shop's own website
and its own Google Business listing will outrank a directory for its own name, and should. **A
French version of SCNM wins zero of these.** (This is the same conclusion the August plan already
reached about English shop-name searches — it called that traffic "structurally unwinnable.")

**What is left after removing shop names: 12 searches, 68 appearances.** Strip out the address
lookups and the English/French hybrids and the genuinely French *category* demand — a person
searching in French for a kind of shop rather than a named one — is about this:

| Search | Appearances | Clicks | **Position** |
|---|---|---|---|
| magasin carte joliette | 8 | 0 | **8.4** |
| magasin de carte joliette | 7 | 0 | **9.4** |
| carte pokemon drummondville | 7 | 0 | **8.9** |
| magasin sport iles de la madeleine | 3 | 0 | **1.0** |

**≈ 25 appearances in five weeks. Five a week.**

### The finding that changes the question

Look at the position column. *Position is where the site sat in Google's results, averaged.
Positions 1–10 are page one.*

**The English pages are already ranking on page one for French searches.** Position 8.4 and 8.9 and
one at position 1. Google is already reading `/quebec/joliette/` and deciding it answers *"magasin
carte joliette"*.

This kills the premise the roadmap was built on. The premise was "we are invisible to French
searchers; French pages would make us visible." **VERIFIED: we are not invisible. We are visible
and near the top of page one.** The gap is that nobody clicks — and the site-wide click rate on
*English* searches at position 8 is only 1.38% too. It is the same problem everywhere, not a French
problem.

### Two more numbers that cut against the French case

**Quebec pages convert BETTER than the site average, in English.** VERIFIED: the 46 Quebec pages
that appear in the top-1,000 page list earned 861 appearances and 19 clicks — a **2.21%** click
rate, against the site-wide **1.38%**. If Quebec visitors were bouncing off English, this number
should be worse than average. It is 60% better. (Caveat, stated loudly: 19 clicks. Small sample.
Directional, not proof.)

**The French share is shrinking, not growing.** Comparing the Aug 28 export to today's, using the
identical detection rule:

| | Aug 28 | Sep 3 |
|---|---|---|
| French appearances | 180 | 186 |
| Total appearances (top 1,000 searches) | 11,492 | 15,521 |
| **French share** | **1.57%** | **1.20%** |

French grew 3%. The site grew 35%. Caveat: these are overlapping three-month windows, so this is
one soft observation, not a trend line.

### The honest hole in this data

Search Console's export stops at 1,000 rows, and today's file cuts off at 3 appearances. The
1,000 rows account for 15,521 of the site's 41,667 appearances. **The other ~26,000 appearances
are in searches I cannot see** — Google either truncated them or anonymised them (it hides rare
searches to protect privacy).

So: could French demand be hiding in that unread tail? JUDGEMENT: not enough to change the answer.
Everything in the tail had ≤2 appearances, so no *individual* French search is meaningful there.
For the tail to flip the decision, French would need to be several times more fragmented than
English — possible in principle, and it is precisely why the tripwire in §5 is written as a
*measurement*, not an argument.

---

## 3. The four options

### Option A — Full French route tree with hreflang

**What a Quebec visitor gets.** A parallel site at `/fr/…`. `/fr/quebec/joliette/` shows the
Joliette page entirely in French. A language switcher in the header.

**What Google sees.** Two addresses for every place, each declaring the other as its twin via
hreflang, each declaring itself as its own canonical (official) address. Sitemap grows from 1,431
URLs to roughly 1,717 (Quebec-only mirror) or ~2,860 (whole site).

**Build cost.** VERIFIED as the work required: pull every English string out of `Base.astro`, six
components, ~15 route templates and all of `seo.ts` into a message catalogue; build French
gender/plural rules into the sentence assembler; add Astro's i18n routing; emit hreflang pairs;
teach the sitemap to include both; and write French versions of 18 guides. Then duplicate the
relevant tests — `page-titles`, `superlative-claims`, `seo`, `store-seo`, `sell`, `tcg` all assert
on English text.

JUDGEMENT on cost: **15–25 of your hours**, on top of a large Claude build. The August plan
budgeted 5–7 hours — but that estimate was for a **4-page pilot**, not 286 pages. It is not wrong;
it is costing a different thing.

Translation: ~20,000–25,000 words of guide prose plus ~200 template fragments. Professional
Quebec-French translation runs roughly $0.18–$0.25 a word. **≈ $4,500–$6,000 for the guides alone.**
The plan's budgeted "$50 gig" buys review of about 2,000 words — under a tenth of it.

**Keep cost — the part that gets skipped.** This is the number that decides the option.

Shop data is safe: counts and names regenerate nightly from the Sheet in both languages
automatically. Nothing rots there.

*Prose* is not safe, and prose is where the damage is:

- Every future template change is now two changes, in two languages, one of which you cannot read.
- Every new guide is two guides. The tax guide — the site's single best asset — becomes two
  documents that must stay legally and factually identical while one is in a language nobody on the
  team speaks.
- **Nothing fails when they drift.** No test can catch "the English guide was updated for the 2027
  tax year and the French one still says 2026." The build stays green. This is exactly the failure
  mode `CLAUDE.md` already warns about with the Google Sheet — *it looks like it worked right up
  until it's gone* — except here it never surfaces at all.
- You acquire a permanent dependency on a French reviewer who is not on the team, for every content
  change, forever.

JUDGEMENT: **+40–60% on every future content task, permanently**, plus a recurring external
dependency. That is the real price, and it is paid monthly, not once.

### Option B — French content on Quebec pages, no new routes

**What a Quebec visitor gets.** `/quebec/joliette/` stays one page, but carries a French block —
a French summary paragraph, French FAQ answers, French section headings, alongside the English.

**What Google sees.** No new URLs. No hreflang needed (there is no twin to point at). No
page-count growth. But Google assigns **one primary language per page**, and on a page that is
mostly English it will pick English.

JUDGEMENT: this is a courtesy and a credibility gesture more than a search play. It probably does
not move French rankings much — but the French rankings are already position 8–9, so there is not
much to move. Its real value is that it makes Option C honest (see below).

**Build:** 10–15 of your hours. **Translation:** ~3,000 words, ≈$600 professionally, or a favour.
**Keep cost:** +20% on Quebec templates only. Bounded, because there is only ever one page per
place.

### Option C — French metadata and key phrases only

**What a Quebec visitor gets.** The Google result reads *"Magasins de cartes à Joliette"*. They
click. **They land on an English page.**

**What Google sees.** Same pages, better keyword match for the French searches that already rank
8–9.

**Build:** 2–4 of your hours (template work in `seo.ts`). **Translation:** ~300 words.
**Keep cost:** near zero.

**The catch, and it is fatal on its own.** A French headline over an English page is a
bait-and-switch. The visitor clicks, sees English, and leaves in two seconds. Google measures that
— it is called pogo-sticking — and treats it as evidence the page did not answer the query. Done
alone, Option C can plausibly make the position *worse* than doing nothing.

**Option C only works bolted onto a minimal Option B**, so the page delivers at least something in
the language its headline promised. Treat them as one option, not two.

### Option D — Do nothing

**Cost:** zero. **What you give up:** the first-mover advantage of being the only French Canadian
card directory.

JUDGEMENT: that advantage is worth about five searches a week today. Nobody serves French here not
because they missed it, but because there is very little there.

---

## 4. Duplicate content and doorway pages — quantified

### Where the site already stands (VERIFIED, today)

*A doorway page, in Google's own words, is a page "created to rank for specific, similar search
queries" that leads users "to intermediate pages that are not as useful as the final destination."
Google names as a criterion: "creating substantially similar pages" and "pages targeted at specific
regions or cities that funnel users to one page."*

| | Count | Share |
|---|---|---|
| City pages built | **249** | |
| …with exactly **one** listing | **146** | **59%** |
| …with two or fewer | 190 | 76% |

That confirms the figure recorded on 2026-08-27 exactly. It has not improved.

**Quebec is worse than the national average:**

| | Count | Share |
|---|---|---|
| Quebec city pages | **66** | |
| …with exactly **one** listing | **44** | **67%** |
| …with two or fewer | 53 | 80% |

So the province being proposed for duplication is the province with the thinnest pages.

### Does a French mirror make it better or worse?

**Worse. Unambiguously, and in three separate ways.**

**1. It roughly doubles the thin-page count in the worst region.** 44 Quebec one-shop pages become
88 one-shop pages. The French `/fr/quebec/joliette/` describes *the same single shop* as
`/quebec/joliette/`. Two pages, one shop, one town, near-identical structure. Read Google's
criterion again — "substantially similar pages… closer to a search result than a clearly defined,
browseable hierarchy" — and ask whether the French twin of a one-shop page is a better or worse fit
for that sentence than the English one. It is a worse fit. It is the English page plus the word
"similar."

**2. Machine-translated near-duplicates are the specific bad case.** Google's guidance on
duplicate content treats *automatically translated text published without human review* as
low-quality content in its own right — separately from the duplication. So a machine-translated
mirror gets classified badly twice: once as scaled near-duplicate pages, once as auto-generated
text. Human-reviewed translation removes the second charge. It does not touch the first.

**3. Google's own May 2026 AI guidance names this pattern directly.** Recorded in
`~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-google-ai-optimization-guidance-vs-our-plan.md`,
quoting Google: creating separate content for every query variation *"primarily to manipulate
rankings or generative AI responses in Google Search violates Google's scaled content abuse spam
policy."* A French page targeting *"magasin carte joliette"* alongside an English page targeting
*"card shops joliette"* is, structurally, a page per query variation. Intent matters and the intent
here is genuine — but Google's classifiers do not read intent, they read the page set.

**The one nuance in the other direction.** A *properly localised* page — real Quebec French, local
context, the shop's own French name and hours, genuinely useful to a francophone — is not a
near-duplicate. It is a different page serving a different reader. Google's rules distinguish
translated content from duplicate content when the translation is genuine. **But that only holds if
every one of the 286 pages clears that bar, and 44 of them are a single shop's name, address and
phone number.** There is no amount of translation quality that makes a one-shop page substantial.

### Mitigation, in the order it should be done

1. **Fix the thin English pages first, and independently of any French decision.** 146 one-shop
   pages is a live exposure right now. The remedy is already half-built and already the right call:
   `src/lib/nearby.ts` computes real distances to genuinely nearby shops (with a deliberate 75 km
   cap), and the city template already injects those on thin pages. The remaining work is
   consolidating or de-indexing the pages that stay thin even after that. **Fewer, better pages.**
2. **Never mirror a page that is thin in English.** If French ever happens, it should cover only
   Quebec pages with real substance — the province hub, Montréal (9 shops), Laval (6), Québec (5),
   Saint-Jean-sur-Richelieu (5), Sherbrooke, Terrebonne, Trois-Rivières (4 each). That is roughly
   **8–12 pages, not 286**, and it is a completely different risk profile.
3. **hreflang must be reciprocal, or it is worse than nothing.** Each twin must point at the other,
   and each must name itself as its own official address. Half-wired hreflang produces the exact
   outcome the whole exercise is meant to avoid: Google picking one twin and treating the other as a
   duplicate to be suppressed.
4. **Keep every translated page out of the sitemap until a human has read it.** The site already
   has this discipline — `astro.config.mjs` filters closed shops and the empty reseller pages out
   of the sitemap while keeping them reachable. Same pattern, same file, no new machinery.

---

## 5. Translation quality

**The bar is Quebec French, reviewed by a Quebec francophone, on every string.** Not "French."
Not France French. Not machine French with a spot-check.

**Why the bar is that high here specifically:**

The audience is French-Canadian card collectors — a small, tight community that reads a lot of
badly-translated corporate French every day and spots it instantly. The tells are not spelling
mistakes. They are:

- **Register.** France French says *"boutique de cartes à collectionner"*; a Quebec collector says
  *"magasin de cartes"* — which is exactly what shows up in the live search data
  (*magasin carte joliette*). Getting this wrong does not read as an error. It reads as *foreign*.
- **Hobby vocabulary.** Grading, breaking, wax, singles, slabs, raw — this vocabulary is mostly
  used in English *inside* French Quebec card conversation. A translator who dutifully renders
  "graded" into an academic French equivalent produces text a collector recognises as written by
  someone who does not collect.
- **Machine agreement failures are visible.** The template assembler produces sentences like
  *"Joliette has 1 sports card shop listed."* Machine-translated templates reliably break on the
  gender/number agreement French requires — *un magasin ouvert* vs *trois magasins ouverts*,
  *à Montréal* vs *à Québec* vs *aux Îles-de-la-Madeleine*. These errors appear on **every one of
  the 66 Quebec city pages at once**, because they come from one template. One bad rule, 66 broken
  pages.

**What it costs the site if the French reads as machine output.** SCNM's entire product is
*trustworthy data*. It has spent months on this — the publishing standard (address + second
source), the 111-shop evidence audit, the rule that absence of data is never a negative claim about
a business, the refusal to say "Rated" on a page with no rating. Every one of those is a decision
to look *less* impressive in exchange for being *more* correct.

Bad French destroys that in one visit, and the mechanism is specific: a reader who sees careless
French does not conclude "the translation is bad." They conclude **"nobody checked this,"** and
then they apply that to the shop hours, the phone numbers and the ratings. The directory's one
asset is the reader's belief that a human verified this. Machine French is direct evidence that
nobody did.

**Is there an honest way to do it without a Quebec French speaker?**

**No — with one narrow exception.**

The exception: **French words that are already facts, not translations.** The shop's own registered
name. The city's own name with its accents. A show's own French title. These are not translated,
they are *quoted* — and the Sheet already carries them correctly (Montréal, Trois-Rivières,
Jonquière, Le Coin de la Carte Sportive all render properly today, VERIFIED). Using a business's
actual French name in a page title is not translation and carries no quality risk.

Everything else — every generated sentence, every FAQ answer, every guide — needs a native Quebec
reviewer, and needs one **again on every subsequent change**. That is the part the plan does not
budget. A one-time $50 favour covers the launch. It does not cover month four, when a template
changes and there is no one to read it.

**One flag I could not verify, and it is not legal advice.** Quebec's *Charter of the French
Language* (Bill 96) places French-language obligations on commercial publications and websites of
businesses operating in Quebec. SCNM today is a free directory run from Alberta, and my JUDGEMENT
is that it is very likely outside scope. **But the moment Featured placement sells a slot to a
Quebec shop, SCNM becomes a business selling a service into Quebec**, and whether the
commercial-publication rules attach becomes a real question rather than a theoretical one. That is
worth a 20-minute check *before the first Quebec Featured sale*, not before a French page. Flagging
it because it inverts the usual assumption: the French obligation, if it ever arrives, arrives
through the **monetisation** gate, not the SEO one.

---

## 6. Recommendation

**Do not start French. Do the measurement instead.**

### The reasoning

1. **The premise was wrong.** French pages were meant to fix invisibility to French searchers. The
   English pages already appear at **position 8.4–8.9** for French searches, and one at position 1.
   There is nothing to unlock.
2. **The demand is ~5 searches a week**, and 69% of all French appearances are people typing a
   shop's own name — traffic no directory wins in any language.
3. **Quebec pages already convert 60% better than the site average**, in English (2.21% vs 1.38%).
   The language-barrier theory does not survive contact with the data.
4. **The opportunity cost is decisive.** 12,859 appearances a week, at average position 8.2, at a
   1.38% click rate. Rewriting the headlines Google shows for those — Workstream A in the existing
   plan — costs 3–4 of your hours and touches *all* of that traffic, including every French search
   already ranking. French costs 15–25 hours plus ~$5,000 and touches five searches a week.
5. **It moves a live risk in the wrong direction.** 44 of 66 Quebec city pages have one shop. A
   mirror makes it 88.
6. **The keep-cost lands on the wrong person.** +40–60% on every content task, forever, plus a
   French-reviewer dependency, against a 3–5 hour weekly budget already spread across seven
   ventures. This is the item the plan itself already names as a designated cut in a bad month.

### Do this now (under one hour, and it is not a French project)

In Search Console, save a filter on the Queries report that matches French terms — a regex on
`magasin|boutique|carte[s]? de|cartes sportives|où vendre|encan|évaluateur` plus accented
characters. Read it on the same first-Monday cadence as everything else. **Right now nobody can
answer "is French demand growing?" without a research session.** That is the actual blocker, and
it costs an hour to remove permanently.

### The tripwire — the specific condition that flips this to yes

**Primary (any one fires → build the narrow version):**

- **Non-navigational French searches reach 300 appearances in a rolling 28-day window.** Today's
  equivalent is ~25 in five weeks. That is a **~15× move**, and it is the point at which French
  demand becomes comparable to a single decent guide page.
- **Any single generic French search exceeds 50 appearances in a month.** Today's biggest is 8.
- **A French search reaches page one and still earns zero clicks over 100+ appearances.** That
  would be direct evidence the English page is losing the click *because* it is English — the one
  piece of evidence that does not currently exist. It is the cleanest possible signal, and it is
  measurable with the filter above.

**Secondary (each changes the calculus, none alone forces it):**

- **A named competitor ships French.** `tcgnearme.ca` — registered February 2025, still "Launching
  Soon" 18 months later — or any Quebec-specific card directory. Check quarterly, five minutes.
- **A Quebec shop buys a Featured slot.** Then French stops being an SEO question and becomes a
  customer-service question, with a possible Bill 96 dimension (§5). Different decision, different
  reasoning, and it should be re-made from scratch when it happens.
- **Quebec inventory or traffic doubles.** 123 shops → 250, or Quebec pages reaching Ontario's
  reach per page.

**If a tripwire fires, what gets built is NOT Option A.** It is the narrow version: French on the
**8–12 Quebec pages with genuine substance** (province hub, Montréal, Laval, Québec,
Saint-Jean-sur-Richelieu, Sherbrooke, Terrebonne, Trois-Rivières), with reciprocal hreflang, human
Quebec-French review, and **no French page for any city with one shop, ever.** That is a ~6-hour
build, ~$400 of translation, and a bounded keep-cost. It is also, not coincidentally, close to what
the August plan actually described before it got read as "a French site."

**Automatic re-review date if nothing fires: 2027-01-05** (the January monthly review). Not because
anything changes then, but so this does not sit on the roadmap for another five weeks
undiscussed.

---

## 7. What a French version would NOT fix

Stated plainly, because each of these gets quietly attributed to the missing French version:

1. **It would not improve position.** The French searches already rank 8.4–8.9. Position at that
   level is an authority and internal-linking problem, identical to the English pages sitting at
   9.7. French changes nothing about it.
2. **It would not fix the thin city pages.** A one-shop Joliette page in French is a one-shop
   Joliette page. The fix is nearby shops with real distances, and consolidating what stays thin —
   and that fix helps English and French equally.
3. **It would not win the shop-name searches.** 150 of 218 French appearances (69%) are people
   typing a specific shop's name. They want that shop. Its own site and Google listing outrank a
   directory and should. Unwinnable in any language — the same conclusion the August plan already
   reached for English shop-name traffic.
4. **It would not fix the desktop problem.** VERIFIED today: mobile average position **8.12**,
   desktop **16.14** — page one versus page two, for the same site. This gap was flagged on
   2026-08-27 and is still unexplained and still uninvestigated. JUDGEMENT: it is worth more than
   the French question and costs less to look into.
5. **It would not create demand.** No competitor serves French Canada not because they overlooked
   it, but because the searches are not there yet. Being first to an empty room is being alone.
6. **It would not improve AI-answer citation.** Google's own May 2026 guidance (already recorded in
   the vault) states plainly that no special format, markup or file makes content eligible for AI
   answers — the lever is **non-commodity content**, their example being lived, specific expertise.
   A translated shop listing is the most commodity content on the site. The tax guide, written by a
   CPA who deals cards, is the non-commodity asset. French does not add one.
7. **It would not help sell Featured placement in Quebec.** That gate is 90 days of history plus
   100+ appearances and 20+ outbound clicks a month on the shop's own city page. `/quebec/montreal/`
   is at **106 appearances over three months** — about a third of the bar. Language does not move
   that number; more Montréal shops and better titles do.
8. **It would not fix the Quebec data backlog.** `SESSIONS.md` lists 41 Quebec shops awaiting
   triage. Publishing an unverified listing in French makes it wrong in two languages. Per the
   standing publishing rule, data quality is upstream of presentation — always.

---

## Appendix — where every number came from

| Claim | Source | Re-runnable? |
|---|---|---|
| 1,489 pages / 1,431 sitemap URLs | `dist/`, `dist/sitemap-0.xml` | yes |
| `lang="en"` hardcoded, zero hreflang | `src/layouts/Base.astro:46`; grep over `src/` | yes |
| No i18n configuration | `astro.config.mjs` | yes |
| 249 city pages, 146 with one listing | computed from `src/data/stores.json` + `stores-closed.json` | yes |
| 66 Quebec city pages, 44 with one listing | same | yes |
| 123 Quebec shops (114 open + 9 closed) | same | yes |
| 286-page French mirror estimate | computed route-by-route from the same data | yes |
| 41,667 appearances / 574 clicks / 36 days | `docs/research/gsc-export-2026-09-03/Chart.csv` | yes |
| 12,859 appearances last 7 days | same | yes |
| 218 French appearances, 27 searches | `…/Queries.csv`, French-term + accent match | yes |
| 150 of 218 are shop-name searches | same, cross-matched against listed shop names | yes |
| French searches ranking 8.4–8.9 | same file, position column | yes |
| Quebec pages 861 appearances / 19 clicks / 2.21% | `…/Pages.csv` | yes |
| Desktop 16.14 vs mobile 8.12 | `…/Devices.csv` | yes |
| French share 1.57% → 1.20% | `gsc-export-2026-08-28` vs `-09-03`, identical rule | yes |
| Google's doorway criteria | `~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-doorway-page-risk-city-pages.md` | — |
| Google's scaled-content-abuse wording | `~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-google-ai-optimization-guidance-vs-our-plan.md` | — |
| Publishing standards, absence-of-data rule | `~/jarvis-memory/decisions/2026/2026-07-29-scnm-publishing-standards.md` | — |
| Workstream E scope, gate, $50 review budget | `docs/PRD-traffic-growth-2026-08.md` §3, §5 | — |
| Translation rates, keep-cost %, hour estimates | **JUDGEMENT — my estimates, not measured** | no |
| Bill 96 applicability | **JUDGEMENT — flagged for checking, not legal advice** | no |
