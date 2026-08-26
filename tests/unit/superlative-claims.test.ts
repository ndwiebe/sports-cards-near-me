import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The positive twin of the absence-of-data rule.
 *
 * The standing rule says: never assert a shop LACKS something we merely failed to
 * confirm. There was no equivalent guard on the other direction — asserting a shop
 * IS the best/highest-rated — and on 2026-08-08 a review found three separate
 * versions of it live, all shipped the same day:
 *
 *   - 57 city pages titled "Rated & Mapped" carrying no rated shop at all
 *   - 255 pages offering a "ranking" of a single shop
 *   - province and city pages calling a 4.7 "the highest-rated" in provinces
 *     holding 5.0s — inside FAQ structured data, i.e. fed straight to Google
 *
 * All three had one shape: an evaluative phrase about a NAMED BUSINESS that
 * nothing in the code justified. Three in a day is a category, not bad luck, so
 * this is a guard rather than more care.
 *
 * The specific trap: `topRatedStore()` returns the highest WEIGHTED score
 * (Bayesian + review volume — Nathan's decided policy, see VOLUME_WEIGHT in
 * src/lib/seo.ts). That is deliberately not the highest star rating. Any copy
 * describing its output must say "ranks first" / "highest-ranked", never
 * "highest-rated" / "top-rated".
 */

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const sourceFiles = [...filesUnder('src/pages'), ...filesUnder('src/lib'), ...filesUnder('src/components')]
  .filter((p) => /\.(astro|ts)$/.test(p));

/** Strip comments and the FAQ answers that *describe the policy* rather than make a claim. */
function claimText(body: string): string {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*(\/\/|\*).*$/gm, '')
    // Mention, not use. Each of these frames DESCRIBES the bar a shop must clear
    // before we would apply the word — none of them applies it to a named shop.
    // Kept as three explicit frames rather than one clever rule: a "phrase is in
    // quotes means it's a mention" shortcut would have wrongly exempted the guide
    // deks in src/lib/guides.ts, which are quoted JS strings making a real claim.
    .replace(/before we'll\s+call it[^.]*\./g, '')
    .replace(/only\s+(?:called|described as)[^.]*\./g, '')
    .replace(/bar for a "top-rated" crown/g, '')
    .replace(/does not qualify a shop\./g, '');
}

describe('superlative claims about named businesses', () => {
  it('no page claims a shop is "highest-rated" or "top-rated" — the ranking is a weighted score', () => {
    const offenders: string[] = [];
    for (const path of sourceFiles) {
      const text = claimText(readFileSync(path, 'utf8'));
      // 2026-08-25: this pattern used to require the HYPHEN, so `Top rated: ${...}`
      // walked straight past it and shipped to 351 built pages (city, province and
      // Pokémon city meta descriptions). The separator is now optional.
      if (/(?:highest|top|best)[\s-]rated/i.test(text)) {
        offenders.push(path);
      }
    }
    expect(
      offenders,
      `These files claim a shop is highest/top-RATED. topRatedStore() returns the highest weighted ` +
        `RANK, not the highest star rating, so this is a false claim about a named business. ` +
        `Say "ranks first" or "highest-ranked" instead.`,
    ).toEqual([]);
  });

  it('every superlative in page copy is qualified by the ranking method, not left bare', () => {
    // A bare "ranks first" is fine; what is not fine is pairing a superlative with a
    // bare star number, which reads as a rating claim ("top-rated ... at 4.7 stars").
    const offenders: string[] = [];
    for (const path of sourceFiles) {
      const text = claimText(readFileSync(path, 'utf8'));
      // 2026-08-25: the gap class used to exclude `.`, so any interpolation with a
      // property access in it — `${topRated.name}` — broke the match. Only the
      // backtick (the template literal's own boundary) needs excluding.
      if (/(?:best|top)[\s-]rated[^`]{0,60}\$\{[^}]*rating\}/i.test(text)) {
        offenders.push(path);
      }
    }
    expect(
      offenders,
      'A superlative paired with a bare star value reads as a rating claim. State the ranking method.',
    ).toEqual([]);
  });
});
