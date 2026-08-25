/**
 * Freshness guard for the tax-cluster guides.
 *
 * The tax content states which Canadian tax year its rules describe. Every other
 * kind of drift on this site is loud — a dead URL 404s, a bad form link fails a
 * test, a wrong ranking shows up in a diff. Stale tax content is silent: the page
 * keeps building, keeps ranking, and keeps giving last year's thresholds to
 * someone who is about to file. It carries Nathan's CPA credential, so the cost
 * of that is higher here than anywhere else on the site.
 *
 * `tests/unit/tax-content-year.test.ts` turns that silence into a build failure.
 */

/** The Canadian tax year the tax guides describe. Bump this when you refresh them. */
export const TAX_CONTENT_YEAR = 2025;

/** The calendar year that tax year is filed in — always the year after. */
export const TAX_FILING_YEAR = TAX_CONTENT_YEAR + 1;

/**
 * How many years behind the current tax year the content has fallen.
 *
 * The "current" tax year is the previous calendar year, because you file in
 * arrears: through all of 2026 the most recent completed tax year is 2025. So
 * content stamped 2025 is current for the whole of 2026 and goes one year stale
 * on 1 January 2027.
 *
 * Returns 0 while the content is current, and a positive number once it isn't.
 */
export function taxYearsBehind(now: Date, statedYear: number = TAX_CONTENT_YEAR): number {
  const currentTaxYear = now.getUTCFullYear() - 1;
  return Math.max(0, currentTaxYear - statedYear);
}

/**
 * How far behind the content is allowed to fall before the build fails.
 *
 * At 1, content stamped 2025 survives all of 2027 (one year behind) and fails from
 * 1 January 2028. Set this to 0 for the strict reading — fail as soon as the stated
 * year stops being the most recent completed tax year, i.e. from 1 January 2027.
 *
 * Worth knowing before changing it: site.yml also rebuilds on a daily schedule, so
 * when this trips it halts the nightly bake as well, and shop and show data stops
 * refreshing until the year is bumped. That is the forcing function working, but it
 * arrives on an ordinary morning with no warning.
 */
export const STALE_AFTER_YEARS_BEHIND = 1;

/** True once the content has fallen further behind than STALE_AFTER_YEARS_BEHIND allows. */
export function taxContentIsStale(now: Date, statedYear: number = TAX_CONTENT_YEAR): boolean {
  return taxYearsBehind(now, statedYear) > STALE_AFTER_YEARS_BEHIND;
}
