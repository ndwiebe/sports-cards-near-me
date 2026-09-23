import type { ProvinceCode } from './types';

/**
 * Typed Featured-placement data, per PLAN.md step 3 (v1: shops only, one slot
 * per city) and step 16 (acceptance tests: expired placements, slot caps,
 * label visibility, rel="sponsored", ranking invariance).
 *
 * NOTHING HERE IS WIRED TO A PAGE. This is a library plus tests only — see
 * docs/superpowers/plans/2026-09-23-q4-sellprep-guides.md, Task 4. Nothing on
 * the live site changes by this file existing.
 *
 * KNOWN GAP, FLAGGED NOT FIXED: this task's literal spec asks for placement
 * data keyed on "city, store slug, start and end in UTC, label" — `storeSlug`
 * below. PLAN.md step 3 explicitly warns against keying paid placements to a
 * slug: slugs are generated from `name + city` and de-duplicated BY ROW ORDER
 * (see stores-build.ts), so a rename, a row reorder, or a duplicate-removal
 * pass can silently reassign which business a slug points to — meaning an
 * active PAID placement could silently repoint to a different shop after a
 * routine sheet edit. The fix (an immutable store-ID column in the sheet) is
 * a data-lane change out of this task's scope. Documented as a real gap in
 * docs/monetisation/featured-pricing-and-order-form.md, to close BEFORE any
 * slot is actually sold — not before this draft library.
 */
export interface FeaturedPlacement {
  /** Placement record ID — never the store slug. Stable for the life of the booking. */
  id: string;
  /** See the KNOWN GAP note above. */
  storeSlug: string;
  province: ProvinceCode;
  citySlug: string;
  /** ISO 8601, UTC (e.g. "2026-10-01T00:00:00Z"). Placement is active on [startUtc, endUtc). */
  startUtc: string;
  /** ISO 8601, UTC. Exclusive: a placement is no longer active AT this instant. */
  endUtc: string;
}

/**
 * The one wording this site ever uses for a paid placement — plain "Paid
 * advertisement", per PLAN.md gate G3 and the Competition Bureau's guidance
 * on disclosing a material connection. No euphemism ("Promoted", "Sponsored
 * content", "Partner listing") is used anywhere else in the codebase; if a
 * label is ever needed, it reads this constant rather than a new string, so
 * the wording can't drift between the library, disclosure copy, and pricing
 * terms (see docs/monetisation/disclosure-copy.md).
 */
export const FEATURED_LABEL = 'Paid advertisement';

/**
 * Every advertiser-controlled outbound link on a Featured surface carries
 * this `rel` value — PLAN.md step 6, per Google's outbound-link qualification
 * guidance. `sponsored` marks it as a paid link; `noopener` is the same
 * safety attribute every other outbound link on this site already carries
 * (see StoreCard.astro's Directions/Website links).
 */
export const FEATURED_LINK_REL = 'sponsored noopener';

/**
 * Build-time flag, OFF unless explicitly turned on. Same pattern as
 * PUBLIC_MAPBOX_TOKEN / PUBLIC_CLICK_TRACKER_URL in Base.astro: an
 * import.meta.env read with no ambient declaration, defaulting safely when
 * unset (as in every local/test run, where the env var is never set).
 *
 * This is the flag real page-wiring would read from, later — nothing reads
 * it yet. selectActiveFeaturedPlacements takes `enabled` as an explicit
 * parameter instead of reading this constant directly, so both the
 * off-by-default state and the flag-off behaviour are directly testable
 * without fighting Vite's build-time env substitution.
 */
export const FEATURED_PLACEMENTS_ENABLED: boolean =
  (import.meta.env as { PUBLIC_FEATURED_PLACEMENTS_ENABLED?: string }).PUBLIC_FEATURED_PLACEMENTS_ENABLED === 'true';

/** A placement is active on the half-open interval [startUtc, endUtc) — it stops being
 * active AT endUtc, not the instant after, so "expires at midnight" means midnight is
 * already expired rather than the placement's last active moment. */
export function isPlacementActive(placement: FeaturedPlacement, now: Date = new Date()): boolean {
  const start = new Date(placement.startUtc).getTime();
  const end = new Date(placement.endUtc).getTime();
  const t = now.getTime();
  return t >= start && t < end;
}

/**
 * Every currently-active Featured placement for one city, or an empty array —
 * never more than the input actually contains, and never anything at all when
 * `enabled` is false. This function reads ONLY placement records: it never
 * touches a Store object, never reads a rating or review count, and has no
 * way to influence `rankScore` / `byWeightedRankIn` / `byRecommendedRank` /
 * `bySportsCardRank` in seo.ts, which don't import this module and take no
 * placement data as input. That separation IS the ranking-invariance
 * guarantee (proved empirically in tests/unit/featured.test.ts), not just an
 * intention: a Featured placement literally cannot reach the sort comparator.
 *
 * Does not enforce the one-slot-per-city cap or overlap validation — PLAN.md
 * step 3/7's reservation ledger is a separate, not-yet-built concern (flagged
 * in docs/monetisation/featured-pricing-and-order-form.md). This selector
 * only filters what it's given; it never invents or drops a record beyond
 * what the active/enabled/city filters describe.
 */
export function selectActiveFeaturedPlacements(
  placements: FeaturedPlacement[],
  opts: { province: ProvinceCode; citySlug: string; now?: Date; enabled: boolean },
): FeaturedPlacement[] {
  if (!opts.enabled) return [];
  const now = opts.now ?? new Date();
  return placements.filter(
    (p) => p.province === opts.province && p.citySlug === opts.citySlug && isPlacementActive(p, now),
  );
}
