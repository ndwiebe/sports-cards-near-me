import { describe, expect, it } from 'vitest';
import { groupShowsIntoSeries, nextInSeries } from '../../src/lib/shows';
import type { ShowRecord } from '../../src/lib/shows';
import showsJson from '../../src/data/shows.json';

const makeShow = (over: Partial<ShowRecord> = {}): ShowRecord => ({
  slug: `s-${over.startDate ?? '2026-01-01'}`,
  name: 'Test Show',
  city: 'Calgary',
  citySlug: 'calgary',
  province: 'AB',
  startDate: '2026-01-01',
  ...over,
});

describe('groupShowsIntoSeries', () => {
  it('groups shows by exact name + province + city, case/whitespace-insensitively', () => {
    const shows = [
      makeShow({ slug: 'a', name: 'Capital Trade Shows: Card & Comic Show', startDate: '2026-08-09' }),
      makeShow({ slug: 'b', name: '  capital trade shows: card & comic show  ', startDate: '2026-09-12' }),
      makeShow({ slug: 'c', name: 'Capital Trade Shows: Pokemon Show', startDate: '2026-08-16' }),
    ];
    const series = groupShowsIntoSeries(shows);
    expect(series).toHaveLength(1); // the Pokemon show has only 1 date -> not a series
    expect(series[0]?.shows.map((s) => s.slug)).toEqual(['a', 'b']);
  });

  it('never groups a singleton show', () => {
    expect(groupShowsIntoSeries([makeShow()])).toEqual([]);
  });

  it('keeps the same name in different provinces as separate series', () => {
    const shows = [
      makeShow({ slug: 'a', province: 'AB', startDate: '2026-01-01' }),
      makeShow({ slug: 'b', province: 'AB', startDate: '2026-02-01' }),
      makeShow({ slug: 'c', province: 'BC', citySlug: 'calgary', startDate: '2026-01-01' }),
      makeShow({ slug: 'd', province: 'BC', citySlug: 'calgary', startDate: '2026-02-01' }),
    ];
    expect(groupShowsIntoSeries(shows)).toHaveLength(2);
  });

  it('sorts each series chronologically regardless of input order', () => {
    const shows = [
      makeShow({ slug: 'later', startDate: '2026-06-01' }),
      makeShow({ slug: 'earlier', startDate: '2026-01-01' }),
    ];
    expect(groupShowsIntoSeries(shows)[0]?.shows.map((s) => s.slug)).toEqual(['earlier', 'later']);
  });

  it('derives slug, name, city, citySlug, and province from the earliest show', () => {
    const shows = [
      makeShow({ slug: 'earlier', name: 'London Card Show', citySlug: 'london', city: 'London', startDate: '2026-01-01' }),
      makeShow({ slug: 'later', name: 'London Card Show', citySlug: 'london', city: 'London', startDate: '2026-06-01' }),
    ];
    const series = groupShowsIntoSeries(shows)[0]!;
    expect(series.slug).toBe('london-card-show-london');
    expect(series.name).toBe('London Card Show');
    expect(series.city).toBe('London');
    expect(series.citySlug).toBe('london');
    expect(series.province).toBe('AB');
  });

  it('every series slug is unique against the live dataset (pinned guard)', () => {
    const series = groupShowsIntoSeries(showsJson as ShowRecord[]);
    const slugs = series.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every live show belongs to at most one series', () => {
    const series = groupShowsIntoSeries(showsJson as ShowRecord[]);
    const seen = new Map<string, string>();
    for (const s of series) {
      for (const show of s.shows) {
        expect(seen.has(show.slug), `${show.slug} in two series: ${seen.get(show.slug)} and ${s.slug}`).toBe(false);
        seen.set(show.slug, s.slug);
      }
    }
  });

  it('finds at least the known Capital Trade Shows Ottawa series in the live dataset', () => {
    const series = groupShowsIntoSeries(showsJson as ShowRecord[]);
    const cardComic = series.find((s) => s.name === 'Capital Trade Shows: Card & Comic Show' && s.citySlug === 'ottawa');
    expect(cardComic).toBeDefined();
    expect(cardComic!.shows.length).toBeGreaterThanOrEqual(2);
  });
});

describe('nextInSeries', () => {
  it('returns the first upcoming show', () => {
    const series = groupShowsIntoSeries([
      makeShow({ slug: 'past', startDate: '2026-01-01' }),
      makeShow({ slug: 'future1', startDate: '2026-12-01' }),
      makeShow({ slug: 'future2', startDate: '2027-01-01' }),
    ])[0]!;
    expect(nextInSeries(series, new Date(2026, 5, 1))?.slug).toBe('future1');
  });

  it('returns undefined when every date in the series has passed', () => {
    const series = groupShowsIntoSeries([
      makeShow({ slug: 'a', startDate: '2026-01-01' }),
      makeShow({ slug: 'b', startDate: '2026-02-01' }),
    ])[0]!;
    expect(nextInSeries(series, new Date(2026, 11, 1))).toBeUndefined();
  });
});
