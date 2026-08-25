import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  STALE_AFTER_YEARS_BEHIND,
  TAX_CONTENT_YEAR,
  TAX_FILING_YEAR,
  taxContentIsStale,
  taxYearsBehind,
} from '../../src/lib/tax-year';

/**
 * The tax guides state which Canadian tax year their rules describe. Nothing else
 * on this site fails when that stamp goes stale — the page keeps building and keeps
 * ranking while quietly handing last year's thresholds to someone about to file,
 * under Nathan's CPA credential.
 *
 * The last test here is the alarm: it runs against the real clock and fails the
 * build once the content falls behind. `npm test` runs before the deploy step in
 * .github/workflows/site.yml, so a failure here stops the publish rather than
 * merely reporting after the fact.
 */

describe('tax content freshness', () => {
  it('counts years behind from the most recent COMPLETED tax year, not the calendar year', () => {
    // You file in arrears: through all of 2026 the most recent completed tax
    // year is 2025, so 2025 content is current for that whole year.
    expect(taxYearsBehind(new Date('2026-01-01T00:00:00Z'), 2025)).toBe(0);
    expect(taxYearsBehind(new Date('2026-12-31T00:00:00Z'), 2025)).toBe(0);
    // It goes stale the moment 2026 becomes a completed tax year.
    expect(taxYearsBehind(new Date('2027-01-01T00:00:00Z'), 2025)).toBe(1);
    expect(taxYearsBehind(new Date('2028-06-15T00:00:00Z'), 2025)).toBe(2);
  });

  it('never reports a negative age for content written ahead of the current year', () => {
    expect(taxYearsBehind(new Date('2026-06-01T00:00:00Z'), 2026)).toBe(0);
    expect(taxContentIsStale(new Date('2026-06-01T00:00:00Z'), 2026)).toBe(false);
  });

  it('tolerates exactly STALE_AFTER_YEARS_BEHIND years and fails past it', () => {
    // With the default of 1: 2025 content is fine through 2027, and fails in 2028.
    expect(STALE_AFTER_YEARS_BEHIND).toBe(1);
    expect(taxContentIsStale(new Date('2027-06-01T00:00:00Z'), 2025)).toBe(false);
    expect(taxContentIsStale(new Date('2028-01-01T00:00:00Z'), 2025)).toBe(true);
    // Strict mode (0) would fail as soon as the year stops being the most recent.
    expect(taxYearsBehind(new Date('2027-06-01T00:00:00Z'), 2025)).toBe(1);
  });

  it('derives the filing year as the year after the tax year', () => {
    expect(TAX_FILING_YEAR).toBe(TAX_CONTENT_YEAR + 1);
  });

  it('renders the stated year from the constant, so the guide and this guard cannot disagree', () => {
    const page = readFileSync('src/pages/guides/tax-on-selling-sports-cards-canada.astro', 'utf8');
    expect(page).toContain('TAX_CONTENT_YEAR');
    // A hardcoded four-digit year in the disclaimer would drift silently past this guard.
    const disclaimer = /reflects the rules for the ([^<]*?) Canadian tax year/.exec(page);
    expect(disclaimer, 'the disclaimer sentence stating the tax year was not found').not.toBeNull();
    expect(disclaimer![1]).toBe('{TAX_CONTENT_YEAR}');
  });

  it('THE ALARM: the published tax content still describes the current tax year', () => {
    const now = new Date();
    expect(
      taxContentIsStale(now),
      `The tax guides state the ${TAX_CONTENT_YEAR} tax year, which is now ` +
        `${taxYearsBehind(now)} year(s) behind — past the ${STALE_AFTER_YEARS_BEHIND}-year tolerance. ` +
        `This is a deliberate build failure, not a bug.\n\n` +
        `Re-check the tax cluster against current CRA rules — the capital gains inclusion ` +
        `rate, the $1,000 personal-use threshold, the $30,000 GST/HST small-supplier ` +
        `threshold, and the platform-reporting thresholds — then bump TAX_CONTENT_YEAR in ` +
        `src/lib/tax-year.ts.\n\n` +
        `Bumping the constant without re-checking the figures defeats the point of this test.`,
    ).toBe(false);
  });
});
