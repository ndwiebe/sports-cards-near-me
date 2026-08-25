/**
 * The Canadian tax year the tax-cluster guides describe.
 *
 * Lives here rather than typed into the guide's prose so the annual refresh is a
 * one-line edit in a single place, and so nothing on the site can state one year
 * while something else states another.
 *
 * Refreshing it is a January job and a manual one: re-check the figures the guides
 * quote against current CRA guidance — the capital gains inclusion rate, the $1,000
 * personal-use threshold, the $30,000 GST/HST small-supplier threshold, and the
 * digital-platform reporting thresholds — then bump this. Changing the number
 * without re-checking those is worse than leaving it alone, because the page then
 * claims a currency it doesn't have.
 *
 * There is deliberately no automated guard on this. One was built and removed on
 * 2026-08-25: it could only ever check the label, not the figures, and because
 * site.yml rebuilds nightly a failure would have halted the bake and frozen shop
 * and show data — trading a disclosed weakness for a silent outage.
 */

/** The Canadian tax year the tax guides describe. */
export const TAX_CONTENT_YEAR = 2025;

/** The calendar year that tax year is filed in — always the year after. */
export const TAX_FILING_YEAR = TAX_CONTENT_YEAR + 1;
