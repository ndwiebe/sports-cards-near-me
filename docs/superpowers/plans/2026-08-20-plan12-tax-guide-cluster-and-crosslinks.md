# Plan 12 — Tax Guide Cluster & Slab Savvy CPA Cross-Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three new national guides drawn from *The Card Collector's Tax Playbook* (Slab Savvy CPA, published), turn the existing tax guide and the new ones into a linked cluster, and close three real cross-linking/authorship-credit gaps against `slabsavvycpa.com` found while planning this.

**Architecture:** All content is pre-written below — every guide's full prose, FAQ set, and metadata is final, not a brief. The implementer's job is precise mechanical translation into the site's existing Astro template pattern (using `src/pages/guides/tax-on-selling-sports-cards-canada.astro` as the structural reference), wiring, and verification — not drafting or editing the substance. Where a step says "use this exact text," use it verbatim.

**Tech Stack:** Astro 5, TypeScript strict, Vitest (unit), Playwright (e2e).

## Global Constraints

- **TypeScript strict, no `any`.** `npm run typecheck` must pass.
- **Never state or imply a fact about a named business that the data does not carry.** None of this plan's content names a shop, consistent with the existing tax guide's own rule — do not add one.
- **Never invent a link to a page that doesn't exist.** Specifically: **do not link to a Slab Savvy Tracker web page** — it is a Telegram bot with no web landing page today (confirmed in `jarvis-memory/06-SportsCardsNearMe/2026-07-10-scnm-reseller-network-vision.md` and the 2026-07-12 ecosystem review). Every cross-link in this plan to Nathan's other work points at `https://slabsavvycpa.com`, which is live, or at pages already inside this repo.
- **Do not run `git add -A` or `git add .`** — stage explicit file paths only. The repo currently has other uncommitted, in-progress work that is **not part of this plan**: modified `src/lib/guides.ts`, `src/pages/guides/how-much-are-my-sports-cards-worth.astro`, `src/pages/guides/selling-your-collection.astro`, `src/pages/sell/[city]/index.astro`, `src/pages/sell/index.astro`, plus an untracked `src/pages/guides/tax-on-selling-sports-cards-canada.astro`. **Wait — re-check `git status` before Task 1.** By the time this plan executes, that prior work may already be committed (it was reviewed and recommended for commit on 2026-08-19/20). If it is still uncommitted when you start, this plan's `src/lib/guides.ts` edit (Task 5) will land on top of that file's *already-modified* working-tree content, not a clean `git diff` — read the live file before editing rather than assuming its committed state, and do not touch the other four files in that list.
- **Do not push to any remote.** Commit locally; Nathan approves every push.
- **Every new guide follows the established Astro template exactly**: `Base` layout, `breadcrumbListLd`/`faqPageLd`/`ldJson`/`absoluteUrl` from `../../lib/seo`, a `Byline` component, an `<article>`-free `<div class="mt-10 max-w-prose space-y-6 text-paper/90">` body wrapper — copy the structural skeleton from `src/pages/guides/tax-on-selling-sports-cards-canada.astro`, substitute only the content given below.

## Baseline facts this plan depends on (verified 2026-08-20)

| Fact | Value |
|---|---|
| Guides in `src/lib/guides.ts` today | 14 (includes `tax-on-selling-sports-cards-canada`) |
| The `CrossLinkCallout` component exists and is already used on 4 guides + 2 reseller pages | `src/components/CrossLinkCallout.astro`, props `{ heading, body, links: { label, href, external }[] }` |
| Established link label for Slab Savvy CPA everywhere it's used today | `Tax help for card dealers →`, always `href="https://slabsavvycpa.com"`, `external: true` |
| The tax guide is the **only** one of the 5 tax/dealer-adjacent guides that does **not** yet carry a `CrossLinkCallout` | Verified by grep — the other 4 (`card-grading-companies-canada`, `how-much-are-my-sports-cards-worth`, `psa-grading-mississauga`, `psa-grading-submissions-canada`) all have one; the tax guide itself does not, despite being the most directly on-topic |
| `EcosystemFooter.astro` already links every page site-wide to `slabsavvycpa.com` | No change needed there |
| The tax guide's Article JSON-LD `author` object links to `/about/` but carries no `sameAs` to `slabsavvycpa.com` | `src/pages/guides/tax-on-selling-sports-cards-canada.astro`, the `articleLd.author` block |
| `about.astro`'s prose mentions "the accounting side of my work" but never links to `slabsavvycpa.com`, and its `founder` Person schema carries no `sameAs` either | Both gaps confirmed by full read of the file |
| `llms.txt.ts` and `guides/index.astro` are both data-driven off `GUIDES` | No page changes needed beyond the `guides.ts` array edit — both pick up new entries automatically |

---

## File Structure

**Create:**
- `src/pages/guides/are-you-running-a-card-business.astro`
- `src/pages/guides/sports-card-tax-deductions-canada.astro`
- `src/pages/guides/record-keeping-for-card-sellers.astro`
- `tests/e2e/tax-guide-cluster.spec.ts`

**Modify:**
- `src/pages/guides/tax-on-selling-sports-cards-canada.astro` — add a `CrossLinkCallout`, add `sameAs` to the Article author, add three internal links to the new guides.
- `src/pages/about.astro` — add one link to `slabsavvycpa.com` in the existing prose, add `sameAs` to the `founder` Person schema.
- `src/lib/guides.ts` — add 3 entries, positioned immediately after `tax-on-selling-sports-cards-canada` so the tax cluster stays visually grouped on `/guides/`.

**Do not modify:** `src/lib/related-guides.ts` (its tag-driven rules are shop-tag-triggered — a business-classification or record-keeping guide isn't a natural fit for that mechanism; out of scope, noted at the end), the other 4 existing tax/dealer-adjacent guides (their own `CrossLinkCallout` usage is already correct and not part of this plan), any file in the "other in-progress session" list above.

---

## Task 1: Close the cross-link and authorship gaps on the existing tax guide

**Files:**
- Modify: `src/pages/guides/tax-on-selling-sports-cards-canada.astro`

**Interfaces:**
- Consumes: `CrossLinkCallout` from `../../components/CrossLinkCallout.astro` (new import).
- Produces: nothing later tasks depend on structurally, but Tasks 2–4's new guides link back to this page, so its slug and section anchors must not change.

- [ ] **Step 1: Check the file's current live state**

Run `git status` and `git diff src/pages/guides/tax-on-selling-sports-cards-canada.astro`. If the file is already committed (no diff, tracked), proceed normally. If it's still showing as untracked/uncommitted from the prior session's work, read it fresh with `cat` before editing — do not assume the 389-line version described in this plan is still byte-for-byte current.

- [ ] **Step 2: Add the `CrossLinkCallout` import**

Add to the import block at the top of the file:

```astro
import CrossLinkCallout from '../../components/CrossLinkCallout.astro';
```

- [ ] **Step 3: Add `sameAs` to the Article author**

Find the `articleLd` object's `author` block:

```astro
author: {
  '@type': 'Person',
  name: 'Nathan Wiebe',
  jobTitle: 'Chartered Professional Accountant',
  url: new URL('/about/', Astro.site).href,
},
```

Change it to:

```astro
author: {
  '@type': 'Person',
  name: 'Nathan Wiebe',
  jobTitle: 'Chartered Professional Accountant',
  url: new URL('/about/', Astro.site).href,
  sameAs: ['https://slabsavvycpa.com'],
},
```

- [ ] **Step 4: Add the three internal links to the new guides**

Find the "When to Get Actual Advice" section's second paragraph:

```astro
<p>
  If you're at the point of selling, our{' '}
  <a href="/guides/selling-your-collection/" class="text-prizm">guide to selling a collection</a> covers how to
  sort and prepare what you have, and{' '}
  <a href="/sell/" class="text-prizm">{buyerStores.length} shops across {buyerCityCount} Canadian cities</a>{' '}
  list buying collections. Not sure what anything is worth yet? Start with{' '}
  <a href="/guides/how-much-are-my-sports-cards-worth/" class="text-prizm">how to value a collection</a>.
</p>
```

Replace it with (adds three sentences, keeps everything existing):

```astro
<p>
  If you're at the point of selling, our{' '}
  <a href="/guides/selling-your-collection/" class="text-prizm">guide to selling a collection</a> covers how to
  sort and prepare what you have, and{' '}
  <a href="/sell/" class="text-prizm">{buyerStores.length} shops across {buyerCityCount} Canadian cities</a>{' '}
  list buying collections. Not sure what anything is worth yet? Start with{' '}
  <a href="/guides/how-much-are-my-sports-cards-worth/" class="text-prizm">how to value a collection</a>.
</p>
<p>
  Not sure which side of the collector-dealer line you're actually on? Our{' '}
  <a href="/guides/are-you-running-a-card-business/" class="text-prizm">plain-English CRA business test</a>{' '}
  walks through it. If the answer is "business," our{' '}
  <a href="/guides/sports-card-tax-deductions-canada/" class="text-prizm">guide to what you can deduct</a>{' '}
  and our{' '}
  <a href="/guides/record-keeping-for-card-sellers/" class="text-prizm">record-keeping guide</a> cover the two
  things that come next.
</p>
```

- [ ] **Step 5: Add the `CrossLinkCallout`**

Immediately **before** the existing disclaimer `<div class="mt-10 rounded-2xl border border-bord bg-panel p-5">`, insert:

```astro
<CrossLinkCallout
  heading="Need real tax help, not just a guide?"
  body="If a sale is big enough to matter, you're not sure which side of the collector-dealer line you're on, or you're staring down a CRA letter, Slab Savvy CPA is built specifically for card sellers and dealers."
  links={[{ label: 'Tax help for card dealers →', href: 'https://slabsavvycpa.com', external: true }]}
/>
```

This matches, verbatim in link label and `href`, the pattern already live on `card-grading-companies-canada.astro`, `how-much-are-my-sports-cards-worth.astro`, `psa-grading-mississauga.astro`, and `psa-grading-submissions-canada.astro` — the tax guide was the one guide missing it despite being the most on-topic.

- [ ] **Step 6: Typecheck**

Run `npm run typecheck`. Expected: clean. (The two new internal links point at pages that don't exist until Tasks 2–4 land — that's fine, Astro doesn't validate internal `href` strings at typecheck time. Task 7's build-and-link-check step is what actually verifies these resolve.)

- [ ] **Step 7: Commit**

```bash
git add "src/pages/guides/tax-on-selling-sports-cards-canada.astro"
git commit -m "feat: cross-link the tax guide to Slab Savvy CPA and the new tax-cluster guides"
```

---

## Task 2: Close the same gaps on the About page

**Files:**
- Modify: `src/pages/about.astro`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Add `sameAs` to the founder Person schema**

Find the `founder` object inside `aboutLd`:

```astro
founder: {
  '@type': 'Person',
  name: 'Nathan Wiebe',
  jobTitle: 'Chartered Professional Accountant',
  email: CONTACT,
  knowsAbout: [
    'sports card collecting',
    'sports card grading',
    'card shop retail',
    'accounting and tax for card dealers',
  ],
},
```

Add a `sameAs` field:

```astro
founder: {
  '@type': 'Person',
  name: 'Nathan Wiebe',
  jobTitle: 'Chartered Professional Accountant',
  email: CONTACT,
  sameAs: ['https://slabsavvycpa.com'],
  knowsAbout: [
    'sports card collecting',
    'sports card grading',
    'card shop retail',
    'accounting and tax for card dealers',
  ],
},
```

- [ ] **Step 2: Link the accounting-work sentence**

Find this sentence in the "Who runs this" section:

```astro
<p>
  I built this directory because I kept hitting the same problem myself: there was no single, current, genuinely
  national list of Canadian card shops. Searching turned up American directories, dead listings, and shops that
  closed years ago. The accounting side of my work also means I spend a fair amount of time on the money end of
  this hobby — what a collection is worth, what grading actually costs, what a dealer owes at tax time — which is
  where a lot of the guides here come from.
</p>
```

Replace the final sentence to add a link, keeping everything before it identical:

```astro
<p>
  I built this directory because I kept hitting the same problem myself: there was no single, current, genuinely
  national list of Canadian card shops. Searching turned up American directories, dead listings, and shops that
  closed years ago. The accounting side of my work also means I spend a fair amount of time on the money end of
  this hobby — what a collection is worth, what grading actually costs, what a dealer owes at tax time — which is
  where a lot of the guides here come from. If you need more than a guide, that's{' '}
  <a href="https://slabsavvycpa.com" target="_blank" rel="noopener" class="text-prizm">Slab Savvy CPA</a>, my
  accounting practice.
</p>
```

- [ ] **Step 3: Typecheck and commit**

```bash
npm run typecheck
git add src/pages/about.astro
git commit -m "fix: link the About page's accounting-work mention to Slab Savvy CPA"
```

---

## Task 3: New guide — "Are You Running a Card Business, or Just Collecting?"

**Files:**
- Create: `src/pages/guides/are-you-running-a-card-business.astro`

**Interfaces:**
- Consumes: `Base`, `Byline`, `CrossLinkCallout`; `absoluteUrl`, `breadcrumbListLd`, `faqPageLd`, `ldJson`, `type FaqItem` from `../../lib/seo`.
- Produces: the page at `/guides/are-you-running-a-card-business/`, linked from Task 1 and referenced by Tasks 4–5.

**This is the hub guide** — the plan's #1 priority, because every other tax-cluster guide points back to it.

- [ ] **Step 1: Create the file with this exact content**

```astro
---
import Base from '../../layouts/Base.astro';
import Byline from '../../components/Byline.astro';
import CrossLinkCallout from '../../components/CrossLinkCallout.astro';
import { absoluteUrl, breadcrumbListLd, faqPageLd, ldJson } from '../../lib/seo';
import type { FaqItem } from '../../lib/seo';

const title = 'Are You Running a Card Business, or Just Collecting?';
const description =
  'The same questions the CRA effectively asks, answered honestly: whether your card sales are a hobby the personal-use property rules cover, or a business where different tax rules — and different deductions — apply.';
const pagePath = '/guides/are-you-running-a-card-business/';
const published = '2026-08-20';
const modified = '2026-08-20';

const capsule =
  'There is no single line the CRA draws. It looks at the whole picture: why you bought the cards, how often you sell, how long you hold them, how much market knowledge you bring to it, and whether you act like a business — separate accounts, advertising, regular activity. Answer the ten questions below honestly and you will land close to one of three categories: casual seller, grey-zone flipper, or card business. Which one you are decides whether the $1,000 personal-use rule applies to you, whether you can deduct expenses, and whether GST/HST ever enters the picture.';

const faqs: FaqItem[] = [
  {
    question: 'Is there an official CRA test for hobby versus business?',
    answer:
      'Not a checklist CRA publishes and grades you against — the current approach comes from two Supreme Court of Canada decisions, Stewart v. Canada and Walls v. Canada, both from 2002. They moved the test away from an older "reasonable expectation of profit" standard toward a broader question: is the activity sufficiently commercial in nature? CRA weighs frequency, intent, business-like conduct, and time invested, and looks at the whole picture rather than any single factor.',
    link: { href: '/guides/tax-on-selling-sports-cards-canada/', label: 'How CRA taxes each outcome' },
  },
  {
    question: 'Can I be a collector and a card business at the same time?',
    answer:
      'Yes, and it is the normal position for a serious collector to be in. Cards from your personal collection you eventually sell can be a capital transaction, while cards you buy specifically to flip are business inventory — at the same time, in the same year. CRA looks at each transaction on its own facts rather than classifying you as one type of seller across the board.',
  },
  {
    question: "What's the single biggest factor CRA weighs?",
    answer:
      'Why you bought the card in the first place. Something bought because you wanted to own it sits on the collector side even if you later sell it for a profit. Something bought because you expected to flip it sits on the business side, even if only one of them ever actually sells. Everything else — frequency, time invested, advertising — is supporting evidence for that underlying intent.',
  },
  {
    question: 'Does it matter if I never registered a business or called myself a dealer?',
    answer:
      "No. CRA looks at conduct, not paperwork or self-description. Running a card business without ever registering anything, incorporating, or thinking of yourself as a dealer doesn't change how the income is taxed — it just means the classification question gets asked and answered later than it should have been, often at audit.",
  },
  {
    question: 'I sell a few cards a year from my own collection. Am I overthinking this?',
    answer:
      "For most casual sellers, yes. If you're clearing out a personal collection a handful of times a year, not buying to resell, and not checking comps before every purchase, you're almost certainly a personal-use seller and the $1,000 rule in our main tax guide covers you. This test matters most for the grey zone — the weekend flipper who isn't sure which side they've drifted to.",
    link: { href: '/guides/tax-on-selling-sports-cards-canada/', label: 'The $1,000 rule, explained' },
  },
];

const breadcrumbLd = breadcrumbListLd([
  { name: 'Home', url: absoluteUrl(Astro.site, '/') },
  { name: 'Guides', url: absoluteUrl(Astro.site, '/guides/') },
  { name: title, url: absoluteUrl(Astro.site, pagePath) },
]);
const articleLd: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description,
  datePublished: published,
  dateModified: modified,
  author: {
    '@type': 'Person',
    name: 'Nathan Wiebe',
    jobTitle: 'Chartered Professional Accountant',
    url: new URL('/about/', Astro.site).href,
    sameAs: ['https://slabsavvycpa.com'],
  },
  publisher: { '@type': 'Organization', name: 'Sports Cards Near Me' },
};
const faqLd = faqPageLd(faqs);
---
<Base title={`${title} | Sports Cards Near Me`} description={description}>
  <script type="application/ld+json" set:html={ldJson(breadcrumbLd)} />
  <script type="application/ld+json" set:html={ldJson(articleLd)} />
  <script type="application/ld+json" set:html={ldJson(faqLd)} />

  <nav class="mt-6 text-sm text-muted">
    <a href="/guides/" class="hover:text-paper">Guides</a> / Business or Hobby
  </nav>
  <h1 class="mt-3 text-5xl md:text-7xl">{title}</h1>
  <div class="refractor-rule mt-4 w-28"></div>
  <Byline published={published} modified={modified} />
  <p class="mt-4 max-w-prose text-paper/85" data-answer-capsule>{capsule}</p>

  <div class="mt-10 max-w-prose space-y-6 text-paper/90">
    <p>
      You sold some cards this year. Maybe you cleared out part of your personal collection. Maybe you flipped a
      couple of pulls you didn't need. Maybe you went a little harder than you planned and ended up shipping cards
      three times a week by December. Somewhere in there, a question started nagging at you: is this still just a
      hobby, as far as the CRA is concerned?
    </p>
    <p>
      It's a fair question, and it matters more than most collectors realize. Our{' '}
      <a href="/guides/tax-on-selling-sports-cards-canada/" class="text-prizm">main tax guide</a> covers what happens
      once you know the answer. This one is about getting the answer.
    </p>

    <h2 class="text-3xl">Four Kinds of Seller</h2>
    <p>Most people who sell cards land close to one of four spots on a spectrum. Almost nobody sits in exactly one box forever — you can move along it, and you can be in more than one at once.</p>
    <ul role="list" class="list-disc space-y-3 pl-5">
      <li>
        <strong>The closet cleanout.</strong> You found an old binder, listed a few cards, made some cash. You're not
        buying new inventory and you're not planning to do this again next month. This was a one-time thing.
      </li>
      <li>
        <strong>The occasional flipper.</strong> You spot a deal browsing Facebook groups or your local shop, grab
        it, hold it a while, and sell it for a profit when the timing feels right — maybe a few times a month. You're
        not tracking margins or managing inventory. You're a collector who occasionally cashes in when an opportunity
        lands in your lap.
      </li>
      <li>
        <strong>The regular seller.</strong> This feels like a side hustle. You're buying cards specifically to
        resell, you have a rough shipping routine, and you have a general sense of what's moving and what you're
        spending — without necessarily tracking every dollar. It's not your full-time job, but "just a hobby" doesn't
        feel quite right anymore either.
      </li>
      <li>
        <strong>The card business.</strong> This is a meaningful income source. You maintain an active storefront,
        grade regularly, track inventory, and reinvest profits. You might have a separate bank account for card
        transactions. If someone asked what you do on the side, you'd say "I sell cards."
      </li>
    </ul>
    <p>You might have started the year in one spot and ended it in another. That's normal — these are points on a spectrum, not rigid boxes, and CRA looks at the overall pattern when it decides how to treat your activity.</p>

    <h2 class="text-3xl">Ten Questions, Sixty Seconds, Honest Answers</h2>
    <p>
      This isn't a legal test CRA hands out — it's built from the same factors CRA actually weighs when deciding
      whether card selling is a hobby or a business. Nobody's grading you but yourself.
    </p>
    <ol class="list-decimal space-y-3 pl-5">
      <li><strong>Did you buy cards this year specifically to resell at a profit?</strong> Not cards you bought for your own collection that you later decided to sell — cards you grabbed because the numbers said you could flip them.</li>
      <li><strong>Do you check comps before you buy, looking for underpriced cards?</strong> Scanning sold listings for deals before you purchase is sourcing behaviour.</li>
      <li><strong>Do you sell cards most weeks?</strong> Not every single week without exception, but if shipping cards is a regular part of your routine, that counts.</li>
      <li><strong>Do you source inventory from multiple channels?</strong> Facebook groups, card shows, your local shop, eBay, breaks. Pulling from three or more shows effort CRA notices.</li>
      <li><strong>Did your gross card sales exceed $5,000 this year?</strong> Total revenue before any expenses, across every platform and cash sales combined.</li>
      <li><strong>Do you spend meaningful time on card selling?</strong> Listing, photographing, packaging, shipping, managing inventory — if it adds up to several hours a week, that's time invested.</li>
      <li><strong>Do you have a separate payment method or account for card transactions?</strong> A dedicated PayPal, a separate bank account, or even a distinct e-transfer address used only for card deals.</li>
      <li><strong>Have you been selling regularly for more than one year?</strong> CRA looks at sustained activity, not one good month. If this is year two or beyond of regular selling, the pattern matters.</li>
      <li><strong>Do you advertise your cards for sale?</strong> Posting listings in Facebook groups, running an eBay store, keeping a Whatnot channel — advertising is a business signal.</li>
      <li><strong>If someone at a card show asked what you do, would "I sell cards" be part of your answer?</strong> Not "I collect." Not "I dabble." If you'd naturally describe yourself as someone who sells cards, CRA might agree.</li>
    </ol>

    <h2 class="text-3xl">Reading Your Answers</h2>
    <p>
      <strong>Mostly no (0 to 3 yes answers).</strong> You're likely a casual seller disposing of personal collection
      items. The $1,000 personal-use property rule is your main concern, and it's likely doing all the work for you
      already.
    </p>
    <p>
      <strong>Mixed (4 to 6 yes answers).</strong> You're in the grey zone. CRA would look at the full picture before
      deciding, and so should you — read both the capital-gains and business-income sections of{' '}
      <a href="/guides/tax-on-selling-sports-cards-canada/" class="text-prizm">our main tax guide</a> and compare. If
      you're genuinely on the fence, a short conversation with an accountant is worth more than guessing.
    </p>
    <p>
      <strong>Mostly yes (7 to 10 yes answers).</strong> You're running a card business, whether or not you've been
      calling it one. The good news: business status means real deductions. Our{' '}
      <a href="/guides/sports-card-tax-deductions-canada/" class="text-prizm">deductions guide</a> covers what you can
      claim, and our{' '}
      <a href="/guides/record-keeping-for-card-sellers/" class="text-prizm">record-keeping guide</a> covers how to
      stay ahead of it without losing a weekend every March.
    </p>
    <p>
      One thing to keep in mind either way: different cards in the same year can land in different buckets. You might
      sell three cards from your personal collection (personal-use property) and flip ten others you specifically
      sourced to resell (business). CRA looks at each transaction on its own facts, not your year as a single lump.
    </p>

    <h2 class="text-3xl">What Actually Tips the Scales</h2>
    <p>Two things move you out of casual-seller territory faster than anything else, and either one alone is enough:</p>
    <ul role="list" class="list-disc space-y-3 pl-5">
      <li>
        <strong>Regular, repeated selling activity.</strong> Listing every week, shipping constantly, treating sales
        as an ongoing routine rather than an occasional event.
      </li>
      <li>
        <strong>Buying specifically to resell at a profit.</strong> Checking comps before you buy, grabbing
        underpriced cards, flipping within days or weeks of acquiring them. That's not personal use — it's commercial
        activity, whatever you call it.
      </li>
    </ul>
    <p>
      Two specific patterns land on the business side often enough to call out directly. <strong>Breaking</strong> —
      buying sealed product specifically to open and resell the individual cards — is buying goods to resell, which
      is what a business does, regardless of how fun it is. And <strong>regular show selling</strong>, especially
      buying inventory specifically to bring to the next{' '}
      <a href="/shows/" class="text-prizm">card show</a>, is a recognizable small trading business, table fee and
      all.
    </p>

    <CrossLinkCallout
      heading="Landed on 'business'? That changes what you should do next."
      body="Once card selling crosses into business income, the deductions, the record-keeping, and eventually GST/HST all work differently — and getting the classification wrong in either direction costs you either deductions or a CRA letter. Slab Savvy CPA works specifically with card sellers and dealers."
      links={[{ label: 'Tax help for card dealers →', href: 'https://slabsavvycpa.com', external: true }]}
    />

    <p class="text-sm text-muted">
      This checklist gives you a starting direction, not a professional classification. If your situation is complex
      — six figures in sales, cross-border inventory, multiple income sources — talk to a CPA who knows your file.
    </p>

    <section class="mt-12">
      <h2 class="text-2xl">FAQ</h2>
      <dl class="mt-4 space-y-6">
        {faqs.map((faq) => (
          <div>
            <dt class="font-semibold">{faq.question}</dt>
            <dd class="mt-1 max-w-prose text-muted">
              {faq.answer}
              {faq.link !== undefined && (
                <>
                  {' '}
                  <a href={faq.link.href} class="text-prizm">{faq.link.label}</a>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>

    <p class="text-sm text-muted">
      Spotted something out of date, or a situation this guide should cover? <a href="/suggest/" class="text-prizm">Let us know</a>.
    </p>
  </div>
</Base>
```

- [ ] **Step 2: Typecheck**

Run `npm run typecheck`. Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "src/pages/guides/are-you-running-a-card-business.astro"
git commit -m "feat: add the hobby-vs-business self-test guide, hub of the new tax cluster"
```

---

## Task 4: New guide — "What Can You Deduct When You Sell Sports Cards in Canada?"

**Files:**
- Create: `src/pages/guides/sports-card-tax-deductions-canada.astro`

**Interfaces:**
- Consumes: same as Task 3.
- Produces: the page at `/guides/sports-card-tax-deductions-canada/`.

- [ ] **Step 1: Create the file with this exact content**

```astro
---
import Base from '../../layouts/Base.astro';
import Byline from '../../components/Byline.astro';
import CrossLinkCallout from '../../components/CrossLinkCallout.astro';
import { absoluteUrl, breadcrumbListLd, faqPageLd, ldJson } from '../../lib/seo';
import type { FaqItem } from '../../lib/seo';

const title = 'What Can You Deduct When You Sell Sports Cards in Canada?';
const description =
  'Every expense a Canadian card-selling business can actually claim against its income — shipping, grading, supplies, software, home workspace, show costs — and the ones that don’t count, with real numbers.';
const pagePath = '/guides/sports-card-tax-deductions-canada/';
const published = '2026-08-20';
const modified = '2026-08-20';

const capsule =
  'If your card sales are business income, you can deduct any reasonable expense you incurred to earn that income — shipping, platform fees, supplies, software, grading, a share of your home workspace, and show costs, provided the trip was primarily for business. You do not need to incorporate to claim any of it: a sole proprietor claims every deduction in this guide. If you are a capital-gains seller instead of a business, your selling fees and shipping already come off your proceeds directly — this guide is for sellers reporting business income.';

const faqs: FaqItem[] = [
  {
    question: 'Do I need to incorporate a company to deduct business expenses?',
    answer:
      "No. You can claim every deduction in this guide as a sole proprietor — filing business income on your personal tax return without incorporating anything. Most card sellers never will, and for most, it's the right call.",
  },
  {
    question: 'Are grading fees a separate deduction?',
    answer:
      "No, and this trips people up. Grading fees don't come off as their own line item — they get added to what you paid for the card. Buy a card for $225 and pay $55 to grade it, and your cost basis on that card becomes $280. When you sell the slab, your taxable profit is the sale price minus $280 minus any selling fees. Same result as a separate deduction, different path — but it means the cost follows that specific card through your records rather than sitting as a general business expense.",
  },
  {
    question: 'Can I deduct the cost of cards I bought but haven’t sold yet?',
    answer:
      "Not yet. Cards you bought to resell but haven't sold by year-end are inventory, not an expense — they sit on your books as an asset until you actually sell them. Spending $5,000 on inventory in November doesn't create a $5,000 deduction in November if those cards are still sitting unsold on December 31. The cost becomes deductible in the year you sell each card.",
    link: { href: '/guides/tax-on-selling-sports-cards-canada/', label: 'How inventory and cost basis work' },
  },
  {
    question: 'Can I deduct my home office if I only pack and ship cards there sometimes?',
    answer:
      "Only the honest portion. CRA has two tests for a home workspace deduction: it needs to be your principal place of business, or you need to use it exclusively and regularly to earn income. If the space doubles as a guest bedroom or general living space, claiming its full square footage doesn't match either test — prorate based on your actual, honest business use.",
  },
  {
    question: 'What can’t I deduct?',
    answer:
      "Cards you keep in your own personal collection — those are personal property, not a business expense, even if you run a card business on the side. Packs you ripped purely for enjoyment, not to resell the pulls, are personal spending. Display cases, binders, and storage for your own collection don't count either. When one purchase serves both purposes — a hobby box where you sold the hit and kept the rest — only the portion allocated to what you sold is deductible.",
  },
];

const breadcrumbLd = breadcrumbListLd([
  { name: 'Home', url: absoluteUrl(Astro.site, '/') },
  { name: 'Guides', url: absoluteUrl(Astro.site, '/guides/') },
  { name: title, url: absoluteUrl(Astro.site, pagePath) },
]);
const articleLd: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description,
  datePublished: published,
  dateModified: modified,
  author: {
    '@type': 'Person',
    name: 'Nathan Wiebe',
    jobTitle: 'Chartered Professional Accountant',
    url: new URL('/about/', Astro.site).href,
    sameAs: ['https://slabsavvycpa.com'],
  },
  publisher: { '@type': 'Organization', name: 'Sports Cards Near Me' },
};
const faqLd = faqPageLd(faqs);
---
<Base title={`${title} | Sports Cards Near Me`} description={description}>
  <script type="application/ld+json" set:html={ldJson(breadcrumbLd)} />
  <script type="application/ld+json" set:html={ldJson(articleLd)} />
  <script type="application/ld+json" set:html={ldJson(faqLd)} />

  <nav class="mt-6 text-sm text-muted">
    <a href="/guides/" class="hover:text-paper">Guides</a> / Deductions
  </nav>
  <h1 class="mt-3 text-5xl md:text-7xl">{title}</h1>
  <div class="refractor-rule mt-4 w-28"></div>
  <Byline published={published} modified={modified} />
  <p class="mt-4 max-w-prose text-paper/85" data-answer-capsule>{capsule}</p>

  <div class="mt-10 max-w-prose space-y-6 text-paper/90">
    <p>
      Not sure whether your card selling counts as a business in the first place? Start with our{' '}
      <a href="/guides/are-you-running-a-card-business/" class="text-prizm">plain-English CRA test</a> — this
      guide is for sellers reporting business income, and the deductions below only apply once you're there.
    </p>

    <h2 class="text-3xl">The Rule</h2>
    <p>
      If you're reporting business income from selling cards, you can deduct reasonable expenses you incurred to earn
      that income. CRA asks two questions: was the expense incurred to earn business income, and was the amount
      reasonable? If both answers are yes, it counts.
    </p>
    <p>
      You do not need to form a company to claim any of this. Every deduction below is available to a sole
      proprietor — which is how most card sellers operate, and it works fine.
    </p>
    <p>
      If you're a capital-gains seller instead — not running a business — your selling fees and shipping
      already reduce your proceeds directly, which lowers your taxable gain the same way. That math is covered in{' '}
      <a href="/guides/tax-on-selling-sports-cards-canada/" class="text-prizm">our main tax guide</a>. This guide is
      specifically for business sellers.
    </p>

    <h2 class="text-3xl">What Counts</h2>
    <h3 class="text-xl">Shipping</h3>
    <p>
      Postage and packing costs tied to your sales are deductible — tracked shipping, bubble mailers, everything
      you spent to get a sold card to a buyer. Keep receipts or a monthly summary from your shipping account.
    </p>

    <h3 class="text-xl">Grading fees</h3>
    <p>
      These work differently than most people expect. A grading fee doesn't come off as its own expense — it
      gets added to what you paid for the card. Pay $225 for a card and $55 to grade it, and your cost basis becomes
      $280. That's the number you subtract from your proceeds when you sell the slab. The grading cost still reduces
      your taxable profit; it just travels with the specific card rather than sitting in a general expense category.
    </p>

    <h3 class="text-xl">Supplies</h3>
    <p>
      Penny sleeves, top loaders, team bags, magnetic holders, bubble mailers, tape, labels — anything you use to
      pack and protect cards for sale is a business expense. Individually small, but a monthly supplies run adds up
      across a year, and it's worth tracking.
    </p>

    <h3 class="text-xl">Software and subscriptions</h3>
    <p>
      Your online store subscription is deductible. So are card-scanning apps, inventory tools, and listing software.
      A photo-enhancement subscription used for your listing photos is deductible too, on the same reasoning —
      if it's a tool you use to earn card-selling income, it counts.
    </p>

    <h3 class="text-xl">Platform fees</h3>
    <p>
      Marketplace final-value fees, payment-processing fees — every fee a platform charges you to complete a
      sale is deductible. For many sellers, this is one of the largest costs after inventory itself.
    </p>

    <h3 class="text-xl">Photography equipment</h3>
    <p>
      If you're taking listing photos — and you should be — the equipment counts. A phone tripod, a light
      box, a backdrop, a ring light: if you bought it to photograph cards for sale, it's deductible. More expensive
      gear may need to be depreciated over several years rather than deducted all at once; ask your accountant where
      that line falls for a specific purchase.
    </p>

    <h3 class="text-xl">Convention and show costs</h3>
    <p>
      Table fees at card shows are deductible. So is travel and accommodation, if the trip was primarily for
      business — the key word is <em>primarily</em>. Drive four hours, rent a table, and sell all weekend? That's
      business. Drive four hours, buy one card, and spend the rest of the weekend at a resort with your family?
      That's a vacation with one deductible table fee in it. Split the costs honestly and document your reasoning.
    </p>

    <h3 class="text-xl">Home workspace</h3>
    <p>
      If you have a dedicated space where you pack, ship, list, and manage your card business, part of your housing
      costs may be deductible — provided the space is either your principal place of business, or you use it
      exclusively and regularly to earn income. Most sellers running a business from home meet the first test.
    </p>
    <p>
      Work out your share by dividing your workspace's square footage by your home's total size, then applying that
      percentage to your rent or a reasonable share of ownership costs, plus utilities on the same basis. Internet
      and phone are claimed differently — based on your actual business-use percentage, which may not match your
      workspace ratio. If the space also doubles as a guest room or general living space, reduce the claim to reflect
      real business use. Be honest with the split; it holds up better than an aggressive one.
    </p>

    <h3 class="text-xl">Cost of goods sold</h3>
    <p>
      What you paid for the cards you actually sold during the year is deductible — but only the cards you sold.
      Cards still sitting in your inventory at year-end aren't an expense yet; they become one when you sell them.
      Our{' '}
      <a href="/guides/tax-on-selling-sports-cards-canada/" class="text-prizm">main tax guide</a> covers the timing
      rules in full.
    </p>

    <h2 class="text-3xl">What Doesn't Count</h2>
    <p>
      Cards in your own personal collection are personal property — their cost doesn't reduce your business
      income, even if you also run a card business. Packs you ripped for your own enjoyment, not to resell the
      pulls, are personal spending. Display cases, binders, and storage for your personal collection are not business
      expenses either.
    </p>
    <p>
      The line gets blurry when one purchase serves both purposes. Buy a hobby box, sell the hit, keep the rest for
      your own collection? The portion of the box's cost allocated to the card you sold is deductible; the portion
      allocated to what you kept is not. Same logic applies to a show trip that doubles as a family vacation —
      only the share genuinely tied to business activity counts.
    </p>

    <CrossLinkCallout
      heading="Deductions add up fast once you're tracking them properly"
      body="Between grading fees folded into cost basis, inventory timing, and a home workspace calculation, business-income sellers have real complexity most collectors never touch. Slab Savvy CPA works specifically with card sellers and dealers."
      links={[{ label: 'Tax help for card dealers →', href: 'https://slabsavvycpa.com', external: true }]}
    />

    <p class="text-sm text-muted">
      This guide is educational, not personalized tax advice. Your actual claim depends on your own records and
      facts — before filing a significant deduction, check it against your situation with your own accountant.
    </p>

    <section class="mt-12">
      <h2 class="text-2xl">FAQ</h2>
      <dl class="mt-4 space-y-6">
        {faqs.map((faq) => (
          <div>
            <dt class="font-semibold">{faq.question}</dt>
            <dd class="mt-1 max-w-prose text-muted">
              {faq.answer}
              {faq.link !== undefined && (
                <>
                  {' '}
                  <a href={faq.link.href} class="text-prizm">{faq.link.label}</a>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>

    <p class="text-sm text-muted">
      Spotted something out of date, or a situation this guide should cover? <a href="/suggest/" class="text-prizm">Let us know</a>.
    </p>
  </div>
</Base>
```

- [ ] **Step 2: Typecheck**

Run `npm run typecheck`. Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "src/pages/guides/sports-card-tax-deductions-canada.astro"
git commit -m "feat: add the card-selling business deductions guide"
```

---

## Task 5: New guide — "Record-Keeping for Canadian Card Sellers: What CRA Actually Wants"

**Files:**
- Create: `src/pages/guides/record-keeping-for-card-sellers.astro`

**Interfaces:**
- Consumes: same as Task 3.
- Produces: the page at `/guides/record-keeping-for-card-sellers/`.

- [ ] **Step 1: Create the file with this exact content**

```astro
---
import Base from '../../layouts/Base.astro';
import Byline from '../../components/Byline.astro';
import CrossLinkCallout from '../../components/CrossLinkCallout.astro';
import { absoluteUrl, breadcrumbListLd, faqPageLd, ldJson } from '../../lib/seo';
import type { FaqItem } from '../../lib/seo';

const title = 'Record-Keeping for Canadian Card Sellers: What CRA Actually Wants';
const description =
  'What the CRA actually expects a card seller to keep, for how long, and the five fields that cover almost every situation — whether you sell a handful of cards a year or run a full card business.';
const pagePath = '/guides/record-keeping-for-card-sellers/';
const published = '2026-08-20';
const modified = '2026-08-20';

const capsule =
  'CRA’s record-keeping rules are simpler than most sellers expect. Keep records for six years from the end of the tax year they relate to. Digital records count if they’re complete and readable — exported statements, PDFs, clear screenshots. For every sale, you want five things: the date, what the card was, what you paid, what you sold it for, and the fees involved. Fifteen minutes a month beats a full weekend of guessing in March, and it’s the difference between proving a cost and CRA deeming you to have paid nothing for it.';

const faqs: FaqItem[] = [
  {
    question: 'How long do I need to keep records for card sales?',
    answer:
      'Six years from the end of the tax year they relate to. For a 2025 sale (the return filed in 2026), that means keeping records through the end of 2031. This is a general CRA rule, not specific to cards — the same period applies to any income or expense record.',
  },
  {
    question: 'Do digital records count, or do I need paper receipts?',
    answer:
      'Digital records are fine if they’re complete and readable. Exported spreadsheets, PDFs of statements, and clear screenshots all count. If you sell online, most of your records are already digital. For paper receipts — from shows, your local shop, or cash deals — scan and save them properly rather than relying on the physical copy surviving six years in a drawer.',
  },
  {
    question: 'I sold some cards for cash at a show with no receipt. What do I do?',
    answer:
      'CRA’s preference is always a receipt or invoice where one is realistically possible. When it isn’t, a same-day written record is the next best thing — a note in your phone with the date, the card, the price, and who you dealt with beats having nothing. Cash and no paper trail do not mean the sale is invisible to CRA or that it falls outside your reporting obligations; they just mean the burden of proof sits more heavily on your own notes.',
    link: { href: '/guides/tax-on-selling-sports-cards-canada/', label: 'Why cash sales are still taxable' },
  },
  {
    question: 'What’s the minimum I should actually track?',
    answer:
      'Five fields, per transaction: the date, a description of the card (player, set, year, parallel or serial number if relevant), what you paid including shipping to you, what you sold it for before fees, and the fees themselves. Every calculation in cost basis, capital gains, and business income math runs off exactly this information — track nothing else and you’re still covered for the numbers that matter.',
  },
  {
    question: 'What happens if I have no records for past sales and CRA asks?',
    answer:
      'Start tracking today regardless — going forward is what you can control. If platform data or bank records show unreported income from a prior year, CRA can still ask you to explain it, and clean records from here forward are your best protection, though they don’t make a genuinely unreported past year disappear. The fix for that is talking to an accountant, not guessing at old numbers on your own.',
  },
];

const breadcrumbLd = breadcrumbListLd([
  { name: 'Home', url: absoluteUrl(Astro.site, '/') },
  { name: 'Guides', url: absoluteUrl(Astro.site, '/guides/') },
  { name: title, url: absoluteUrl(Astro.site, pagePath) },
]);
const articleLd: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description,
  datePublished: published,
  dateModified: modified,
  author: {
    '@type': 'Person',
    name: 'Nathan Wiebe',
    jobTitle: 'Chartered Professional Accountant',
    url: new URL('/about/', Astro.site).href,
    sameAs: ['https://slabsavvycpa.com'],
  },
  publisher: { '@type': 'Organization', name: 'Sports Cards Near Me' },
};
const faqLd = faqPageLd(faqs);
---
<Base title={`${title} | Sports Cards Near Me`} description={description}>
  <script type="application/ld+json" set:html={ldJson(breadcrumbLd)} />
  <script type="application/ld+json" set:html={ldJson(articleLd)} />
  <script type="application/ld+json" set:html={ldJson(faqLd)} />

  <nav class="mt-6 text-sm text-muted">
    <a href="/guides/" class="hover:text-paper">Guides</a> / Record-Keeping
  </nav>
  <h1 class="mt-3 text-5xl md:text-7xl">{title}</h1>
  <div class="refractor-rule mt-4 w-28"></div>
  <Byline published={published} modified={modified} />
  <p class="mt-4 max-w-prose text-paper/85" data-answer-capsule>{capsule}</p>

  <div class="mt-10 max-w-prose space-y-6 text-paper/90">
    <h2 class="text-3xl">The Letter-Arrives Scenario</h2>
    <p>
      An envelope shows up from CRA. They're asking about your online sales and want to see your records —
      purchase receipts, sales records, proof of what you paid for the cards you sold. The letter gives you a
      deadline, often 30 days.
    </p>
    <p>
      Could you pull that together right now? If the honest answer is "not even close," you're not alone —
      that's not a character flaw, it's a systems problem. The fix isn't an elaborate setup that takes over your
      weekends. It's a habit small enough to actually keep.
    </p>

    <h2 class="text-3xl">What CRA Actually Requires</h2>
    <p>
      The rules are simpler than most people expect. Keep records for at least six years from the end of the tax year
      they relate to — for a 2025 sale, that means through the end of 2031.
    </p>
    <p>
      Digital records work if they're complete and readable. Exported spreadsheets, PDFs of platform statements, and
      clear screenshots all count. If you sell online, most of what you need is already digital by default. Paper
      receipts — from shows, your local shop, cash deals — should be scanned and saved properly rather than
      trusted to survive six years as a physical slip of paper.
    </p>
    <p>
      What counts as adequate: receipts or invoices for what you bought, bank and platform statements showing
      deposits, written records of cash and e-transfer transactions (date, what, how much, who), and proof of any
      expense you're claiming. For cash deals at shows and Facebook sales specifically, a receipt is always the
      preference; when that's genuinely not possible, a same-day note with the date, the card, the price, and who
      you dealt with is the next best thing. A spreadsheet entry beats that. Either one beats "I don't remember."
    </p>

    <h2 class="text-3xl">The Five-Field Minimum</h2>
    <p>If you track nothing else, track these five things. Every calculation in cost basis, capital gains, and business income runs off exactly this:</p>
    <ul role="list" class="list-disc space-y-3 pl-5">
      <li><strong>Date.</strong> When the transaction happened.</li>
      <li><strong>Card description.</strong> Player, set, year, and anything that identifies it — parallel, serial number, grade.</li>
      <li><strong>What you paid.</strong> Your purchase price, including shipping to you.</li>
      <li><strong>What you sold it for.</strong> The gross sale price, before fees.</li>
      <li><strong>Fees.</strong> Platform fees, payment processing, and shipping you paid on the sale.</li>
    </ul>
    <p>
      Log every transaction the day it happens if you can manage it. If that's unrealistic, a realistic minimum is
      exporting your platform statements once a month and dropping them in a folder — even that gives you
      something real to work from at tax time, instead of reconstructing a year from memory.
    </p>

    <h2 class="text-3xl">A Number CRA Sees That Isn't What You Owe Tax On</h2>
    <p>
      If you sell on a platform that reports to CRA, understand this distinction: what a platform reports is your
      gross sales total — not the same number as what you actually owe tax on. Your real tax situation depends
      on your seller profile, what you paid for the cards, and your expenses along the way. The gross number is just
      the starting point, and it will not match your net income, which is exactly why your own records matter —
      they're what explains the gap if CRA ever asks.
    </p>
    <p>
      "Nobody actually reports this" is advice worth ignoring. Platforms increasingly do report seller activity to
      CRA, so the real question isn't whether CRA can see your sales — it's whether the numbers you report match
      what they already have.{' '}
      <a href="/guides/tax-on-selling-sports-cards-canada/" class="text-prizm">Our main tax guide</a> covers exactly
      which platforms and thresholds trigger that reporting.
    </p>

    <CrossLinkCallout
      heading="Records are the whole game once you're past casual selling"
      body="Fifteen minutes a month of consistent tracking is worth more at tax time than a perfect memory. If you'd rather have someone build the system for you than build it yourself, Slab Savvy CPA works specifically with card sellers and dealers."
      links={[{ label: 'Tax help for card dealers →', href: 'https://slabsavvycpa.com', external: true }]}
    />

    <p class="text-sm text-muted">
      This guide is educational, not personalized tax advice. If CRA has already contacted you about your records,
      talk to an accountant before you respond rather than assembling everything alone under a deadline.
    </p>

    <section class="mt-12">
      <h2 class="text-2xl">FAQ</h2>
      <dl class="mt-4 space-y-6">
        {faqs.map((faq) => (
          <div>
            <dt class="font-semibold">{faq.question}</dt>
            <dd class="mt-1 max-w-prose text-muted">
              {faq.answer}
              {faq.link !== undefined && (
                <>
                  {' '}
                  <a href={faq.link.href} class="text-prizm">{faq.link.label}</a>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>

    <p class="text-sm text-muted">
      Spotted something out of date, or a situation this guide should cover? <a href="/suggest/" class="text-prizm">Let us know</a>.
    </p>
  </div>
</Base>
```

- [ ] **Step 2: Typecheck**

Run `npm run typecheck`. Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "src/pages/guides/record-keeping-for-card-sellers.astro"
git commit -m "feat: add the record-keeping guide for card sellers"
```

---

## Task 6: Wire the three new guides into `guides.ts`

**Files:**
- Modify: `src/lib/guides.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `/guides/` index and `llms.txt` both pick these up automatically — both are already data-driven off this array (verified in the baseline facts table), no further page changes needed.

- [ ] **Step 1: Read the live file first**

Per the Global Constraints note, `git diff src/lib/guides.ts` and read the current file before editing — it may carry the other in-progress session's `tax-on-selling-sports-cards-canada` addition already, committed or not. Find the existing entry:

```typescript
  {
    slug: 'tax-on-selling-sports-cards-canada',
    title: 'Do I Have to Pay Tax When I Sell Sports Cards in Canada?',
    dek: '...',
  },
```

- [ ] **Step 2: Insert the three new entries immediately after it**

```typescript
  {
    slug: 'are-you-running-a-card-business',
    title: 'Are You Running a Card Business, or Just Collecting?',
    dek: 'The same ten questions the CRA effectively asks, answered honestly — whether you land as a casual seller or a business decides which tax rules and deductions actually apply to you.',
  },
  {
    slug: 'sports-card-tax-deductions-canada',
    title: 'What Can You Deduct When You Sell Sports Cards in Canada?',
    dek: 'Every expense a card-selling business can actually claim — grading fees, shipping, supplies, home workspace — and the ones that don’t count, with real numbers.',
  },
  {
    slug: 'record-keeping-for-card-sellers',
    title: 'Record-Keeping for Canadian Card Sellers: What CRA Actually Wants',
    dek: 'What CRA actually expects you to keep, for how long, and the five-field minimum that covers you without a weekend of guessing in March.',
  },
```

(Write the real ’ character, not `’`, same note as Tasks 4–5.)

- [ ] **Step 3: Typecheck and run the unit suite**

```bash
npm run typecheck
npm test
```

Expected: both clean. No existing test should reference guide count by a hardcoded number (none did as of plan10/11) — if one does fail on a count, that test needs updating to compute the expected count rather than hardcode it, not this plan's new entries changed to fit an old number.

- [ ] **Step 4: Commit**

```bash
git add src/lib/guides.ts
git commit -m "feat: register the three new tax-cluster guides"
```

---

## Task 7: Build, verify the whole cluster resolves, and write the e2e test

**Files:**
- Create: `tests/e2e/tax-guide-cluster.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing later tasks depend on — this is the final verification task.

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: succeeds, page count increases by 3 over whatever the pre-plan baseline was (confirm the new guide directories exist under `dist/guides/`).

- [ ] **Step 2: Verify every new internal link actually resolves — check the whole build, not a sample**

```bash
python3 - <<'PY'
import pathlib, re

NEW_SLUGS = {
    'are-you-running-a-card-business',
    'sports-card-tax-deductions-canada',
    'record-keeping-for-card-sellers',
}

dist_guides = pathlib.Path('dist/guides')
for slug in NEW_SLUGS:
    p = dist_guides / slug / 'index.html'
    assert p.exists(), f'MISSING: {slug} did not build'
print('All 3 new guide pages built.')

# Confirm the tax guide's new links, and each new guide's own cross-links,
# resolve to real built pages.
checked = []
for html_path in dist_guides.rglob('index.html'):
    html = html_path.read_text()
    for m in re.finditer(r'href="(/guides/[a-z-]+/)"', html):
        href = m.group(1)
        target = pathlib.Path('dist') / href.strip('/') / 'index.html'
        if not target.exists():
            print(f'DEAD LINK: {html_path} -> {href}')
        checked.append(href)
print(f'{len(checked)} internal /guides/ links checked across the guides tree.')
PY
```

Expected: `All 3 new guide pages built.` and zero `DEAD LINK` lines.

- [ ] **Step 3: Confirm `guides/index.astro` and `llms.txt` both picked up the new entries without any code change**

```bash
grep -c "are-you-running-a-card-business\|sports-card-tax-deductions-canada\|record-keeping-for-card-sellers" dist/guides/index.html
grep -c "are-you-running-a-card-business\|sports-card-tax-deductions-canada\|record-keeping-for-card-sellers" dist/llms.txt
```

Expected: both commands report at least 3 (one per new slug; `guides/index.html` may show more if a slug appears in both an `href` and visible text).

- [ ] **Step 4: Write the e2e test**

Create `tests/e2e/tax-guide-cluster.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const NEW_GUIDES = [
  { path: '/guides/are-you-running-a-card-business/', heading: 'Are You Running a Card Business, or Just Collecting?' },
  { path: '/guides/sports-card-tax-deductions-canada/', heading: 'What Can You Deduct When You Sell Sports Cards in Canada?' },
  { path: '/guides/record-keeping-for-card-sellers/', heading: 'Record-Keeping for Canadian Card Sellers: What CRA Actually Wants' },
];

for (const guide of NEW_GUIDES) {
  test(`${guide.path} renders with structured data and a Slab Savvy CPA callout`, async ({ page }) => {
    await page.goto(guide.path);
    await expect(page.getByRole('heading', { name: guide.heading, level: 1 })).toBeVisible();

    const scripts = page.locator('script[type="application/ld+json"]');
    const bodies = await scripts.allTextContents();
    const types = new Set(bodies.map((b) => (JSON.parse(b) as { '@type': string })['@type']));
    expect(types).toEqual(new Set(['BreadcrumbList', 'Article', 'FAQPage']));

    await expect(page.locator('a[href="https://slabsavvycpa.com"]').first()).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, 'no horizontal scroll').toBe(false);
  });
}

test('the main tax guide now links to all three new cluster guides and to Slab Savvy CPA', async ({ page }) => {
  await page.goto('/guides/tax-on-selling-sports-cards-canada/');
  await expect(page.locator('a[href="/guides/are-you-running-a-card-business/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/sports-card-tax-deductions-canada/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/record-keeping-for-card-sellers/"]').first()).toBeVisible();
  await expect(page.locator('a[href="https://slabsavvycpa.com"]').first()).toBeVisible();
});

test('the About page links to Slab Savvy CPA', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.locator('a[href="https://slabsavvycpa.com"]').first()).toBeVisible();
});

test('the guides index lists all three new guides', async ({ page }) => {
  await page.goto('/guides/');
  await expect(page.locator('a[href="/guides/are-you-running-a-card-business/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/sports-card-tax-deductions-canada/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/guides/record-keeping-for-card-sellers/"]').first()).toBeVisible();
});
```

- [ ] **Step 5: Run it**

```bash
npx playwright test tests/e2e/tax-guide-cluster.spec.ts
```

Expected: all pass, both `mobile-375` and `desktop` projects.

- [ ] **Step 6: Run the full suite one more time**

```bash
npm test
npm run typecheck
npx playwright test
```

Expected: full green, matching or exceeding the last known-good counts from plan11 (247 unit tests, 101+ e2e tests passed with the same pre-existing 3 skips).

- [ ] **Step 7: Run the hours-honesty and superlative-claims guards specifically**

```bash
npx playwright test tests/e2e/hours-honesty.spec.ts
npx vitest run tests/unit/superlative-claims.test.ts
```

Expected: both pass — confirms the new guide content doesn't accidentally promise hours it can't back or make an unearned claim about a named business. Neither guide names a shop or promises hours, so this should pass without any special handling, but verify rather than assume.

- [ ] **Step 8: Commit the test**

```bash
git add tests/e2e/tax-guide-cluster.spec.ts
git commit -m "test: verify the tax guide cluster's links, schema, and callouts"
```

---

## Out of scope — flagged, not fixed

1. **`related-guides.ts`'s tag-driven system is not wired to the three new guides.** That module recommends guides to store/city pages based on a shop's `services`/`sports` tags (buys, grading, pokemon, hockey). None of the three new guides are a natural fit for tag-based triggering — "are you running a business" isn't a shop attribute. Leaving it alone is a judgment call, not an oversight; revisit only if a future data field (e.g., a store explicitly tagged as dealer-run) makes the fit real.
2. **The other 4 existing guides with `CrossLinkCallout` usage** (`card-grading-companies-canada`, `how-much-are-my-sports-cards-worth`, `psa-grading-mississauga`, `psa-grading-submissions-canada`) are not touched by this plan — their existing callouts and copy are already correct and consistent with the pattern this plan follows. No `sameAs` was added to their Article schema either; if that's wanted site-wide later, it's a separate small task, not bundled here.
3. **Slab Savvy Tracker** is deliberately never linked anywhere in this plan — it has no web page yet. Do not add a link to it even if a future session's guide draft is tempted to; that's the one hard "don't" carried over from the 2026-07-12 ecosystem research.

## Definition of done

- [ ] `npm test` passes, full suite, no regressions from the last known-good count.
- [ ] `npm run typecheck` reports no errors.
- [ ] `npm run build` succeeds; all 3 new guide pages exist under `dist/guides/`.
- [ ] The Task 7 Step 2 script reports **zero** dead `/guides/` links anywhere in the built guides tree.
- [ ] `npx playwright test` passes, including the new `tax-guide-cluster.spec.ts` and the existing `hours-honesty.spec.ts`.
- [ ] `tests/unit/superlative-claims.test.ts` still passes against the 3 new files.
- [ ] The tax guide, all 3 new guides, and the About page each carry a working link to `https://slabsavvycpa.com`.
- [ ] The tax guide's and all 3 new guides' Article schema `author` object carries `sameAs: ['https://slabsavvycpa.com']`.
- [ ] The About page's `founder` schema carries the same `sameAs`.
- [ ] `guides/index.astro` and `dist/llms.txt` both list all 3 new guides with zero additional code changes beyond `guides.ts`.
- [ ] No link anywhere in this plan's output points at a Slab Savvy Tracker web page.
- [ ] Nothing has been pushed to any remote.
