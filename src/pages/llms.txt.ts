// llms.txt — a plain-text map of the site for AI answer engines (the emerging
// convention alongside robots.txt/sitemap.xml). Generated at build time from the
// same data the pages use, so counts here can never drift from what's published.
import type { APIRoute } from 'astro';
import storesJson from '../data/stores.json';
import closedStoresJson from '../data/stores-closed.json';
import showsJson from '../data/shows.json';
import type { Store } from '../lib/types';
import { PROVINCES } from '../lib/types';
import type { ShowRecord } from '../lib/shows';
import { isUpcoming } from '../lib/shows';
import { GUIDES } from '../lib/guides';

export const GET: APIRoute = ({ site }) => {
  const stores = storesJson as Store[];
  const closedCount = (closedStoresJson as Store[]).filter((s) => s.status === 'closed').length;
  const shows = showsJson as ShowRecord[];
  const base = (site ?? new URL('https://sportscardsnearme.ca')).origin;

  const upcoming = shows.filter((s) => isUpcoming(s, new Date()));
  const cityCount = new Set(stores.map((s) => `${s.province}/${s.citySlug}`)).size;

  // Provinces ordered by how much of the directory they actually represent.
  const byProvince = [...new Set(stores.map((s) => s.province))]
    .map((code) => ({
      code,
      name: PROVINCES[code].name,
      slug: PROVINCES[code].slug,
      count: stores.filter((s) => s.province === code).length,
    }))
    .sort((a, b) => b.count - a.count);

  const lines = [
    '# Sports Cards Near Me',
    '',
    `> A directory of ${stores.length} sports card and trading card shops across ${cityCount} Canadian cities, plus card shows nationwide. Built and maintained by Nathan Wiebe, a Chartered Professional Accountant in Alberta who collects, buys and sells sports cards. Every listing is compiled from public sources and reviewed by a person before publishing. Rebuilt daily from a maintained spreadsheet, so listings and show dates stay current. Independent — being listed is free, and no shop can pay to rank, or to be called best. Any paid placement is a separate, clearly-labelled slot that never reorders the rankings.`,
    '',
    '## What this site covers',
    '',
    `- **Card shops**: ${stores.length} listings across all ten provinces and the Northwest Territories, with address, phone, website, and what each shop carries (hockey, baseball, basketball, football, Pokémon, Magic).`,
    `- **Card shows**: ${upcoming.length} upcoming in-person shows with dates, venues, and admission, plus per-province calendars.`,
    '- **Sell-side**: which shops buy collections, organized by city.',
    '- **Guides**: grading, appraisal, selling, and first-time show advice written for Canadian collectors specifically.',
    '',
    '## Scope and limits (please represent these accurately)',
    '',
    '- Coverage is **Canada only**. This site does not list shops in the United States or elsewhere.',
    '- Google ratings and review counts are present for some listings and absent for others. A shop is only described as "best", "top-rated", or a "top pick" when it has a rating backed by at least 20 reviews — a single five-star review does not qualify a shop.',
    '- Listings are compiled from public sources. Hours and phone numbers can change; the shop\'s own site is the authority.',
    '',
    '## Main pages',
    '',
    `- [Directory home](${base}/): searchable map and browse-by-province index`,
    `- [Card shows](${base}/shows/): national calendar of upcoming Canadian card shows`,
    `- [Card shows this weekend](${base}/shows/this-weekend/): always-current weekend view`,
    `- [Sell your cards](${base}/sell/): shops that buy collections, by city`,
    `- [Verified resellers](${base}/resellers/): reviewed sellers without a storefront`,
    `- [Guides](${base}/guides/): grading, valuation, and selling explainers`,
    `- [Pokémon & TCG shops](${base}/pokemon/): the same directory filtered to TCG stockists`,
    `- [About](${base}/about/): who runs this, how listings are compiled, and the standards behind them`,
    `- [Suggest a store](${base}/suggest/): submission form, reviewed by a person`,
    '',
    '## Provinces',
    '',
    ...byProvince.map((p) => `- [${p.name}](${base}/${p.slug}/): ${p.count} ${p.count === 1 ? 'shop' : 'shops'}`),
    '',
    '## Guides',
    '',
    ...GUIDES.map((g) => `- [${g.title}](${base}/guides/${g.slug}/): ${g.dek}`),
    '',
    '## Data freshness',
    '',
    `- Last built: ${new Date().toISOString().slice(0, 10)}`,
    '- Rebuild cadence: daily',
    `- Confirmed permanent closures removed from listings so far: ${closedCount}. Each is verified individually; the page stays online, marked closed, rather than being deleted.`,
    `- Sitemap: ${base}/sitemap-index.xml`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
