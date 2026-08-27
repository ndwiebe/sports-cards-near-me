# Plan 16 — find shows with public vendor lists, draft the trade offer

**Planned by Fable 5 · Executor: Codex (gpt-5.6-sol) · Review: Opus 5.**
Confirmed by Nathan 2026-08-27 ("yes, for shows that have an available vendor list").
Business context: `~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-reseller-gap-verdict-and-empty-network.md`
— the reseller network shipped in July with **zero listings**; show vendor lists are the
best available recruiting pool, and this is the free trade that gets it started (a featured
spot on the directory for a mention to a show's vendor/dealer list — no money involved).

Lane: **docs** (research + drafting only — this plan makes NO code or data changes).
Claim in `SESSIONS.md` before starting.

---

## What "done" looks like

A short report Nathan can act on directly: which shows publish a public vendor/dealer list,
and one ready-to-send draft message per show (or one templated draft if the shows are
similar enough) proposing the trade. **Do not send anything.** This is drafting, not outreach
— every message goes to Nathan for his own send, same as every other outreach in this
project.

## Step 1 — build the candidate list

Read `src/data/shows.json` (204 shows as of 2026-08-27). For each show, check its `website`
and `sourceUrl` fields for a page that publishes a vendor/dealer/exhibitor list — a page
literally listing who's got a table, not just a general "contact us to book a table" form.

**Known confirmed example, verify it's still current before relying on it:** Sport Card Expo
Toronto (`sportcardexpotoronto.com`) publishes a downloadable dealer list, ~273 exhibitors as
of an April 2026 check.

**Known dead end, don't re-check it:** cardshowdirectory.com's vendor pages returned 404 in
earlier research (2026-08-27, reseller-gap research) — not a lead here.

For shows run by the same recurring series (e.g. the 28 Capital Trade Shows entries, the
Casino Card Show series, the West Van Card Show series) — check the **series once**, not
every date. A recurring show's vendor-list policy doesn't change week to week.

Prioritize the shows with the most dates/highest table counts first — they're the highest-
value trades and the most likely to already publish something.

## Step 2 — verify before trusting

For each candidate, actually load the page (don't infer from a URL pattern or a title).
Confirm the list is: (a) genuinely public, no login/paywall, (b) reasonably current — not a
stale 2024 list still sitting on an old page, (c) actually names individual
dealers/vendors, not just sponsors or the promoter's own staff.

## Step 3 — draft the trade offer

For each verified show (or once, templated, if the pitch is genuinely identical across
several): a short message proposing — a Featured spot for that show on the directory
(cross-reference `docs/superpowers/plans/... featured placement` work if it exists in this
repo's history; if not, keep the offer generic: "featured placement on the show's listing
page") in exchange for a mention to their vendor/dealer list about the (currently empty)
reseller network, framed as a benefit to THEIR vendors (a free extra place to be found),
not as a favour to Nathan.

Tone: match the directness already established elsewhere in this project's outward-facing
copy (check `src/pages/about.astro` or similar for the site's actual voice) — no hype, no
"we'd love to partner," state the trade plainly.

## Step 4 — write the report

One file, `~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-show-vendor-list-outreach-candidates.md`
(private vault, NOT the public repo — this may reference promoter names/contact info).
Structure: a table of verified candidates (show name, table count if known, list URL,
recurring y/n), then the draft message(s), then a short "checked but no public list" section
so this research doesn't get silently redone.

🔒 **Same rule as the earlier show-naming research today:** if any candidate's contact
info is a personal name + personal phone/email (not a business email or a public contact
form), that detail belongs ONLY in the private vault file, never in anything committed to
`ndwiebe/sports-cards-near-me` (public repo). This plan doesn't touch the repo at all, so
this should not come up — flag it if it somehow does.

## Hard rules

1. No code changes. No `src/data/*.json` changes. This is a research + drafting deliverable.
2. No outreach sent. Drafts only.
3. Verify every claim by actually loading the page — don't report a vendor list exists
   because a URL or page title suggests one.
4. If genuinely nothing is found beyond the one confirmed example, say so plainly. A short
   honest report beats a padded one.

## Definition of done

- [ ] `docs/research/` in the site repo is untouched — this plan produces no repo changes
- [ ] `~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-show-vendor-list-outreach-candidates.md`
      exists with verified candidates, drafts, and a "checked, no list" section
- [ ] Every candidate was actually loaded and checked, not inferred
- [ ] No personal contact info leaked into anything outside the private vault
