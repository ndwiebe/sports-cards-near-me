# Show Rosters ("Who's tabling") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the public dealer rosters of nine card-show editions onto the matching show pages, linking each dealer that is already a directory shop to its shop page and giving every other dealer a one-click "claim your free profile" link.

**Architecture:** Same shape as shows and resellers: a new `Rosters` tab in the master Google Sheet is baked by `scripts/bake-rosters.ts` into `src/data/rosters.json` (committed, regenerated on every deploy). `src/lib/rosters.ts` holds the row-mapper, the shop matcher and the show lookup; the show page renders a "Who's tabling" section from it. No new pages, no new routes. Nothing is written to `resellers.json`; a dealer only gets a `/resellers/` page when they apply through the existing join form.

**Tech Stack:** Astro static site, TypeScript strict, vitest, Google Sheets gviz fetch (unauthenticated read), `gws` CLI for the one-time sheet seed.

**Spec:** vault decision `~/jarvis-memory/decisions/2026/2026-09-29-scnm-seed-reseller-profiles-from-show-rosters.md` (hybrid amendment). Roster research: `~/jarvis-memory/06-SportsCardsNearMe/2026-08-27-show-vendor-list-outreach-candidates.md`.

## Global Constraints

- `src/data/*.json` are GENERATED from the sheet (repo `CLAUDE.md` trap #1). Data corrections are sheet edits; the JSON is committed only as the baked result.
- Never `git add -A` / `git add .`. Stage explicit paths. Commit `SESSIONS.md` on its own.
- TypeScript strict, no `any`. Comments say *why*.
- Seeded dealers NEVER receive the "SCNM Verified" badge or a `/resellers/` page. Copy must say only what is true: the name appeared on a public roster for that edition.
- Every roster section carries the source link, the edition label, the capture date, and a "not you / remove" mailto to `hello@displaymycard.com`.
- Test at 375px.
- Publishing to production is a separate manual step (`gh workflow run site --ref main`) and needs Nathan's go.
- Any change to `.github/workflows/site.yml` must ALSO be pushed to `main` (trap #2 corollary), or production silently builds without the new bake step.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/rosters.ts` (create) | `RosterEntry` type, `rowToRosterEntry`, `normalizeDealerName`, `matchStore`, `rostersForShow`, `claimUrl` |
| `scripts/bake-rosters.ts` (create) | fetch `Rosters` tab → `src/data/rosters.json`, with a count guard |
| `src/data/rosters.json` (create, generated) | baked output, committed |
| `tests/unit/rosters.test.ts` (create) | header pin, mapper, matcher, show lookup, claim URL |
| `src/pages/shows/[slug]/index.astro` (modify) | render the "Who's tabling" section |
| `package.json` (modify) | `bake:rosters` script |
| `.github/workflows/site.yml` (modify) | run `npm run bake:rosters` before tests |
| `CLAUDE.md`, `SESSIONS.md` (modify) | counts, lane claim/release |
| scratch `parse_rosters.py` + `clean_rosters.py` (outside repo) | one-time harvest → CSV for the sheet seed |

## Sheet tab `Rosters` — columns (0-based), pinned by test

| # | Header | Meaning |
|---|---|---|
| 0 | Show URL | the show's `website` or `sourceUrl` in the `Shows` tab; this is the join key |
| 1 | Source URL | the public roster page or PDF, shown as the citation |
| 2 | Edition | human label, e.g. `Spring 2026 (Apr 30 – May 3)` |
| 3 | Captured | date the roster was copied (ISO) |
| 4 | Dealer | name as the roster prints it |
| 5 | Booth | free text, may be blank |
| 6 | Blurb | up to 300 chars, only where the roster published one (Treasure pages) |
| 7 | Link | dealer's own URL where the roster published one (Sask page) |
| 8 | Store Slug | blank = auto-match by name; `-` = force no match; a slug = force that shop |

Built as 9 columns, not 8: a PDF's address never equals the show's homepage, so the join key and the citation had to be separate. Seeded 2026-09-29 with 1,040 rows. Finding: Google's `sheet=<name>` fetch silently returns a different tab if the name is missing, so `bake:rosters` has a half-count guard. The baker also logs one harmless "skipped row 0" warning for the header row.

The sheet is world-readable (see `src/lib/resellers.ts` header comment). Only publishable fields go in it. All eight are already public on the source pages.

---

### Task 1: Roster row-mapper and types

**Files:**
- Create: `src/lib/rosters.ts`
- Test: `tests/unit/rosters.test.ts`

**Interfaces:**
- Consumes: `GvizCell`, `GvizRow` from `src/lib/sheet.ts`; `sanitizeText`, `slugify` from `src/lib/transform.ts`; `httpUrl` from `src/lib/stores-build.ts`; `isoDate` from `src/lib/shows.ts`.
- Produces:
  ```ts
  export interface RosterEntry {
    source: string;        // roster URL, joins to ShowRecord.website / sourceUrl
    edition: string;
    captured: string;      // ISO date
    dealer: string;
    booth?: string | undefined;
    blurb?: string | undefined;
    link?: string | undefined;
    storeSlug?: string | undefined;   // manual override from the sheet; '-' → undefined + noMatch=true
    noMatch: boolean;                 // true when the sheet says '-'
  }
  export function rowToRosterEntry(cells: GvizRow): RosterEntry | null;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/rosters.test.ts
import { describe, expect, it } from 'vitest';
import { rowToRosterEntry } from '../../src/lib/rosters';
import type { GvizCell, GvizRow } from '../../src/lib/sheet';

const cell = (v: string | number | null, f?: string): GvizCell | null =>
  v === null ? null : f !== undefined ? { v, f } : { v };

// Column order matches the Rosters sheet tab headers, as of 2026-09-29:
// 0 Source URL | 1 Edition | 2 Captured | 3 Dealer | 4 Booth | 5 Blurb | 6 Link | 7 Store Slug
const row = (over: Partial<Record<number, GvizCell | null>> = {}): GvizRow => {
  const base: (GvizCell | null)[] = [
    cell('https://sportcardexpotoronto.com/wp-content/uploads/2026-SCME-APRIL-dealers-list-2pager.pdf'),
    cell('Spring 2026 (Apr 30 – May 3)'),
    cell('Date(2026,8,29)', '2026-09-29'),
    cell('SNORWAX CARDS'),
    cell('5029, 5030'),
    null,
    null,
    null,
  ];
  return base.map((c, i) => (i in over ? (over[i] ?? null) : c));
};

describe('rowToRosterEntry', () => {
  it('maps a complete row', () => {
    expect(rowToRosterEntry(row())).toEqual({
      source: 'https://sportcardexpotoronto.com/wp-content/uploads/2026-SCME-APRIL-dealers-list-2pager.pdf',
      edition: 'Spring 2026 (Apr 30 – May 3)',
      captured: '2026-09-29',
      dealer: 'SNORWAX CARDS',
      booth: '5029, 5030',
      blurb: undefined,
      link: undefined,
      storeSlug: undefined,
      noMatch: false,
    });
  });

  it('rejects rows missing source, edition, captured or dealer', () => {
    expect(rowToRosterEntry(row({ 0: null }))).toBeNull();
    expect(rowToRosterEntry(row({ 1: null }))).toBeNull();
    expect(rowToRosterEntry(row({ 2: null }))).toBeNull();
    expect(rowToRosterEntry(row({ 3: cell('  ') }))).toBeNull();
  });

  it('rejects a source that is not an http(s) URL', () => {
    expect(rowToRosterEntry(row({ 0: cell('dealers.pdf') }))).toBeNull();
  });

  it("treats a '-' Store Slug as an explicit no-match", () => {
    const r = rowToRosterEntry(row({ 7: cell('-') }));
    expect(r?.storeSlug).toBeUndefined();
    expect(r?.noMatch).toBe(true);
  });

  it('keeps an explicit Store Slug', () => {
    const r = rowToRosterEntry(row({ 7: cell('401-games-toronto') }));
    expect(r?.storeSlug).toBe('401-games-toronto');
    expect(r?.noMatch).toBe(false);
  });

  it('drops a Link that is not http(s) and trims the blurb to 300 chars', () => {
    const r = rowToRosterEntry(row({ 5: cell('x'.repeat(400)), 6: cell('instagram.com/foo') }));
    expect(r?.blurb).toHaveLength(300);
    expect(r?.link).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/rosters.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/rosters`.

- [ ] **Step 3: Implement the mapper**

```ts
// src/lib/rosters.ts
import type { GvizRow } from './sheet';
import { sanitizeText } from './transform';
import { httpUrl } from './stores-build';
import { isoDate } from './shows';

/**
 * One dealer on one public show roster. Seeded from promoters' own published
 * dealer lists, so the only claims we make are the ones the roster made:
 * this name was on this list for this edition. Nothing here is "verified".
 */
export interface RosterEntry {
  /** Roster page or PDF. Joins to ShowRecord.website or sourceUrl. */
  source: string;
  edition: string;
  captured: string;
  dealer: string;
  booth?: string | undefined;
  blurb?: string | undefined;
  link?: string | undefined;
  /** Sheet override. Blank in the sheet means auto-match by name. */
  storeSlug?: string | undefined;
  /** The sheet said '-': this name must never be linked to a shop. */
  noMatch: boolean;
}

// Rosters tab column order (0-based). The header assertion in
// tests/unit/rosters.test.ts fails loudly if a column is inserted.
// The sheet is world-readable: only publishable fields belong in it.
const COL = {
  source: 0, edition: 1, captured: 2, dealer: 3, booth: 4, blurb: 5, link: 6, storeSlug: 7,
} as const;

const BLURB_MAX = 300;

export function rowToRosterEntry(cells: GvizRow): RosterEntry | null {
  const source = httpUrl(cells[COL.source]?.v);
  const edition = sanitizeText(cells[COL.edition]?.v);
  const captured = isoDate(cells[COL.captured]);
  const dealer = sanitizeText(cells[COL.dealer]?.v);
  if (source === undefined || edition === undefined || captured === undefined || dealer === undefined) return null;

  const slugRaw = sanitizeText(cells[COL.storeSlug]?.v);
  const noMatch = slugRaw === '-';

  return {
    source,
    edition,
    captured,
    dealer,
    booth: sanitizeText(cells[COL.booth]?.v),
    blurb: sanitizeText(cells[COL.blurb]?.v)?.slice(0, BLURB_MAX),
    link: httpUrl(cells[COL.link]?.v),
    storeSlug: noMatch ? undefined : slugRaw,
    noMatch,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/rosters.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rosters.ts tests/unit/rosters.test.ts
git commit -m "feat(rosters): row-mapper for the Rosters sheet tab"
```

---

### Task 2: Shop matcher and show lookup

**Files:**
- Modify: `src/lib/rosters.ts`
- Test: `tests/unit/rosters.test.ts`

**Interfaces:**
- Consumes: `Store` from `src/lib/types.ts`, `ShowRecord` from `src/lib/shows.ts`, `RosterEntry` from Task 1.
- Produces:
  ```ts
  export function normalizeDealerName(name: string): string;
  export function matchStore(entry: RosterEntry, stores: readonly Store[]): Store | undefined;
  export interface ShowRoster { source: string; edition: string; captured: string; entries: RosterEntry[] }
  export function rostersForShow(show: ShowRecord, entries: readonly RosterEntry[]): ShowRoster[];
  ```

Matching rule, deliberately strict: exact equality after normalization (accents stripped, case folded, punctuation and `inc`/`ltd` dropped, whitespace collapsed). A near-miss like `HOBBY PLUS` vs `Sports Cards Plus` must NOT match; false links to the wrong shop are worse than no link. Ambiguous cases are resolved by hand in the `Store Slug` column.

- [ ] **Step 1: Write the failing tests** (append to `tests/unit/rosters.test.ts`)

```ts
import { matchStore, normalizeDealerName, rostersForShow } from '../../src/lib/rosters';
import type { Store } from '../../src/lib/types';
import type { ShowRecord } from '../../src/lib/shows';

const store = (name: string, slug: string): Store => ({
  slug, name, city: 'Toronto', citySlug: 'toronto', address: '1 Front St', province: 'ON',
  services: [], sports: [], lat: 43.6, lng: -79.4,
});

describe('normalizeDealerName', () => {
  it('strips accents, case, punctuation and corporate suffixes', () => {
    expect(normalizeDealerName('Collect-Édition')).toBe('collect edition');
    expect(normalizeDealerName('HOGTOWN CARDS INC')).toBe('hogtown cards');
    expect(normalizeDealerName("Carl’s Cards")).toBe('carl s cards');
    expect(normalizeDealerName('  401   GAMES ')).toBe('401 games');
  });
});

describe('matchStore', () => {
  const stores = [store('401 Games', '401-games-toronto'), store('Sports Cards Plus & Collectibles', 'sports-cards-plus-thunder-bay')];
  const entry = (dealer: string, over: Partial<RosterEntry> = {}): RosterEntry => ({
    source: 'https://x.test/list.pdf', edition: '2026', captured: '2026-09-29', dealer, noMatch: false, ...over,
  });

  it('matches on normalized name equality', () => {
    expect(matchStore(entry('401 GAMES'), stores)?.slug).toBe('401-games-toronto');
  });
  it('does not fuzzy-match a near name', () => {
    expect(matchStore(entry('HOBBY PLUS'), stores)).toBeUndefined();
    expect(matchStore(entry('401 GAMES TORONTO'), stores)).toBeUndefined();
  });
  it('honours an explicit Store Slug over the name', () => {
    expect(matchStore(entry('Some Other Name', { storeSlug: 'sports-cards-plus-thunder-bay' }), stores)?.slug)
      .toBe('sports-cards-plus-thunder-bay');
  });
  it('returns undefined for an explicit Store Slug that no longer exists', () => {
    expect(matchStore(entry('401 GAMES', { storeSlug: 'gone-shop' }), stores)).toBeUndefined();
  });
  it("never links when the sheet said '-'", () => {
    expect(matchStore(entry('401 GAMES', { noMatch: true }), stores)).toBeUndefined();
  });
});

describe('rostersForShow', () => {
  const show: ShowRecord = {
    slug: 's', name: 'Sport Card Expo Toronto', city: 'Mississauga', citySlug: 'mississauga', province: 'ON',
    startDate: '2026-11-06', website: 'https://sportcardexpotoronto.com/',
    sourceUrl: 'https://sportcardexpotoronto.com/wp-content/uploads/2026-SCME-APRIL-dealers-list-2pager.pdf',
  };
  const e = (source: string, dealer: string, edition = 'Spring 2026'): RosterEntry =>
    ({ source, edition, captured: '2026-09-29', dealer, noMatch: false });

  it('groups entries whose source equals the show website or sourceUrl, in sheet order', () => {
    const entries = [
      e('https://sportcardexpotoronto.com/wp-content/uploads/2026-SCME-APRIL-dealers-list-2pager.pdf', 'B'),
      e('https://elsewhere.test/', 'Z'),
      e('https://sportcardexpotoronto.com/', 'A', 'Fall 2026'),
    ];
    const r = rostersForShow(show, entries);
    expect(r.map((x) => [x.edition, x.entries.map((y) => y.dealer)])).toEqual([
      ['Spring 2026', ['B']],
      ['Fall 2026', ['A']],
    ]);
  });
  it('ignores a trailing slash difference', () => {
    const r = rostersForShow(show, [e('https://sportcardexpotoronto.com', 'A')]);
    expect(r).toHaveLength(1);
  });
  it('returns [] when nothing matches', () => {
    expect(rostersForShow(show, [e('https://elsewhere.test/', 'Z')])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run tests/unit/rosters.test.ts`
Expected: FAIL — `normalizeDealerName` etc. not exported.

- [ ] **Step 3: Implement** (append to `src/lib/rosters.ts`)

```ts
import type { Store } from './types';
import type { ShowRecord } from './shows';

/**
 * Exact-after-normalization only. A wrong link sends a reader to the wrong
 * shop with our name on it; a missing link costs nothing. Anything fuzzier
 * gets decided by a human in the sheet's Store Slug column.
 */
export function normalizeDealerName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(inc|ltd|ltee|llc)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchStore(entry: RosterEntry, stores: readonly Store[]): Store | undefined {
  if (entry.noMatch) return undefined;
  if (entry.storeSlug !== undefined) return stores.find((s) => s.slug === entry.storeSlug);
  const key = normalizeDealerName(entry.dealer);
  if (key === '') return undefined;
  return stores.find((s) => normalizeDealerName(s.name) === key);
}

export interface ShowRoster {
  source: string;
  edition: string;
  captured: string;
  entries: RosterEntry[];
}

const sameUrl = (a: string, b: string): boolean => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

/**
 * Rosters belong to a show through the URL the promoter published them at:
 * the show's website or sourceUrl. Recurring shows share a website across
 * dates, so an annual expo's page shows the last edition's list, labelled as
 * such — "who usually tables here" is the useful answer between editions.
 */
export function rostersForShow(show: ShowRecord, entries: readonly RosterEntry[]): ShowRoster[] {
  const urls = [show.website, show.sourceUrl].filter((u): u is string => u !== undefined);
  const groups = new Map<string, ShowRoster>();
  for (const entry of entries) {
    if (!urls.some((u) => sameUrl(u, entry.source))) continue;
    const key = `${entry.source}\n${entry.edition}`;
    const g = groups.get(key) ?? { source: entry.source, edition: entry.edition, captured: entry.captured, entries: [] };
    g.entries.push(entry);
    groups.set(key, g);
  }
  return [...groups.values()];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/rosters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rosters.ts tests/unit/rosters.test.ts
git commit -m "feat(rosters): strict shop matcher and per-show roster lookup"
```

---

### Task 3: Claim URL (pre-filled join form)

**Files:**
- Modify: `src/lib/rosters.ts`, `src/lib/forms.ts`
- Test: `tests/unit/rosters.test.ts`

The reseller Google Form's field IDs were read from its public HTML on 2026-09-29: display name is `entry.1276928846`, "What do you collect and sell?" is `entry.1802446710`. A pre-filled link opens the same form with those two boxes already filled ("Seen at: <show>, <edition>"), so a dealer claiming from a show page types only city, links and evidence.

- [ ] **Step 1: Write the failing test** (append)

```ts
import { claimUrl } from '../../src/lib/rosters';
import { RESELLER_FORM_URL } from '../../src/lib/forms';

describe('claimUrl', () => {
  it('opens the reseller form with name and show pre-filled', () => {
    const u = new URL(claimUrl('Snorwax Cards', 'Sport Card Expo Toronto', 'Spring 2026'));
    expect(`${u.origin}${u.pathname}`).toBe(RESELLER_FORM_URL);
    expect(u.searchParams.get('usp')).toBe('pp_url');
    expect(u.searchParams.get('entry.1276928846')).toBe('Snorwax Cards');
    expect(u.searchParams.get('entry.1802446710')).toBe('Seen at: Sport Card Expo Toronto, Spring 2026');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/rosters.test.ts -t claimUrl`
Expected: FAIL — `claimUrl` not exported.

- [ ] **Step 3: Implement**

In `src/lib/forms.ts`, after `RESELLER_FORM_URL`:

```ts
/**
 * Pre-fill field IDs for RESELLER_FORM_URL, read from the form's public HTML
 * (FB_PUBLIC_LOAD_DATA_) on 2026-09-29. They change only if the form is
 * rebuilt; if a claim link ever opens an empty form, re-read them.
 */
export const RESELLER_FORM_ENTRY = {
  displayName: 'entry.1276928846',
  collectAndSell: 'entry.1802446710',
} as const;
```

In `src/lib/rosters.ts`:

```ts
import { RESELLER_FORM_ENTRY, RESELLER_FORM_URL } from './forms';

/** The existing join form, with the dealer's name and where we saw them filled in. */
export function claimUrl(dealer: string, showName: string, edition: string): string {
  const u = new URL(RESELLER_FORM_URL);
  u.searchParams.set('usp', 'pp_url');
  u.searchParams.set(RESELLER_FORM_ENTRY.displayName, dealer);
  u.searchParams.set(RESELLER_FORM_ENTRY.collectAndSell, `Seen at: ${showName}, ${edition}`);
  return u.toString();
}
```

- [ ] **Step 4: Run the whole unit suite**

Run: `npm test`
Expected: PASS, including `tests/unit/forms.test.ts` (it asserts which form URLs appear on show pages; `claimUrl` builds on `RESELLER_FORM_URL`, which is allowed).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rosters.ts src/lib/forms.ts tests/unit/rosters.test.ts
git commit -m "feat(rosters): pre-filled claim link into the reseller form"
```

---

### Task 4: Bake script, CI step, empty data file

**Files:**
- Create: `scripts/bake-rosters.ts`, `src/data/rosters.json` (initially `[]`)
- Modify: `package.json`, `.github/workflows/site.yml:37`

- [ ] **Step 1: Write the bake script**

```ts
// scripts/bake-rosters.ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fetchSheetRowsByName } from '../src/lib/sheet';
import { rowToRosterEntry } from '../src/lib/rosters';
import { sanitizeText } from '../src/lib/transform';
import { log } from '../src/lib/log';

const SHEET_ID = '14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I';
const SHEET_NAME = 'Rosters';
const OUT = 'src/data/rosters.json';

const rows = await fetchSheetRowsByName(SHEET_ID, SHEET_NAME);
const mapped = rows.map((cells, i) => ({ cells, i, entry: rowToRosterEntry(cells) }));

for (const { cells, i, entry } of mapped) {
  if (entry === null) {
    const name = sanitizeText(cells[3]?.v);
    log.warn(`skipped row ${i}${name !== undefined ? ` (${name})` : ''}: missing required field(s)`);
  }
}

const entries = mapped.flatMap(({ entry }) => (entry !== null ? [entry] : []));

// Count guard (bake:shows and bake:resellers have none — CLAUDE.md trap #1).
// A malformed tab must not silently strip every roster off every show page.
let previous = 0;
try {
  previous = (JSON.parse(await readFile(OUT, 'utf8')) as unknown[]).length;
} catch {
  previous = 0;
}
if (previous > 0 && entries.length < previous * 0.5) {
  throw new Error(`bake:rosters refused: ${entries.length} rows is under half the previous ${previous}`);
}

await mkdir('src/data', { recursive: true });
await writeFile(OUT, `${JSON.stringify(entries, null, 2)}\n`);
log.info(`baked ${entries.length} roster rows (${mapped.length - entries.length} skipped) → ${OUT}`);
```

- [ ] **Step 2: Create the empty data file and wire the script**

```bash
echo '[]' > src/data/rosters.json
```

`package.json` scripts, after `"bake:resellers"`:
```json
"bake:rosters": "tsx scripts/bake-rosters.ts",
```

`.github/workflows/site.yml`, after line 37 (`- run: npm run bake:resellers`):
```yaml
      - run: npm run bake:rosters
```

- [ ] **Step 3: Verify the script runs against the sheet (tab does not exist yet → HTTP error is expected)**

Run: `npm run bake:rosters`
Expected: throws `gviz:` error because the `Rosters` tab is not there yet. That is correct for now; Task 6 creates the tab. Do NOT commit a modified `rosters.json` from this step.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/bake-rosters.ts src/data/rosters.json package.json .github/workflows/site.yml
git commit -m "feat(rosters): bake script with count guard; CI bakes rosters"
```

Note for the release step: `site.yml` changed, so this commit must also reach `main` (cherry-pick or merge) before production dispatch, per `CLAUDE.md` trap #2 corollary.

---

### Task 5: "Who's tabling" section on the show page

**Files:**
- Modify: `src/pages/shows/[slug]/index.astro`
- Test: `tests/unit/rosters.test.ts` (pure helpers only; the page is checked by build + 375px screenshot)

Design rules (from the decision): section title "Who's tabling"; one subsection per roster edition, labelled `<edition> · from <source host> · captured <date>`; dealers as a two-column list on desktop, one column on mobile; a matched dealer is a link to `/store/<slug>/`; an unmatched dealer is plain text; booth in muted small text; blurb (if any) as a second line, clamped; dealer link (if any) as a small "site ↗". Footer of the section: "Is this you? Claim your free profile" (pre-filled form), and "Listed in error? Email us" mailto. One published sentence of honesty: "Names come from the promoter's public dealer list for that edition. Being on it is not an SCNM Verified badge."

- [ ] **Step 1: Add the imports and data lookup** to the frontmatter of `src/pages/shows/[slug]/index.astro`, after the existing imports:

```ts
import rostersJson from '../../../data/rosters.json';
import storesJson from '../../../data/stores.json';
import type { RosterEntry } from '../../../lib/rosters';
import { claimUrl, matchStore, rostersForShow } from '../../../lib/rosters';
import type { Store } from '../../../lib/types';
```

and after `const ld = ...`:

```ts
const stores = storesJson as Store[];
const rosters = rostersForShow(show, rostersJson as RosterEntry[]).map((r) => ({
  ...r,
  host: new URL(r.source).hostname.replace(/^www\./, ''),
  rows: r.entries.map((e) => ({ entry: e, store: matchStore(e, stores) })),
}));
const REMOVE_MAILTO = `mailto:hello@displaymycard.com?subject=${encodeURIComponent(`Remove a name from the ${show.name} roster`)}`;
```

- [ ] **Step 2: Render the section** — insert before the closing `<p class="mt-12 text-sm text-muted">Run a show…` paragraph:

```astro
  {rosters.length > 0 && (
    <section class="mt-12">
      <h2 class="text-2xl">Who's tabling</h2>
      <p class="mt-2 max-w-prose text-sm text-muted">
        Names come from the promoter's public dealer list for that edition. Being on it is not an
        <span class="text-gold">SCNM Verified</span> badge — it means they had a table.
      </p>
      {rosters.map((r) => (
        <div class="mt-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-muted">
            {r.edition} · from <a href={r.source} target="_blank" rel="noopener nofollow" class="hover:text-paper">{r.host}</a> · captured {r.captured}
          </h3>
          <ul role="list" class="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {r.rows.map(({ entry, store }) => (
              <li>
                {store !== undefined
                  ? <a href={`/store/${store.slug}/`} class="font-semibold text-prizm">{entry.dealer}</a>
                  : <span class="font-semibold">{entry.dealer}</span>}
                {entry.booth !== undefined && <span class="ml-2 text-xs text-muted">booth {entry.booth}</span>}
                {entry.link !== undefined && (
                  <a href={entry.link} target="_blank" rel="noopener nofollow" class="ml-2 text-xs text-prizm">site ↗</a>
                )}
                {entry.blurb !== undefined && <p class="mt-0.5 line-clamp-2 text-xs text-paper/70">{entry.blurb}</p>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p class="mt-6 text-sm text-muted">
        Is one of these you?{' '}
        <a href={claimUrl('', show.name, rosters[0]?.edition ?? '')} target="_blank" rel="noopener" class="text-prizm">Claim your free profile</a>
        {' '}— or{' '}
        <a href={REMOVE_MAILTO} class="text-prizm">ask us to remove a name</a>.
      </p>
    </section>
  )}
```

The claim link is one per section rather than one per dealer on purpose: 370 links to the same form on one page is link spam to a crawler and noise to a reader; the pre-filled show name is what saves the dealer typing, and the name box is a single field.

- [ ] **Step 3: Build and screenshot**

Add three temporary rows to `src/data/rosters.json` by hand (source `https://sportcardexpotoronto.com/`, edition `Spring 2026`, captured `2026-09-29`, dealers `401 GAMES`, `SNORWAX CARDS` with booth `5029`, `Test Dealer` with a 200-char blurb and link `https://example.com`), then:

Run: `npm run build && npx serve dist -l 8642` (or `python3 -m http.server 8642 -d dist --bind 127.0.0.1`)
Open `http://127.0.0.1:8642/shows/sport-card-expo-toronto-mississauga-2026-11-06/` with the playwright MCP at 375×812 and at 1280 wide; screenshot both. Check: "401 GAMES" is a link to `/store/401-games-toronto/`, the section reads cleanly at 375px with no horizontal scroll, the honesty sentence is visible.

Then restore `src/data/rosters.json` to `[]` (`git checkout -- src/data/rosters.json`).

- [ ] **Step 4: Run the full checks**

Run: `npm run typecheck && npm test && npm run build`
Expected: all green; page count unchanged (rosters add no routes).

- [ ] **Step 5: Commit**

```bash
git add src/pages/shows/[slug]/index.astro
git commit -m "feat(shows): 'Who's tabling' roster section with shop links and claim link"
```

---

### Task 6: Clean the harvest and seed the `Rosters` tab (data lane — needs Nathan's go before the write)

**Files (outside the repo, scratch):** `parse_rosters.py` (exists, produces `rosters-raw.json`, 1,435 rows), `clean_rosters.py` (create), `rosters.csv` (output)

- [ ] **Step 1: Write the cleaner**

`clean_rosters.py` must:
1. Drop junk rows: dealers matching `/^(HALL \d|SHOW|DEALERS? LIST SUBJECT TO CHANGE\.?|\d+[A-Z]?)$/` or that are booth-only strings (`BOOTH` regex from the parser).
2. Re-join the known wrapped names, by exact replacement table (source key → dealer → replacement or merge):
   - Montréal Sept: `JSA - JAMES SPENCE` + orphan `AUTHENTICATION LLC` → `JSA - JAMES SPENCE AUTHENTICATION LLC`; `LES COLLECTIONNEURS ELECTRIC` + `AVENUE` → `LES COLLECTIONNEURS ELECTRIC AVENUE`; the `COLLECTION` and `EXPERIENCE` orphans join their preceding entry on the same column (print them; fix by hand in the table).
   - Toronto: the entries whose dealer text contains a booth number inside it (e.g. `FREE AGENT SPORTS CARDS 839 - 841`, `HALL OF FAME COLLECTIONS 900`, `KSKS SPORTS COLLECTIBLES 1300 - 1304 INC`, `LOWER LEVEL SPORTSCARDS 515, 516`, `INVESTMENT SPORTSCARDS 12`) → split trailing `\d.*` into booth; orphan continuation lines (`ELECTRIC AVENUE`, `VADIM NAYMAN`, `VINTAGE COLLECTIBLES`, `WALT'S COLLECTIBLES`, `WAX BOX CLUB`, `HOBBY PLUS`, `JG COLLECTABLES`, `HOGTOWN CARDS INC`, `POOCH'S CARDS & COLLECTIBLES`) → keep as their own dealers with blank booth (they are real dealer names whose booth landed on the next line).
   - Halifax: `CANADA CARDZ COLLECTIBLES` duplicate with orphan booth `1500, 1501, 1600` → one row, booth `1500, 1501, 1600, 1601`.
   - Card Yard: `Mama B's Pokétreasures & Great North Pokemon` stays; drop the bare `2`.
3. Sask: replace logo-description alt texts with the real names from the link domain, by table: `slabsharks.com`→`Slab Sharks`, `sportscardslive.com`→`Sports Cards Live`, `novassportscards.ca`→`Nova's Sports Cards`, `pokefamco.com`→`PokeFam Collectibles`, `getcollectr.com/...@choxxy`→`Choxxy Collects`, `merkvex.com`→`Merkvex`, `nscollectibles.com`→`NS Collectibles`, `instagram.com/vault151tradingco`→`Vault 151 Trading Co`, `ebay.ca/str/barrelsbitesandbreaks`→`Barrels Bites & Breaks`, `facebook.com/share/1DQnQoinfT`→`K-OS Cards`; drop the PSA row (grading company, not a dealer) and strip eBay tracking params from links (keep origin + path).
4. Title-case the ALL-CAPS PDF names for display? **No** — keep as printed (the sheet holds the roster's text; a later pass can prettify). Exception: collapse multiple spaces.
5. Dedupe on `(source, normalized dealer)`.
6. Write `rosters.csv` with the eight sheet columns; `Store Slug` blank everywhere.
7. Print counts per source and the first 20 auto-matches (`normalizeDealerName` rule ported to Python) plus every near-miss where a store name contains the dealer name or vice versa, for the review list.

- [ ] **Step 2: Run it and review the match list**

Run: `python3 clean_rosters.py`
Expected: ~1,380 rows; matches ~50. Read every match; any that is wrong (e.g. an out-of-province shop with the same name) gets `-` in the `Store Slug` column of the CSV; any obvious near-miss that IS the same shop gets that shop's slug.

- [ ] **Step 3: STOP — show Nathan the counts and the match list, get the go to write the sheet.** The sheet is production data and is rebuilt daily at 09:00 UTC into the live site's inputs; nothing renders until Task 4's bake runs in CI, but the tab is still a live write.

- [ ] **Step 4: Create the tab and append the rows (after the go)**

```bash
SHEET=14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I
gws sheets spreadsheets batchUpdate --params "{\"spreadsheetId\":\"$SHEET\"}" \
  --json '{"requests":[{"addSheet":{"properties":{"title":"Rosters"}}}]}'
gws sheets spreadsheets values append --params "{\"spreadsheetId\":\"$SHEET\",\"range\":\"Rosters!A1\",\"valueInputOption\":\"RAW\",\"insertDataOption\":\"INSERT_ROWS\"}" \
  --json "$(python3 -c 'import csv,json;print(json.dumps({"values":list(csv.reader(open("rosters.csv")))}))')"
```
(Exact `gws` subcommand syntax: check `gws sheets spreadsheets --help` first; the August session used the same tool for the Shows tab, see `SESSIONS.md` log 2026-08-27.)

- [ ] **Step 5: Bake and inspect the diff**

Run: `npm run bake:rosters && git diff --stat src/data/rosters.json && node -e "const r=require('./src/data/rosters.json');console.log(r.length, new Set(r.map(x=>x.source)).size,'sources')"`
Expected: row count equals the CSV's, 10 sources.

- [ ] **Step 6: Build, count which show pages got a section, screenshot two at 375px**

Run: `npm run build && grep -l "Who's tabling" dist/shows/*/index.html | wc -l`
Expected: ≥ 12 show pages (all Sport Card Expo Toronto/Halifax/Montréal/Calgary dates, the three Card Yard dates ×2 days, Mississauga TCG, Sask).

- [ ] **Step 7: Commit the baked data**

```bash
git add src/data/rosters.json
git commit -m "data(rosters): seed 10 public show rosters (Sport Card Expo ×5, Card Yard ×3, Mississauga TCG, Sask Card Expo)"
```

---

### Task 7: Docs, board, release

**Files:**
- Modify: `CLAUDE.md` (header counts line + trap #1 list gains `rosters.json` and `bake:rosters`), `SESSIONS.md` (release the lane, log line), `~/jarvis-memory/06-SportsCardsNearMe/` (short note: what shipped, how to add a roster: paste rows into the tab with the show's website/sourceUrl as Source URL)

- [ ] **Step 1: Update `CLAUDE.md`**: change `689 shops · 207 shows · 0 resellers` to add `· N roster rows`; in trap #1 change "`stores.json`, `shows.json` and `resellers.json`" to include `rosters.json`, and the CI command list to include `npm run bake:rosters`. Note in the same paragraph that `bake:rosters` HAS a half-count guard.

- [ ] **Step 2: Commit docs, then `SESSIONS.md` on its own**

```bash
git add CLAUDE.md docs/superpowers/plans/2026-09-29-plan-show-rosters.md
git commit -m "docs: rosters in the generated-data trap list; plan file"
git add SESSIONS.md
git commit -m "sessions: release rosters lanes"
```

- [ ] **Step 3: Push the branch, open a PR into `redesign`**

```bash
git push -u origin rosters
gh pr create --base redesign --title "Show rosters: 'Who's tabling' with shop links and claim link" --body "..."
```

- [ ] **Step 4: After merge — Nathan's go — publish**

```bash
git push origin redesign                 # preview build
# site.yml changed in Task 4 → sync main's copy first:
git checkout main && git merge --ff-only redesign 2>/dev/null || git cherry-pick <task-4-sha>
git push origin main
gh workflow run site --ref main && gh run watch --exit-status
```
Verify on the live URL: `curl -s https://sportscardsnearme.ca/shows/sport-card-expo-toronto-mississauga-2026-11-06/ | grep -c "Who's tabling"` → `1`.

---

## Self-review

- Spec coverage: roster on show pages (T5), shop matches link (T2/T5), unmatched get claim link (T3/T5), no new pages (T5 adds no routes), no Verified badge on seeded names (copy in T5, no write to `resellers.json` anywhere), remove link (T5), data through the sheet (T1/T4/T6), design pass at 375px (T5 step 3, T6 step 6). Thin-page risk: N/A, no pages added.
- Types: `RosterEntry.noMatch` boolean and `storeSlug` optional used identically in T1, T2, T5. `rostersForShow` returns `ShowRoster[]` consumed in T5. `claimUrl(dealer, showName, edition)` signature consistent T3/T5.
- Placeholders: T6 step 2's replacement tables are enumerated from the actual anomaly list produced 2026-09-29; T7 PR body is the only "..." and is prose, not code.
