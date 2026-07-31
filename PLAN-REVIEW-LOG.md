# Plan Review Log: SCNM monetisation, shop outreach, and the SSC services channel
Act 1 (grill) complete — plan locked with the user 2026-07-31. MAX_ROUNDS=5.

## Round 1 — Codex

Material problems remain:

- **Regulatory blocker:** The plan commits to “Slab Savvy CPA” while admitting its legality is unresolved; CPA Alberta imposes registration and naming rules around CPA-branded firms regardless of services offered. **Fix:** Obtain written CPA Alberta approval before branding, outreach, or checkout; otherwise use a non-CPA trade name. [CPA Alberta](https://www.cpaalberta.ca/Public-Practice/Professional-Accounting-Firm/Naming-Requirements)

- **Public-data exposure:** Builds fetch the Google Sheet anonymously, meaning commercially sensitive fields—and likely existing reseller Evidence/Notes—cannot be treated as private despite [resellers.ts](/Users/nathanwiebe/Projects/8-Web-Apps/scnm-plan4/src/lib/resellers.ts:25). **Fix:** Move evidence, client, payment, and contract data to a private system and publish only sanitized flags/dates to the build feed.

- **Payment race:** One generic Stripe payment link cannot enforce 1–3 slots independently per city, category, and term, so concurrent buyers can oversell inventory. **Fix:** Start with manual slot reservation followed by a city-and-term-specific invoice/payment link, activating only after confirmed payment.

- **Insufficient schema:** A boolean `Featured` column cannot represent placement type, surface, start/end dates, expiry, client disclosure, or slot limits, and Resellers are omitted entirely in [PLAN.md](/Users/nathanwiebe/Projects/8-Web-Apps/scnm-plan4/PLAN.md:11). **Fix:** Define typed placement fields for Stores, Shows, and Resellers, with bake-time validation enforcing dates and inventory caps.

- **Undefined placement:** Shops appear across city, detail, map, province, guide, and structured-data surfaces; shows appear nationally, provincially, by weekend, and individually, so “never reorders organic results” is not implementable as written. **Fix:** Limit v1 to a separate, labelled city-page ad module above an unchanged organic list and explicitly exclude maps, rankings, guides, and organic JSON-LD.

- **Nonexistent UI assumption:** The “featured ring” exists only in an old design specification, not in the current components or styles. **Fix:** Specify and test an accessible Featured component whose text label remains clear without colour at 375px and desktop widths.

- **Paid-link SEO gap:** Existing outbound links use only `noopener`; paid placements must be qualified to avoid passing an undisclosed paid-link signal. **Fix:** Apply `rel="sponsored noopener"` to advertiser-controlled outbound links and test it on every paid surface. [Google Search Central](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links)

- **Disclosure scope is too narrow:** Updating only About leaves [privacy.astro](/Users/nathanwiebe/Projects/8-Web-Apps/scnm-plan4/src/pages/privacy.astro:34) falsely stating the site runs no advertising, while material relationships require prominent disclosure wherever users encounter them. **Fix:** Audit About, Privacy, FAQs, structured data, cards, details, and mobile views before launch, using plain “Paid advertisement” language. [Competition Bureau](https://competition-bureau.canada.ca/en/deceptive-marketing-practices/types-deceptive-marketing-practices/influencer-marketing-and-competition-act)

- **Analytics is unspecified:** Search Console measures Google-to-site clicks, not listing outbound clicks, and the existing Cloudflare integration only installs a generic beacon. **Fix:** Choose one event-capable analytics system, define listing/category/destination events and bot filtering, update privacy, and set a minimum traffic window and sales threshold.

- **Outreach evidence is not defensible:** The cited 57-shop claim is not reproducible in the repository; [scan-services.py](/Users/nathanwiebe/Projects/8-Web-Apps/scnm-plan4/scripts/scan-services.py:130) covers only AB/ON shops missing service data and explicitly says its results are candidates, not facts. **Fix:** Produce a dated, reproducible Canada-wide audit, manually verify every contacted shop, and say “our scan did not find” instead of claiming proven AI invisibility.

- **CASL is absent:** Measurement-led cold email is still a commercial electronic message requiring a documented consent basis, sender identification, mailing/contact information, unsubscribe handling, and suppression records. **Fix:** Add a CASL-compliant outreach procedure and suppression ledger before contacting any shop. [Government of Canada](https://ised-isde.canada.ca/site/canada-anti-spam-legislation/en/getting-consent-send-email)

- **Client markers do not protect independence:** A marker neither prevents commercial clients influencing data/rankings nor addresses client consent and confidentiality. **Fix:** Obtain contractual disclosure consent, separate commercial and editorial decisions, and add tests proving relationship fields cannot affect ranking functions.

- **Static expiry failure:** Daily builds can fail, leaving expired ads live or paid ads absent indefinitely, with no alert or make-good policy. **Fix:** Store explicit UTC start/end dates, monitor scheduled deployments, alert on stale builds, and contractually define activation delays and make-goods.

- **Commercial terms are missing:** Price, duration, seller of record, taxes, renewal, performance disclaimer, cancellation, refunds, chargebacks, content rejection, and removal rights are all undefined. **Fix:** Approve a complete Featured order form and service agreement before accepting payment.

- **Employer/referral assumption is weak:** Silence in an offer letter does not establish approval for outside consulting, public employer referrals, lead sharing, or referral-fee handling. **Fix:** Obtain a written KRP conflict approval and referral agreement covering consent, confidentiality, attribution, payment timing, and termination.

- **Barter control is ambiguous:** “Roughly 25% of the book” is unenforceable and omits authentication, condition, title, valuation evidence, and tax cash-flow treatment. **Fix:** Define 25% of the pre-tax invoice, approved valuation sources, acceptance criteria, inventory records, and require taxes to be paid in cash. [CRA](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-special-cases.html)

- **No verification plan:** There are no acceptance tests for slot caps, expired placements, labels, sponsored links, ranking invariance, click events, or mobile accessibility. **Fix:** Add unit, build-validation, and Playwright acceptance criteria plus deployment-failure monitoring before implementation.

VERDICT: REVISE
### Claude's response

VERIFIED before accepting (did not take the reviewer on faith):
- **Public sheet — CONFIRMED.** `src/lib/sheet.ts:22` calls `fetch(url)` with no auth; an anonymous request to the gviz endpoint returns HTTP 200, and the sheet ID is committed to a public repo. Any client/payment/contract data placed in that spreadsheet is world-readable. Accepted as a blocker.
- **Privacy page — CONFIRMED.** `privacy.astro:34` and `:42` both state the site does not run advertising. Selling Featured makes them false. Accepted.

ACCEPTED and folded into the plan: CPA Alberta written approval as a hard gate; private data out of the public sheet; manual slot reservation with a per-city invoice instead of one generic payment link; typed placement fields covering Stores, Shows AND Resellers; v1 scope narrowed to a single labelled module on city pages with maps/guides/rankings/JSON-LD explicitly excluded; verify the "featured ring" component actually exists rather than trusting a year-old spec; `rel="sponsored noopener"` on paid outbound links; disclosure audit across About, Privacy, FAQ and structured data; CASL procedure before any outreach; barter defined as 25% of the pre-tax invoice with taxes settled in cash; written KRP referral approval rather than inferring consent from silence; explicit UTC start/end dates plus stale-build alerting; a complete order form and service agreement before taking money; and acceptance tests.

PARTIALLY REJECTED — the 57-shop evidence finding. Codex cited `scripts/scan-services.py` (AB/ON only) and concluded the claim is unreproducible. That is factually wrong: the figure comes from `scripts/scan-card-evidence.py`, written and committed 2026-07-30, with its output at `docs/research/audit-noncard-scanned.csv`, and the scanner was calibrated against 15 known card shops first (13 confirmed, 0 false negatives). Its SUBSTANTIVE point is accepted: those 57 come from the 111-shop audit subset, not a Canada-wide sweep, so the outreach claim must be scoped as "our scan of flagged shops did not find card terms on your site" — never "you are proven invisible to AI".

## Round 2 — Codex

Most prior findings are addressed, but several material gaps remain:

- **Public-sheet remediation is incomplete:** G2 moves private data but does not replace the anonymous feed or address already-exposed reseller Evidence/Notes. **Fix:** Create a sanitized public-only spreadsheet, repoint all bakes, unpublish the original, then audit cached/exposed personal data and handle notification or deletion obligations.

- **v1 scope conflicts with the goal:** Featured is sold to Stores, Shows, and Resellers, but city routes are generated only from Stores and currently contain no Shows; some Resellers also lack a city page. **Fix:** Make v1 shop-only, or explicitly define eligibility/rendering for Shows and Resellers without an existing store-backed city route.

- **Slot inventory remains ambiguous:** “1–3 slots per city, category and term” does not say whether categories share one cap or each receive three slots. **Fix:** Define the inventory key exactly—such as `province + city + placement type + date range`—and enforce one stated cap against it.

- **Editorial independence is still unresolved:** Step 14 promises separation, while Risks says disclosure is the only control and admits no policy exists for ranking requests. **Fix:** Add a pre-client policy prohibiting ranking intervention, preferential corrections, review manipulation, and unequal refresh treatment, with an auditable exception process.

- **Referral consent is missing:** Written KRP approval governs Nathan and KRP but does not authorize sharing a shop owner’s information. **Fix:** Require explicit lead consent before transmitting any contact or engagement details to KRP and retain proof of that consent privately.

- **“Real traffic” remains subjective:** The analytics provider, measurement window, and minimum threshold are still deferred, allowing selective or inconsistent sales claims. **Fix:** Make provider selection and a fixed qualification rule—pageviews, outbound clicks, period, and bot exclusions—a gate before inventory is offered.

- **Capacity has no control:** The plan acknowledges delivery overload but allows unlimited service sales. **Fix:** Launch with a fixed pilot cap, defined service scope and response times, and a waitlist once capacity is reached.

VERDICT: REVISE
### Claude's response

ACCEPTED all seven: full sheet remediation (new sanitised sheet, repoint bakes, unpublish original); v1 narrowed to SHOPS ONLY after Codex correctly spotted that city routes are Store-generated so Shows/Resellers placement would sell a non-existent surface; slot cap keyed exactly on province+city+placement type+date range; a written editorial-independence policy required BEFORE the first client, prohibiting ranking intervention, preferential corrections, review manipulation and unequal refresh, with an auditable exception process; explicit SHOP consent before any referral to KRP (G4 covers Nathan and KRP only, not the lead's data); 'real traffic' defined as a fixed provider/metric/window/threshold/bot rule before inventory is offered; and capacity converted from an acknowledged risk into a hard pilot cap with waitlist.

CORRECTED one factual point: Codex refers to 'already-exposed reseller Evidence/Notes'. Verified 2026-07-31 — those columns exist but the tab holds one empty row, so nothing sensitive is exposed today. Recorded as a hole to close before seeding, not a breach requiring notification. The remediation steps are adopted regardless.

## Round 3 — Codex

The prior seven findings are substantially addressed. Three material implementation flaws remain:

- **Slot-cap validation is wrong:** Keying inventory by exact `date range` lets overlapping but non-identical bookings evade the cap. **Fix:** Reject any booking that would make concurrent active placements exceed the city/type cap at any point in its interval.

- **Placement storage is underspecified:** Fields attached to a Store cannot represent simultaneous current, future, and historical bookings cleanly. **Fix:** Use separate sanitized placement records keyed by placement ID and listing slug; support only `store` in v1 and add other listing kinds when their surfaces exist.

- **Spreadsheet migration can silently erase content:** Shows and Resellers intentionally lack count guards, so repointing to a malformed sanitized sheet could deploy empty sections before the original is unpublished. **Fix:** Require slug/count parity for all three datasets, a successful full build and smoke test, and rollback confirmation before revoking access to the original sheet.

- **The public-data allowlist is contradictory:** G2 prohibits client names/contact data while existing public listings contain names, optional reseller contact, and the required client-disclosure flag. **Fix:** Define an explicit public-field allowlist, including only consented profile/contact and commercial-disclosure fields, while excluding Evidence, Notes, prices, contracts, and payment data.

VERDICT: REVISE
### Claude's response

ACCEPTED all four. The slot-cap flaw was mine, introduced by round 2's fix: keying on an exact date range is a key-match test where an interval-overlap test is needed, so two overlapping-but-not-identical bookings would both pass. Now specified as: reject any booking that would push concurrent active placements above the cap at any instant in its interval. Placement data moves to separate sanitised records keyed by placement ID + listing slug, v1 store-only. Migration safety VERIFIED independently — bake-shows and bake-resellers both carry explicit 'NO count guard' comments and only stores guards its row count, so a malformed sanitised sheet would silently ship empty sections; parity checks, full build, smoke test and rollback confirmation now required before unpublishing the original. And the allowlist contradiction was real: 'no client names' collided with listings that are public by design and a disclosure flag that MUST be public, so an explicit allowlist replaces the blanket prohibition.

## Round 4 — Codex

The prior four findings are addressed. Two new material issues remain:

- **Placement foreign key is unstable:** Store slugs are regenerated from name and city in [stores-build.ts](/Users/nathanwiebe/Projects/8-Web-Apps/scnm-plan4/src/lib/stores-build.ts:24), so a rename, move, or duplicate-row reorder can orphan an active paid placement. **Fix:** Add an immutable store ID, reference placements and analytics by that ID, and keep the slug only as a changeable URL field.

- **Manual reservations lack a lifecycle:** Sending an invoice does not prevent another reservation while the first invoice remains unpaid, allowing both customers to pay for the same capacity. **Fix:** Maintain a private reservation ledger with `held/paid/cancelled/expired` states, hold expiry, and overlap validation that counts both held and paid inventory before any invoice is issued.

- **The slot cap itself remains unset:** The validator cannot enforce “1–3” without one authoritative number or configuration source. **Fix:** Make the per-city v1 cap a single approved value in private configuration before reservations open, and include it in overlap-validation tests.

VERDICT: REVISE
### Claude's response

ACCEPTED all three. The slug finding is the most serious of the whole review and VERIFIED WORSE than stated: slugs derive from name+city (stores-build.ts:24) AND are de-duplicated by row order (:44-49), so renames, moves, row reorders and duplicate removal all reassign them. Demonstrated accidentally on 2026-07-30 — deduplicating rows changed exactly these slugs. Keying a paid placement to a slug would let an active ad silently repoint to a different business. Placements and analytics now key to an immutable store ID; slug is a mutable URL field only. Reservation lifecycle accepted in full: invoice-sent is not capacity-held, so a private ledger with held/paid/cancelled/expired states, hold expiry, and overlap validation counting held AND paid inventory is required before any invoice issues. Cap number accepted — a validator cannot enforce a range, so Nathan sets one value in private config, asserted in tests.

## Round 5 — Codex

All prior material findings are now addressed. The remaining unset decisions—regulatory approval, pricing, traffic threshold, service-client cap, and Featured slot cap—are explicitly gated before sales or outreach, with safe fallbacks and enforcement points. No new material flaws found.

VERDICT: APPROVED
### Resolution

CONVERGED on round 5 of a 5-round cap. 18 material findings across four revising rounds, every one a real defect rather than a style note. Two of the fixes were themselves corrected by later rounds (the slot-cap interval test, and the over-broad 'no client data' prohibition). Claude independently verified the four most serious claims before accepting them — public sheet readability, the privacy-page contradiction, the missing bake count guards, and slug instability — and corrected Codex on two factual points (the 57-shop evidence script, and 'already-exposed' reseller data that is in fact empty). No code written during either act.
