# Verified Resellers — PRD, v1 Spec & Roadmap

**Product:** the reseller network layer of sportscardsnearme.ca (SCNM)
**Author:** Fable, from Nathan's vision + three structured decision rounds, 2026-07-12
**Status:** APPROVED by Nathan 2026-07-12 ("Everything else looks fine") → plan: docs/superpowers/plans/2026-07-13-plan6-verified-resellers-v1.md

---

## 1. Vision (why this exists)

Canada's card market is inefficient: hundreds of skilled resellers operate with no storefront — living on eBay, Facebook, and Instagram — invisible to local buyers who think geographically ("who sells cards near me?"). SCNM already answers that question for 573 brick-and-mortar shops. Verified Resellers extends the answer to people: a trusted, city-anchored public identity for storefront-less sellers, feeding into (eventually) a cross-country network where shops and resellers collaborate on inventory — with the long-term goal of making the Canadian card market more efficient.

This is also the flywheel hub: reseller profiles → demand for inventory tools (Nathan's inventory-sheet products) → custom websites (website-building motion) → DMC/CMC. The network is the lead engine; the services are the business.

## 2. Decisions log (locked with Nathan, 2026-07-12)

| Decision | Choice | Notes |
|---|---|---|
| V1 audience | Resellers only — profile pages with outbound links (eBay / social / own site). No embedded inventory in v1. | Buyers arrive via SCNM's existing SEO traffic |
| "Verified" bar | **Numbers + Nathan's eyes.** Written floor (below) plus human review of every application. Government-ID tier added later. | The word "verified" is published from day one — the bar must be written before the first application |
| Money model | **Deferred deliberately.** Leading hypothesis: network stays free; revenue = services flywheel. Revisit at v2. | No pricing anywhere in v1 UI |
| Home | **Inside SCNM** — `/resellers/`, one brand, one codebase, inherits directory SEO | |
| Map presence | **City-centroid pins, distinct style** (Nathan's call, overriding the no-pin recommendation) | Pin must NOT imply a walk-in address — see §4.3 |
| Intake | **Form → sheet → Nathan approves** — same machinery as the store directory (new `Resellers` tab in the master sheet; daily rebuild publishes) | Zero new infrastructure |
| North star (6 mo) | **Reseller pull:** resellers applying unrecruited because profiles visibly send them buyers | Drives v2 priority |
| V2 priority | **Inventory lists** — profiles become destinations; sets up the network layer; ties to inventory-sheet products | eBay live embed considered, deferred (locks depth to eBay) |
| Scope | **All trading cards** — sports + Pokémon/TCG + vintage; specialty tags do the filtering | Matches directory + shows coverage |
| Naming | **"Verified Resellers"**, badge **"SCNM Verified"**, at `/resellers/` | Plain, honest, searchable |
| Profile contents | Identity basics + outbound links + optional published contact. **No public trust numbers** (feedback scores NOT displayed — considered and deselected) | Trust numbers/"verified since" = revisit in v1.1 |

## 3. The verification bar (v1, published)

A reseller earns **SCNM Verified** when they show **an established selling track record**:

- **eBay route:** 100+ feedback, ≥98% positive, account active ≥1 year, recent card sales visible.
- **Social route (Facebook/Instagram sellers):** equivalent evidence — an active selling history ≥1 year with consistent public activity and references Nathan can check (group admin vouches, visible sold posts).
- **Plus, always:** Nathan personally reviews every application. Meeting the floor earns consideration, not automatic approval.

### Badge revocation (Nathan’s intent, 2026-07-12: report-driven, human-investigated)

Revocation is **reactive, not surveilled**: SCNM does not monitor sellers algorithmically. The badge is removed when a credible problem reaches Nathan — a buyer report, word from the community, or a visible collapse in the seller’s public track record brought to his attention — and he investigates and decides. Site plumbing this requires in v1: a lightweight "Report a problem with this reseller" link on every profile (mailto or the suggest-form mechanism), and one published sentence: *"Verified status is removed if credible problems are reported to us and confirmed — tell us if something’s wrong."* No appeals process, no automation, no promises of response time.

Future tier (roadmap, not v1): **ID-Verified** — government-ID check layered on top, distinct badge.

Honesty guardrail: the site copy must say what verified means ("we checked their public selling track record") and what it doesn't (SCNM doesn't process transactions or guarantee any sale). This sentence ships in v1 — the word "verified" is doing legal work.

## 4. V1 spec

### 4.1 Reseller profile page — `/resellers/[slug]/`

Server-rendered like every SCNM page. Contents (all fields from the Resellers sheet tab):

- Display name or handle (real name optional — privacy is a feature)
- **SCNM Verified** badge (the only trust signal displayed in v1)
- City + province (city-level only; never an address)
- Photo or logo (fallback: initials chip, same pattern as store pins)
- Short bio — "what I collect and sell" (sanitized text, ~300 chars)
- Specialty tags: hockey, baseball, basketball, football, Pokémon, other TCG, vintage, memorabilia… (same chip styling as store tags)
- **Outbound links** — the point of v1: eBay store, Facebook, Instagram, own website. Each labeled, `rel="noopener nofollow"`, new tab.
- Optional published contact (email or DM handle) — reseller's explicit choice per field; empty = not shown
- JSON-LD: `Person` or `ProfilePage` with sanctioned escape pattern (same XSS discipline as the whole site: the ONE escaped `set:html` for JSON-LD, everything else templated)

### 4.2 Index — `/resellers/`

- Grid of reseller cards grouped/filterable by province (mirror store-directory patterns)
- Specialty-tag filter chips (client enhancement; complete HTML without JS, like city pages)
- Header explains the program + "Become a Verified Reseller" CTA → `/resellers/join/`
- The verified-meaning sentence (§3) lives here and on every profile footer

### 4.3 Map presence

- **Distinct pin style at city centroid** — visually different from store pins (outline/ghost treatment of the slab-pin mark, or badge-marked chip) so the map never implies a walk-in location
- Clicking opens the reseller card → profile (same interaction pattern as store pins)
- Multiple resellers in one city cluster into one centroid pin with a count (reuse supercluster)
- City pages gain a "Verified resellers in {city}" list section below stores (omitted when none — same conditional pattern as home shows strip)
- Conflict note for implementers: this touches the map files (`map-core.ts`, `pins.ts`, `map-data.ts`) — schedule it when no other crew owns them

### 4.4 Intake — `/resellers/join/`

- Application form (same mechanism as `/suggest/`): name/handle, city, province, links, specialties, bio, contact preference, evidence of track record (feedback URL etc.), consent checkbox (public listing)
- Submissions land in the master sheet (`Resellers` tab; columns mirror §4.1 + `Status` + `Evidence` + `Notes`)
- Nathan flips `Status` to `Verified` after checking §3 → daily rebuild publishes the profile. Rejection = row stays non-published; no account system, no login, nothing to secure in v1
- Bake: `bake-resellers.ts` following `bake-shows.ts` exactly (gviz by sheet name, **parse `Date(y,m0,d)` from `v` for any date columns — never trust `f`**, no count guard, per-row skip warnings)

### 4.5 Out of scope for v1 (explicitly)

Inventory display of any kind · accounts/login · payments · messaging/DM relay · reviews of resellers · trust-number display · ID verification · store claiming

## 5. Roadmap

**v1 — Profiles (build next):** everything in §4. Success = shipped, first 10–20 resellers verified (seed recruitment from Nathan's hobby network is fine even though the door is public).

**v1.1 — Trust polish (fast follow, data-driven):** "verified since" date; optionally re-visit public trust numbers; periodic link-rot check on outbound links (same automation family as the ratings refresh).

**v2 — Inventory lists (the north-star lever):** resellers publish a browsable list of what they have — powered by / integrated with Nathan's inventory-sheet products (flywheel becomes concrete). Profiles become destinations. Triggered when reseller pull is real (applications arriving unrecruited).

**v2.5 — Claim your listing:** the 573 stores can claim and edit their directory pages — builds the lightweight account layer v3 needs, warms shops up for the network.

**v3 — The network:** cross-country inventory visibility (shop↔reseller, reseller↔reseller), buyer-side "find this card near you" search across all published inventory. The market-efficiency endgame.

**Monetization checkpoint:** revisit at v2 with real usage data. Leading hypothesis stays free-network/paid-services; freemium storefront upgrades are the fallback.

## 6. Success metrics

- **North star:** unrecruited applications per month (reseller pull)
- v1 health: verified resellers listed; profile pageviews; outbound link clicks (PostHog events on link clicks — the "did it send buyers?" proxy resellers will ask about)
- Guardrail: application rejection rate (too low = bar too soft; too high = wrong applicants — copy needs work)

## 7. Open questions (parked, non-blocking)

1. Trust-number display (deselected for v1 — revisit with reseller feedback in v1.1)
2. eBay live embed as v2 alternative if inventory-list adoption stalls
3. Whether ID-Verified tier is a paid feature (interacts with monetization decision)
4. ~~Reseller removal policy~~ — RESOLVED 2026-07-12, see §3 Badge revocation
