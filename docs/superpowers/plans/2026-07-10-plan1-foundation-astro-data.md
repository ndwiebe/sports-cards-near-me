# Plan 1: Foundation — Astro Site + Sheet Data Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild sportscardsnearme.ca as an Astro site whose pages are baked from the real Google Sheet (69 Alberta stores), with province/city/store pages, Refractor design tokens, tests, and CI — deployed to a Cloudflare Pages preview.

**Architecture:** Static-first Astro 5 app on a `redesign` branch (old site keeps serving from `main` untouched). A build-time bake script fetches the Google Sheet's gviz JSON endpoint, transforms rows into typed `Store` objects, validates with a row-count guard, and writes `src/data/stores.json`; all pages are pre-rendered from that file. The Mapbox island, brand mark, Canada-wide data, shows, and guides land in Plans 2–5 — this plan ships a complete, fast, SEO-correct list-first site.

**Tech Stack:** Astro ≥5.2, TypeScript (strictest), Tailwind CSS v4 (`@tailwindcss/vite` via `astro add tailwind`), @fontsource packages, Vitest (unit), @playwright/test (smoke), GitHub Actions, Cloudflare Pages (wrangler).

**Spec:** `docs/superpowers/specs/2026-07-10-premium-redesign-design.md` (approved 2026-07-10). Later plans: 2 = Mapbox 3D island + filters/search, 3 = Canada-wide research agents + logo scraper, 4 = brand mark + imagery + shows + guides + native suggest endpoint, 5 = launch/DNS cutover.

## Global Constraints

- TypeScript strict, **no `any`** (tsconfig extends `astro/tsconfigs/strictest`).
- **No `console.log`** in any committed code — use `src/lib/log.ts` (Task 3) in scripts; components never log.
- Design tokens exactly per spec §3: ink `#0B1017`, panel `#121A26`, well `#0B121B`, border `#2A3C55`, paper `#EAF0F6`, muted `#8FA0B3`, prizm `#57B3FF`, refractor gradient `linear-gradient(100deg,#5AD7FF 0%,#907CFF 34%,#FF7FB2 68%,#FFC46B 100%)`. Display font Barlow Condensed 600; body Instrument Sans 400/600. **No gold-on-black.**
- Refractor gradient only on: headline rule, primary button, focus ring, featured ring (spec §3).
- Sheet is the single source of truth: ID `14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I`, gid `1588938698`.
- Every page must render complete HTML without client-side JS (map/filters are Plan 2 enhancements).
- Mobile-first; e2e smoke runs at 375×812 and 1280×900.
- $0/month: Cloudflare Pages free tier, GitHub Actions free tier.
- All work on branch `redesign`; commit after every task; **never push to `main`**.

---

### Task 1: Branch, retire legacy files, hand-scaffold Astro

**Files:**
- Move: `index.html`, `css/`, `js/`, `data/`, `images/`, `assets/`, `scripts/generate-stores-json.mjs`, `test/` → `legacy/`
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `src/pages/index.astro`, `src/env.d.ts`

**Interfaces:**
- Produces: a building Astro project; `npm run dev|build|preview` work. Repo root is the Astro app; old site preserved under `legacy/` (still live on `main`).

- [ ] **Step 1: Branch and move legacy site**

```bash
cd ~/Projects/8-Web-Apps/sports-cards-near-me
git checkout -b redesign
mkdir legacy
git mv index.html css js data images assets test legacy/
git mv scripts/generate-stores-json.mjs legacy/
git mv sitemap.xml robots.txt legacy/
git commit -m "chore: move v1 static site to legacy/ (main still serves it)"
```

Keep at root: `CNAME` (GitHub Pages on main uses the main-branch copy; harmless here), `favicon.ico`, `LICENSE`, `README.md`, `docs/`.

- [ ] **Step 2: Write package.json**

```json
{
  "name": "sportscardsnearme",
  "type": "module",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "bake": "tsx scripts/bake-stores.ts",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 3: Install and configure**

```bash
npm install astro
npm install -D tsx vitest
```

Create `astro.config.mjs`:

```js
// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sportscardsnearme.ca',
});
```

Create `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strictest",
  "include": [".astro/types.d.ts", "src/**/*", "scripts/**/*", "tests/**/*"],
  "exclude": ["dist", "legacy", "node_modules"]
}
```

Create `.gitignore`:

```
node_modules/
dist/
.astro/
test-results/
playwright-report/
```

Create `src/pages/index.astro`:

```astro
---
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Sports Cards Near Me</title></head>
  <body><h1>Scaffold OK</h1></body>
</html>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: `Complete!` with `dist/index.html` created. Run `ls dist/index.html` to confirm.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Astro 5 app (TypeScript strictest)"
```

---

### Task 2: Tailwind v4, Refractor tokens, fonts, Base layout

**Files:**
- Create: `src/styles/global.css`, `src/layouts/Base.astro`
- Modify: `astro.config.mjs` (done by `astro add tailwind`), `src/pages/index.astro`

**Interfaces:**
- Produces: `Base.astro` with props `{ title: string; description: string; canonical?: string; ogImage?: string }`; Tailwind utilities `bg-ink`, `bg-panel`, `bg-well`, `border-bord`, `text-paper`, `text-muted`, `text-prizm`, `font-display`, `font-body`; CSS class `.refractor-rule` and CSS var `--gradient-refractor`. All later page tasks consume these exact names.

- [ ] **Step 1: Add Tailwind v4 and fonts**

```bash
npx astro add tailwind --yes
npm install @fontsource/barlow-condensed @fontsource/instrument-sans
```

(`astro add tailwind` installs `@tailwindcss/vite`, wires it into `astro.config.mjs`, and creates `src/styles/global.css`.)

- [ ] **Step 2: Write global.css with the token system**

Replace `src/styles/global.css` entirely:

```css
@import "tailwindcss";

@theme {
  --color-ink: #0B1017;
  --color-panel: #121A26;
  --color-well: #0B121B;
  --color-bord: #2A3C55;
  --color-paper: #EAF0F6;
  --color-muted: #8FA0B3;
  --color-prizm: #57B3FF;
  --font-display: "Barlow Condensed", "Arial Narrow", sans-serif;
  --font-body: "Instrument Sans", -apple-system, sans-serif;
}

:root {
  --gradient-refractor: linear-gradient(100deg, #5AD7FF 0%, #907CFF 34%, #FF7FB2 68%, #FFC46B 100%);
}

body {
  @apply bg-ink text-paper font-body antialiased;
}

h1, h2, h3 {
  @apply font-display uppercase;
  letter-spacing: 0.015em;
  line-height: 0.95;
  text-wrap: balance;
}

.refractor-rule {
  height: 2px;
  border-radius: 2px;
  background: var(--gradient-refractor);
}

:focus-visible {
  outline: 2px solid transparent;
  box-shadow: 0 0 0 2px var(--color-ink), 0 0 0 4px #907CFF;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 3: Write Base.astro**

Create `src/layouts/Base.astro`:

```astro
---
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/600.css';
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
}
const { title, description, canonical, ogImage } = Astro.props;
const canonicalURL = canonical ?? new URL(Astro.url.pathname, Astro.site).href;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonicalURL} />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalURL} />
    {ogImage && <meta property="og:image" content={new URL(ogImage, Astro.site).href} />}
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body>
    <header class="border-b border-bord/50">
      <nav class="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <a href="/" class="font-display text-xl uppercase tracking-wide">Sports Cards Near Me</a>
        <div class="flex gap-5 text-sm text-muted">
          <a href="/alberta/" class="hover:text-paper">Browse</a>
          <a href="/suggest/" class="hover:text-paper">Suggest a store</a>
        </div>
      </nav>
    </header>
    <main class="mx-auto max-w-5xl px-5 pb-24">
      <slot />
    </main>
    <footer class="border-t border-bord/50 py-8 text-center text-sm text-muted">
      <p>© 2026 Sports Cards Near Me · Canada's card shop directory</p>
    </footer>
  </body>
</html>
```

- [ ] **Step 4: Use it and verify**

Replace `src/pages/index.astro`:

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Sports Cards Near Me" description="Find sports card shops across Canada.">
  <h1 class="mt-16 text-6xl">The hobby, mapped.</h1>
  <div class="refractor-rule mt-4 w-28"></div>
</Base>
```

Run: `npm run build`
Expected: success; `grep -c 'refractor-rule' dist/index.html` prints ≥1.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Tailwind v4 with Refractor design tokens, fonts, Base layout"
```

---

### Task 3: Logger + types + text/slug/province transforms (TDD)

**Files:**
- Create: `src/lib/log.ts`, `src/lib/types.ts`, `src/lib/transform.ts`
- Test: `tests/unit/transform.test.ts`

**Interfaces:**
- Produces (exact signatures later tasks use):
  - `log.info(msg: string): void`, `log.warn(msg: string): void`, `log.error(msg: string): void`
  - `type ProvinceCode = 'AB'|'BC'|'MB'|'NB'|'NL'|'NS'|'ON'|'PE'|'QC'|'SK'`
  - `PROVINCES: Record<ProvinceCode, { name: string; slug: string }>`
  - `interface Store { slug; name; city; citySlug; address; province: ProvinceCode; rating?: number; reviewCount?: number; hours?: string; phone?: string; website?: string; social?: string; services: string[]; sports: string[]; lat: number; lng: number }`
  - `parseRating(raw: unknown): { rating?: number; reviewCount?: number }`
  - `sanitizeText(raw: unknown): string | undefined`
  - `slugify(input: string): string`
  - `deriveProvince(address: string): ProvinceCode | null`
  - `splitList(raw: unknown): string[]`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/transform.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseRating, sanitizeText, slugify, deriveProvince, splitList } from '../../src/lib/transform';

describe('parseRating', () => {
  it('parses "4.8\\n(33)" from the sheet', () => {
    expect(parseRating('4.8\n(33)')).toEqual({ rating: 4.8, reviewCount: 33 });
  });
  it('parses a bare number', () => {
    expect(parseRating(5)).toEqual({ rating: 5, reviewCount: undefined });
  });
  it('returns empties for junk', () => {
    expect(parseRating(null)).toEqual({ rating: undefined, reviewCount: undefined });
    expect(parseRating('')).toEqual({ rating: undefined, reviewCount: undefined });
  });
});

describe('sanitizeText', () => {
  it('strips Google icon-font glyphs (private-use chars) and trims', () => {
    expect(sanitizeText(' Mon-Fri 9-5 ')).toBe('Mon-Fri 9-5');
  });
  it('returns undefined for empty/null', () => {
    expect(sanitizeText('  ')).toBeUndefined();
    expect(sanitizeText(null)).toBeUndefined();
    expect(sanitizeText('')).toBeUndefined();
  });
});

describe('slugify', () => {
  it('kebab-cases with accents and punctuation removed', () => {
    expect(slugify('203 Collectibles LTD.')).toBe('203-collectibles-ltd');
    expect(slugify('Cartes Montréal & Fils')).toBe('cartes-montreal-fils');
  });
});

describe('deriveProvince', () => {
  it('finds the province code in a full address', () => {
    expect(deriveProvince('2331 66 St NW Unit 312, Edmonton, AB T6K 4B5')).toBe('AB');
  });
  it('uses the last code when a street name collides', () => {
    expect(deriveProvince('12 ON Ave, Winnipeg, MB R3C 4T3')).toBe('MB');
  });
  it('returns null when absent', () => {
    expect(deriveProvince('123 Nowhere St')).toBeNull();
  });
});

describe('splitList', () => {
  it('splits semicolon lists and trims', () => {
    expect(splitList('Buys; Sells;Trades Singles')).toEqual(['Buys', 'Sells', 'Trades Singles']);
  });
  it('returns [] for empty', () => {
    expect(splitList(null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/transform.test.ts`
Expected: FAIL — cannot resolve `src/lib/transform`.

- [ ] **Step 3: Implement**

Create `src/lib/log.ts`:

```ts
const write = (stream: NodeJS.WriteStream, level: string, msg: string): void => {
  stream.write(`[${level}] ${msg}\n`);
};

export const log = {
  info: (msg: string): void => write(process.stdout, 'info', msg),
  warn: (msg: string): void => write(process.stderr, 'warn', msg),
  error: (msg: string): void => write(process.stderr, 'error', msg),
};
```

Create `src/lib/types.ts`:

```ts
export type ProvinceCode = 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'ON' | 'PE' | 'QC' | 'SK';

export const PROVINCES: Record<ProvinceCode, { name: string; slug: string }> = {
  AB: { name: 'Alberta', slug: 'alberta' },
  BC: { name: 'British Columbia', slug: 'british-columbia' },
  MB: { name: 'Manitoba', slug: 'manitoba' },
  NB: { name: 'New Brunswick', slug: 'new-brunswick' },
  NL: { name: 'Newfoundland and Labrador', slug: 'newfoundland-and-labrador' },
  NS: { name: 'Nova Scotia', slug: 'nova-scotia' },
  ON: { name: 'Ontario', slug: 'ontario' },
  PE: { name: 'Prince Edward Island', slug: 'prince-edward-island' },
  QC: { name: 'Quebec', slug: 'quebec' },
  SK: { name: 'Saskatchewan', slug: 'saskatchewan' },
};

export interface Store {
  slug: string;
  name: string;
  city: string;
  citySlug: string;
  address: string;
  province: ProvinceCode;
  rating?: number;
  reviewCount?: number;
  hours?: string;
  phone?: string;
  website?: string;
  social?: string;
  services: string[];
  sports: string[];
  lat: number;
  lng: number;
}
```

Create `src/lib/transform.ts`:

```ts
import type { ProvinceCode } from './types';
import { PROVINCES } from './types';

export function parseRating(raw: unknown): { rating?: number; reviewCount?: number } {
  if (typeof raw === 'number') return { rating: raw, reviewCount: undefined };
  if (typeof raw !== 'string') return { rating: undefined, reviewCount: undefined };
  const m = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:\(([0-9,]+)\))?/);
  if (!m || m[1] === undefined) return { rating: undefined, reviewCount: undefined };
  const count = m[2] !== undefined ? Number(m[2].replace(/,/g, '')) : undefined;
  return { rating: Number(m[1]), reviewCount: count };
}

export function sanitizeText(raw: unknown): string | undefined {
  if (typeof raw === 'number') return String(raw);
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw
    .replace(/[\u{E000}-\u{F8FF}]/gu, '') // icon-font private-use glyphs
    .replace(/[ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned === '' ? undefined : cleaned;
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const PROVINCE_RE = /\b(AB|BC|MB|NB|NL|NS|ON|PE|QC|SK)\b/g;

export function deriveProvince(address: string): ProvinceCode | null {
  const matches = [...address.matchAll(PROVINCE_RE)];
  const last = matches.at(-1);
  if (!last) return null;
  const code = last[1] as ProvinceCode;
  return code in PROVINCES ? code : null;
}

export function splitList(raw: unknown): string[] {
  const text = sanitizeText(raw);
  if (text === undefined) return [];
  return text
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/transform.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib tests
git commit -m "feat: logger, Store types, sheet-text transforms with tests"
```

---

### Task 4: Gviz sheet parser (TDD)

**Files:**
- Create: `src/lib/sheet.ts`
- Test: `tests/unit/sheet.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface GvizCell { v: string | number | null; f?: string }`
  - `type GvizRow = (GvizCell | null)[]`
  - `parseGviz(text: string): GvizRow[]` — throws `Error('gviz: unexpected response shape')` on garbage
  - `fetchSheetRows(sheetId: string, gid: string): Promise<GvizRow[]>`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/sheet.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseGviz } from '../../src/lib/sheet';

const SAMPLE =
  '/*O_o*/\ngoogle.visualization.Query.setResponse({"version":"0.6","reqId":"0","status":"ok","table":{"cols":[{"id":"A"}],"rows":[{"c":[{"v":"203 Collectibles LTD."},null,{"v":"Edmonton, AB"},{"v":4.8,"f":"4.8"}]}]}});';

describe('parseGviz', () => {
  it('extracts rows from the JSONP wrapper', () => {
    const rows = parseGviz(SAMPLE);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.[0]?.v).toBe('203 Collectibles LTD.');
    expect(rows[0]?.[1]).toBeNull();
    expect(rows[0]?.[3]?.v).toBe(4.8);
  });
  it('throws on non-gviz input', () => {
    expect(() => parseGviz('<html>login</html>')).toThrow('gviz: unexpected response shape');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/sheet.test.ts`
Expected: FAIL — cannot resolve `src/lib/sheet`.

- [ ] **Step 3: Implement**

Create `src/lib/sheet.ts`:

```ts
export interface GvizCell {
  v: string | number | null;
  f?: string;
}
export type GvizRow = (GvizCell | null)[];

interface GvizPayload {
  table?: { rows?: { c: GvizRow }[] };
}

export function parseGviz(text: string): GvizRow[] {
  const m = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s);
  if (!m || m[1] === undefined) throw new Error('gviz: unexpected response shape');
  const payload = JSON.parse(m[1]) as GvizPayload;
  const rows = payload.table?.rows;
  if (!Array.isArray(rows)) throw new Error('gviz: unexpected response shape');
  return rows.map((r) => r.c);
}

export async function fetchSheetRows(sheetId: string, gid: string): Promise<GvizRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gviz: HTTP ${res.status}`);
  return parseGviz(await res.text());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/sheet.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sheet.ts tests/unit/sheet.test.ts
git commit -m "feat: Google Sheet gviz parser with tests"
```

---

### Task 5: Row-to-Store mapping + slug dedupe + count guard (TDD)

**Files:**
- Create: `src/lib/stores-build.ts`
- Test: `tests/unit/stores-build.test.ts`

**Interfaces:**
- Consumes: `GvizRow` (Task 4); `Store`, transforms (Task 3).
- Produces:
  - `rowToStore(cells: GvizRow): Store | null` — null when name, lat, lng, or province can't be derived. Column order (sheet): 0 name, 1 city, 2 address, 3 rating, 4 hours, 5 phone, 6 website, 7 social, 8 services, 9 sports, 10 lat, 11 lng.
  - `dedupeSlugs(stores: Store[]): Store[]` — appends `-2`, `-3`… to repeated slugs.
  - `assertCountSane(next: number, prev: number | null): void` — throws if `next < 50` or (`prev !== null` and `next < Math.floor(prev * 0.9)`).

- [ ] **Step 1: Write failing tests**

Create `tests/unit/stores-build.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rowToStore, dedupeSlugs, assertCountSane } from '../../src/lib/stores-build';
import type { GvizRow } from '../../src/lib/sheet';
import type { Store } from '../../src/lib/types';

const cell = (v: string | number | null) => (v === null ? null : { v });
const row = (over: Partial<Record<number, string | number | null>> = {}): GvizRow => {
  const base: (string | number | null)[] = [
    '203 Collectibles LTD.', 'Edmonton', '2331 66 St NW Unit 312, Edmonton, AB T6K 4B5',
    '4.8\n(33)', '', '780-555-0100', 'https://www.203collectibles.com/', null,
    'Buys;Sells', 'Hockey;Pokemon', 53.4808, -113.4938,
  ];
  return base.map((v, i) => cell(i in over ? (over[i] ?? null) : v));
};

describe('rowToStore', () => {
  it('maps a real row', () => {
    const s = rowToStore(row());
    expect(s).toMatchObject({
      slug: '203-collectibles-ltd-edmonton',
      name: '203 Collectibles LTD.',
      city: 'Edmonton',
      citySlug: 'edmonton',
      province: 'AB',
      rating: 4.8,
      reviewCount: 33,
      services: ['Buys', 'Sells'],
      sports: ['Hockey', 'Pokemon'],
      lat: 53.4808,
      lng: -113.4938,
    });
    expect(s?.hours).toBeUndefined(); // icon-glyph junk stripped to nothing
  });
  it('rejects rows missing coordinates or name or province', () => {
    expect(rowToStore(row({ 10: null }))).toBeNull();
    expect(rowToStore(row({ 0: null }))).toBeNull();
    expect(rowToStore(row({ 2: '123 Nowhere St' }))).toBeNull();
  });
});

describe('dedupeSlugs', () => {
  it('suffixes duplicates deterministically', () => {
    const mk = (slug: string): Store => ({
      slug, name: 'x', city: 'y', citySlug: 'y', address: 'a', province: 'AB',
      services: [], sports: [], lat: 0, lng: 0,
    });
    const out = dedupeSlugs([mk('a'), mk('a'), mk('b'), mk('a')]);
    expect(out.map((s) => s.slug)).toEqual(['a', 'a-2', 'b', 'a-3']);
  });
});

describe('assertCountSane', () => {
  it('passes normal growth', () => {
    expect(() => assertCountSane(69, 69)).not.toThrow();
    expect(() => assertCountSane(70, null)).not.toThrow();
  });
  it('fails absolute floor and big drops', () => {
    expect(() => assertCountSane(1, null)).toThrow();
    expect(() => assertCountSane(50, 69)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/stores-build.test.ts`
Expected: FAIL — cannot resolve `src/lib/stores-build`.

- [ ] **Step 3: Implement**

Create `src/lib/stores-build.ts`:

```ts
import type { GvizRow } from './sheet';
import type { Store } from './types';
import { parseRating, sanitizeText, slugify, deriveProvince, splitList } from './transform';

const num = (c: GvizRow[number]): number | null =>
  c !== null && typeof c.v === 'number' ? c.v : null;

export function rowToStore(cells: GvizRow): Store | null {
  const name = sanitizeText(cells[0]?.v);
  const city = sanitizeText(cells[1]?.v);
  const address = sanitizeText(cells[2]?.v);
  const lat = num(cells[10] ?? null);
  const lng = num(cells[11] ?? null);
  if (name === undefined || city === undefined || address === undefined || lat === null || lng === null) return null;
  const province = deriveProvince(address);
  if (province === null) return null;
  const { rating, reviewCount } = parseRating(cells[3]?.v);
  return {
    slug: slugify(`${name}-${city}`),
    name,
    city,
    citySlug: slugify(city),
    address,
    province,
    rating,
    reviewCount,
    hours: sanitizeText(cells[4]?.v),
    phone: sanitizeText(cells[5]?.v),
    website: sanitizeText(cells[6]?.v),
    social: sanitizeText(cells[7]?.v),
    services: splitList(cells[8]?.v),
    sports: splitList(cells[9]?.v),
    lat,
    lng,
  };
}

export function dedupeSlugs(stores: Store[]): Store[] {
  const seen = new Map<string, number>();
  return stores.map((s) => {
    const n = (seen.get(s.slug) ?? 0) + 1;
    seen.set(s.slug, n);
    return n === 1 ? s : { ...s, slug: `${s.slug}-${n}` };
  });
}

export function assertCountSane(next: number, prev: number | null): void {
  if (next < 50) throw new Error(`bake guard: only ${next} stores (< 50 floor)`);
  if (prev !== null && next < Math.floor(prev * 0.9)) {
    throw new Error(`bake guard: ${next} stores is a >10% drop from previous ${prev}`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/stores-build.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores-build.ts tests/unit/stores-build.test.ts
git commit -m "feat: row-to-Store mapping, slug dedupe, bake count guard"
```

---

### Task 6: Bake script + real baked data

**Files:**
- Create: `scripts/bake-stores.ts`, `src/data/stores.json` (generated, committed)

**Interfaces:**
- Consumes: `fetchSheetRows` (Task 4), `rowToStore`/`dedupeSlugs`/`assertCountSane` (Task 5), `log` (Task 3).
- Produces: `src/data/stores.json` — a JSON array of `Store`, sorted by `province`, then `citySlug`, then `slug`. All page tasks import this file.

- [ ] **Step 1: Write the script**

Create `scripts/bake-stores.ts`:

```ts
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fetchSheetRows } from '../src/lib/sheet';
import { rowToStore, dedupeSlugs, assertCountSane } from '../src/lib/stores-build';
import { log } from '../src/lib/log';
import type { Store } from '../src/lib/types';

const SHEET_ID = '14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I';
const GID = '1588938698';
const OUT = 'src/data/stores.json';

async function previousCount(): Promise<number | null> {
  try {
    const prev = JSON.parse(await readFile(OUT, 'utf8')) as Store[];
    return prev.length;
  } catch {
    return null;
  }
}

const rows = await fetchSheetRows(SHEET_ID, GID);
const mapped = rows.map(rowToStore);
const skipped = mapped.filter((s) => s === null).length;
const stores = dedupeSlugs(mapped.filter((s): s is Store => s !== null)).sort(
  (a, b) =>
    a.province.localeCompare(b.province) ||
    a.citySlug.localeCompare(b.citySlug) ||
    a.slug.localeCompare(b.slug),
);

assertCountSane(stores.length, await previousCount());

await mkdir('src/data', { recursive: true });
await writeFile(OUT, `${JSON.stringify(stores, null, 2)}\n`);
log.info(`baked ${stores.length} stores (${skipped} rows skipped) → ${OUT}`);
```

- [ ] **Step 2: Run it against the real sheet**

Run: `npm run bake`
Expected: `[info] baked 69 stores (19 rows skipped) → src/data/stores.json` (69 ±2 and ~19 skipped is the known state of the sheet; if it prints far off, STOP and investigate before committing).

- [ ] **Step 3: Spot-check the output**

Run: `node -e "const s=require('./src/data/stores.json'); console.assert(s.length>=60); console.assert(s.every(x=>x.province==='AB')); process.stdout.write('cities: '+new Set(s.map(x=>x.city)).size+'\n')"`
Expected: no assertion errors; roughly 19 cities.

- [ ] **Step 4: Commit**

```bash
git add scripts/bake-stores.ts src/data/stores.json
git commit -m "feat: bake script pulls real sheet data (69 Alberta stores)"
```

---

### Task 7: Store grouping helpers (TDD)

**Files:**
- Create: `src/lib/stores.ts`
- Test: `tests/unit/stores.test.ts`

**Interfaces:**
- Consumes: `Store`, `ProvinceCode`, `PROVINCES` (Task 3).
- Produces (pure functions over a passed-in array — pages pass the imported JSON):
  - `provincesWithStores(stores: Store[]): { code: ProvinceCode; name: string; slug: string; count: number }[]` (sorted by name)
  - `citiesIn(stores: Store[], code: ProvinceCode): { city: string; citySlug: string; stores: Store[] }[]` (sorted by city)
  - `provinceBySlug(slug: string): { code: ProvinceCode; name: string; slug: string } | null`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/stores.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { provincesWithStores, citiesIn, provinceBySlug } from '../../src/lib/stores';
import type { Store } from '../../src/lib/types';

const mk = (city: string, province: Store['province']): Store => ({
  slug: `s-${city}`, name: 'Shop', city, citySlug: city.toLowerCase(), address: 'a',
  province, services: [], sports: [], lat: 0, lng: 0,
});
const data = [mk('Calgary', 'AB'), mk('Edmonton', 'AB'), mk('Kelowna', 'BC')];

it('provincesWithStores counts and sorts', () => {
  expect(provincesWithStores(data)).toEqual([
    { code: 'AB', name: 'Alberta', slug: 'alberta', count: 2 },
    { code: 'BC', name: 'British Columbia', slug: 'british-columbia', count: 1 },
  ]);
});

it('citiesIn groups one province', () => {
  const cities = citiesIn(data, 'AB');
  expect(cities.map((c) => c.city)).toEqual(['Calgary', 'Edmonton']);
  expect(cities[0]?.stores).toHaveLength(1);
});

it('provinceBySlug resolves and rejects', () => {
  expect(provinceBySlug('alberta')?.code).toBe('AB');
  expect(provinceBySlug('narnia')).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/stores.test.ts`
Expected: FAIL — cannot resolve `src/lib/stores`.

- [ ] **Step 3: Implement**

Create `src/lib/stores.ts`:

```ts
import type { ProvinceCode, Store } from './types';
import { PROVINCES } from './types';

export function provincesWithStores(
  stores: Store[],
): { code: ProvinceCode; name: string; slug: string; count: number }[] {
  const counts = new Map<ProvinceCode, number>();
  for (const s of stores) counts.set(s.province, (counts.get(s.province) ?? 0) + 1);
  return [...counts.entries()]
    .map(([code, count]) => ({ code, ...PROVINCES[code], count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function citiesIn(
  stores: Store[],
  code: ProvinceCode,
): { city: string; citySlug: string; stores: Store[] }[] {
  const groups = new Map<string, { city: string; citySlug: string; stores: Store[] }>();
  for (const s of stores) {
    if (s.province !== code) continue;
    const g = groups.get(s.citySlug) ?? { city: s.city, citySlug: s.citySlug, stores: [] };
    g.stores.push(s);
    groups.set(s.citySlug, g);
  }
  return [...groups.values()].sort((a, b) => a.city.localeCompare(b.city));
}

export function provinceBySlug(
  slug: string,
): { code: ProvinceCode; name: string; slug: string } | null {
  const entry = (Object.entries(PROVINCES) as [ProvinceCode, { name: string; slug: string }][]).find(
    ([, v]) => v.slug === slug,
  );
  return entry ? { code: entry[0], ...entry[1] } : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run` (full suite)
Expected: PASS — all unit tests green (18 total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores.ts tests/unit/stores.test.ts
git commit -m "feat: province/city grouping helpers"
```

---

### Task 8: StoreCard component + province and city pages

**Files:**
- Create: `src/components/StoreCard.astro`, `src/pages/[province]/index.astro`, `src/pages/[province]/[city]/index.astro`

**Interfaces:**
- Consumes: `Base.astro` (Task 2), `src/data/stores.json` (Task 6), grouping helpers (Task 7).
- Produces: `StoreCard.astro` with `interface Props { store: Store }` — the store detail page (Task 9) links use `/store/${store.slug}/`, so StoreCard must link exactly there.

- [ ] **Step 1: Write StoreCard.astro**

```astro
---
import type { Store } from '../lib/types';

interface Props { store: Store }
const { store } = Astro.props;
---
<li class="rounded-xl border border-bord bg-panel p-5 transition-transform duration-200 hover:-translate-y-0.5">
  <a href={`/store/${store.slug}/`} class="block">
    <h3 class="text-2xl">{store.name}</h3>
    <p class="mt-1 text-sm text-muted">{store.address}</p>
    {store.rating !== undefined && (
      <p class="mt-1 text-sm" style="color:#FFC46B" data-testid="rating">
        ★ {store.rating}{store.reviewCount !== undefined && <span class="text-muted"> ({store.reviewCount} Google reviews)</span>}
      </p>
    )}
    {(store.services.length > 0 || store.sports.length > 0) && (
      <ul class="mt-3 flex flex-wrap gap-1.5">
        {[...store.services, ...store.sports].map((t) => (
          <li class="rounded-full border border-bord px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{t}</li>
        ))}
      </ul>
    )}
  </a>
</li>
```

- [ ] **Step 2: Write the province page**

Create `src/pages/[province]/index.astro`:

```astro
---
import Base from '../../layouts/Base.astro';
import storesJson from '../../data/stores.json';
import type { Store } from '../../lib/types';
import { provincesWithStores, citiesIn, provinceBySlug } from '../../lib/stores';

export function getStaticPaths() {
  return provincesWithStores(storesJson as Store[]).map((p) => ({ params: { province: p.slug } }));
}

const stores = storesJson as Store[];
const province = provinceBySlug(Astro.params.province);
if (!province) throw new Error(`unknown province slug: ${Astro.params.province}`);
const cities = citiesIn(stores, province.code);
const total = cities.reduce((n, c) => n + c.stores.length, 0);
---
<Base
  title={`Sports Card Shops in ${province.name} (${total}) | Sports Cards Near Me`}
  description={`Every sports card shop in ${province.name} — ${total} verified stores across ${cities.length} cities, with hours, ratings, and directions.`}
>
  <p class="mt-14 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Province</p>
  <h1 class="mt-2 text-5xl md:text-7xl">{province.name}</h1>
  <div class="refractor-rule mt-4 w-28"></div>
  <p class="mt-4 max-w-prose text-muted">{total} card shops across {cities.length} cities.</p>
  <ul class="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
    {cities.map((c) => (
      <li>
        <a href={`/${province.slug}/${c.citySlug}/`} class="block rounded-xl border border-bord bg-panel p-4 hover:border-prizm">
          <span class="font-display text-xl uppercase">{c.city}</span>
          <span class="block text-sm text-muted">{c.stores.length} {c.stores.length === 1 ? 'shop' : 'shops'}</span>
        </a>
      </li>
    ))}
  </ul>
</Base>
```

- [ ] **Step 3: Write the city page**

Create `src/pages/[province]/[city]/index.astro`:

```astro
---
import Base from '../../../layouts/Base.astro';
import StoreCard from '../../../components/StoreCard.astro';
import storesJson from '../../../data/stores.json';
import type { Store } from '../../../lib/types';
import { provincesWithStores, citiesIn, provinceBySlug } from '../../../lib/stores';

export function getStaticPaths() {
  const stores = storesJson as Store[];
  return provincesWithStores(stores).flatMap((p) =>
    citiesIn(stores, p.code).map((c) => ({ params: { province: p.slug, city: c.citySlug } })),
  );
}

const stores = storesJson as Store[];
const province = provinceBySlug(Astro.params.province);
if (!province) throw new Error(`unknown province slug: ${Astro.params.province}`);
const cityGroup = citiesIn(stores, province.code).find((c) => c.citySlug === Astro.params.city);
if (!cityGroup) throw new Error(`unknown city slug: ${Astro.params.city}`);
---
<Base
  title={`Sports Card Shops in ${cityGroup.city}, ${province.code} (${cityGroup.stores.length}) | Sports Cards Near Me`}
  description={`Find sports card shops in ${cityGroup.city}, ${province.name}: ${cityGroup.stores.length} verified ${cityGroup.stores.length === 1 ? 'store' : 'stores'} with ratings, hours, and directions.`}
>
  <nav class="mt-10 text-sm text-muted"><a href={`/${province.slug}/`} class="hover:text-paper">{province.name}</a> / {cityGroup.city}</nav>
  <h1 class="mt-3 text-5xl md:text-7xl">{cityGroup.city}</h1>
  <div class="refractor-rule mt-4 w-28"></div>
  <p class="mt-4 max-w-prose text-muted">
    {cityGroup.stores.length} sports card {cityGroup.stores.length === 1 ? 'shop' : 'shops'} in {cityGroup.city}, {province.name}.
  </p>
  <ul class="mt-10 space-y-4">
    {cityGroup.stores.map((store) => <StoreCard store={store} />)}
  </ul>
</Base>
```

- [ ] **Step 4: Verify build output**

Run: `npm run build && ls dist/alberta/index.html dist/alberta/calgary/index.html dist/alberta/edmonton/index.html`
Expected: all three files exist. Run `grep -c 'store/' dist/alberta/calgary/index.html` — prints ≥1 (store links present).

- [ ] **Step 5: Commit**

```bash
git add src/components src/pages
git commit -m "feat: province and city pages with StoreCard"
```

---

### Task 9: Store detail page with LocalBusiness structured data

**Files:**
- Create: `src/pages/store/[slug]/index.astro`

**Interfaces:**
- Consumes: `Base.astro`, `stores.json`, `Store`, `PROVINCES`.
- Produces: route `/store/<slug>/` — exactly the path StoreCard links to.

- [ ] **Step 1: Write the page**

Create `src/pages/store/[slug]/index.astro`:

```astro
---
import Base from '../../../layouts/Base.astro';
import storesJson from '../../../data/stores.json';
import type { Store } from '../../../lib/types';
import { PROVINCES } from '../../../lib/types';

export function getStaticPaths() {
  return (storesJson as Store[]).map((s) => ({ params: { slug: s.slug }, props: { store: s } }));
}

interface Props { store: Store }
const { store } = Astro.props;
const provinceName = PROVINCES[store.province].name;
const provinceSlug = PROVINCES[store.province].slug;
const directions = `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`;

const ld: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: store.name,
  address: { '@type': 'PostalAddress', streetAddress: store.address, addressLocality: store.city, addressRegion: store.province, addressCountry: 'CA' },
  geo: { '@type': 'GeoCoordinates', latitude: store.lat, longitude: store.lng },
  ...(store.phone !== undefined && { telephone: store.phone }),
  ...(store.website !== undefined && { url: store.website }),
  ...(store.rating !== undefined &&
    store.reviewCount !== undefined && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: store.rating, reviewCount: store.reviewCount },
    }),
};
---
<Base
  title={`${store.name} — Sports Cards in ${store.city}, ${store.province} | Sports Cards Near Me`}
  description={`${store.name} in ${store.city}, ${provinceName}: address, hours, phone, and what they carry.`}
>
  <script type="application/ld+json" set:html={JSON.stringify(ld)} />
  <nav class="mt-10 text-sm text-muted">
    <a href={`/${provinceSlug}/`} class="hover:text-paper">{provinceName}</a> /
    <a href={`/${provinceSlug}/${store.citySlug}/`} class="hover:text-paper">{store.city}</a> / {store.name}
  </nav>
  <h1 class="mt-3 text-5xl md:text-7xl">{store.name}</h1>
  <div class="refractor-rule mt-4 w-28"></div>
  {store.rating !== undefined && (
    <p class="mt-4" style="color:#FFC46B" data-testid="rating">
      ★ {store.rating}{store.reviewCount !== undefined && <span class="text-muted"> · {store.reviewCount} Google reviews</span>}
    </p>
  )}
  <dl class="mt-8 grid max-w-2xl gap-4 text-sm">
    <div><dt class="font-semibold uppercase tracking-wide text-muted">Address</dt><dd class="mt-1">{store.address}</dd></div>
    {store.hours !== undefined && <div><dt class="font-semibold uppercase tracking-wide text-muted">Hours</dt><dd class="mt-1">{store.hours}</dd></div>}
    {store.phone !== undefined && <div><dt class="font-semibold uppercase tracking-wide text-muted">Phone</dt><dd class="mt-1"><a href={`tel:${store.phone.replace(/[^0-9+]/g, '')}`} class="text-prizm">{store.phone}</a></dd></div>}
  </dl>
  <div class="mt-8 flex flex-wrap gap-3">
    <a href={directions} rel="noopener" class="rounded-lg px-5 py-2.5 font-semibold text-ink" style="background:var(--gradient-refractor)">Directions</a>
    {store.website !== undefined && <a href={store.website} rel="noopener" class="rounded-lg border border-bord px-5 py-2.5 font-semibold hover:border-prizm">Website</a>}
    {store.social !== undefined && <a href={store.social} rel="noopener" class="rounded-lg border border-bord px-5 py-2.5 font-semibold hover:border-prizm">Social</a>}
  </div>
  {(store.services.length > 0 || store.sports.length > 0) && (
    <ul class="mt-8 flex max-w-2xl flex-wrap gap-2">
      {[...store.services, ...store.sports].map((t) => (
        <li class="rounded-full border border-bord px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{t}</li>
      ))}
    </ul>
  )}
  <p class="mt-12 text-sm text-muted">
    Own this shop? <a href="/suggest/" class="text-prizm">Claim or update your listing</a>.
  </p>
</Base>
```

- [ ] **Step 2: Verify build output**

Run: `npm run build && node -e "const s=require('./src/data/stores.json')[0]; process.stdout.write('dist/store/'+s.slug+'/index.html\n')" | xargs ls`
Expected: the first store's HTML file exists. Then `grep -l 'application/ld+json' dist/store/*/index.html | head -1` prints a path.

- [ ] **Step 3: Commit**

```bash
git add src/pages/store
git commit -m "feat: store detail pages with LocalBusiness structured data"
```

---

### Task 10: Home page, suggest page, 404

**Files:**
- Create: `src/pages/suggest.astro`, `src/pages/404.astro`
- Modify: `src/pages/index.astro` (replace placeholder)

**Interfaces:**
- Consumes: everything above. The `<section id="map-slot">` div on home is the mount target Plan 2's Mapbox island replaces — keep the id exactly `map-slot`.

- [ ] **Step 1: Write the home page**

Replace `src/pages/index.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import storesJson from '../data/stores.json';
import type { Store } from '../lib/types';
import { provincesWithStores, citiesIn } from '../lib/stores';

const stores = storesJson as Store[];
const provinces = provincesWithStores(stores);
const featuredCities = provinces.flatMap((p) =>
  citiesIn(stores, p.code).map((c) => ({ ...c, provinceSlug: p.slug, provinceCode: p.code })),
).sort((a, b) => b.stores.length - a.stores.length).slice(0, 8);
---
<Base
  title="Sports Cards Near Me — Every Card Shop in Canada, One Map"
  description={`Canada's sports card shop directory: ${stores.length} verified stores with hours, ratings, and directions. Hockey, baseball, basketball, football, Pokémon.`}
>
  <section class="mt-16 md:mt-24">
    <h1 class="max-w-3xl text-6xl md:text-8xl">Every card shop in Canada. One map.</h1>
    <div class="refractor-rule mt-5 w-32"></div>
    <p class="mt-5 max-w-xl text-lg text-muted">
      {stores.length} shops — verified, mapped, and up to date. Find your next hit.
    </p>
  </section>

  <section id="map-slot" class="mt-12 rounded-xl border border-bord bg-panel p-6 text-sm text-muted">
    Interactive map coming right here — browse by city below.
  </section>

  <section class="mt-16">
    <h2 class="text-3xl">Busiest cities</h2>
    <ul class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {featuredCities.map((c) => (
        <li>
          <a href={`/${c.provinceSlug}/${c.citySlug}/`} class="block rounded-xl border border-bord bg-panel p-4 hover:border-prizm">
            <span class="font-display text-xl uppercase">{c.city}</span>
            <span class="block text-sm text-muted">{c.stores.length} shops</span>
          </a>
        </li>
      ))}
    </ul>
  </section>

  <section class="mt-16">
    <h2 class="text-3xl">Browse by province</h2>
    <ul class="mt-6 flex flex-wrap gap-3">
      {provinces.map((p) => (
        <li><a href={`/${p.slug}/`} class="rounded-full border border-bord px-4 py-2 text-sm hover:border-prizm">{p.name} · {p.count}</a></li>
      ))}
    </ul>
    <p class="mt-4 text-sm text-muted">More provinces are being verified now — Canada-wide coverage is on the way.</p>
  </section>
</Base>
```

- [ ] **Step 2: Write suggest + 404**

Create `src/pages/suggest.astro`:

```astro
---
import Base from '../layouts/Base.astro';
---
<Base
  title="Suggest a Store | Sports Cards Near Me"
  description="Add a missing card shop, update a listing, or claim your store on Sports Cards Near Me."
>
  <h1 class="mt-16 text-5xl md:text-7xl">Is something missing?</h1>
  <div class="refractor-rule mt-4 w-28"></div>
  <p class="mt-5 max-w-prose text-muted">
    Suggest a new store, update details for an existing shop, or claim your own listing.
    Every submission is reviewed before it goes live.
  </p>
  <a
    href="https://docs.google.com/forms/d/e/1FAIpQLSeuDSpremAwIczTb4Leu1B4-5-niUrgYPCd2QKADmzmRnU4-A/viewform"
    rel="noopener"
    class="mt-8 inline-block rounded-lg px-6 py-3 font-semibold text-ink"
    style="background:var(--gradient-refractor)"
  >Open the submission form</a>
  <p class="mt-4 text-xs text-muted">An on-site form (no Google account needed) is coming in the next release.</p>
</Base>
```

Create `src/pages/404.astro`:

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Not Found | Sports Cards Near Me" description="That page has been traded away.">
  <h1 class="mt-24 text-6xl">Traded away.</h1>
  <p class="mt-4 text-muted">That page doesn't exist. <a href="/" class="text-prizm">Back to the directory</a>.</p>
</Base>
```

- [ ] **Step 3: Verify build**

Run: `npm run build && grep -c 'map-slot' dist/index.html && ls dist/suggest/index.html dist/404.html`
Expected: `1`, and both files exist.

- [ ] **Step 4: Commit**

```bash
git add src/pages
git commit -m "feat: home, suggest, and 404 pages"
```

---

### Task 11: Sitemap + robots

**Files:**
- Modify: `astro.config.mjs`
- Create: `public/robots.txt`

**Interfaces:**
- Consumes: `site` already set in config (Task 1).
- Produces: `dist/sitemap-index.xml` at build; robots.txt referencing it.

- [ ] **Step 1: Add the sitemap integration**

```bash
npx astro add sitemap --yes
```

Expected: `astro.config.mjs` now includes `integrations: [sitemap()]` alongside the Tailwind vite plugin.

- [ ] **Step 2: Write robots.txt**

Create `public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://sportscardsnearme.ca/sitemap-index.xml
```

- [ ] **Step 3: Verify**

Run: `npm run build && ls dist/sitemap-index.xml dist/robots.txt`
Expected: both exist.

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs public/robots.txt package.json package-lock.json
git commit -m "feat: sitemap and robots.txt"
```

---

### Task 12: Playwright smoke tests (mobile 375px + desktop)

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: built site via `astro preview`.
- Produces: `npm run test:e2e` green — the CI gate.

- [ ] **Step 1: Install**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Write config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  webServer: {
    command: 'npm run preview -- --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env['CI'],
  },
  use: { baseURL: 'http://localhost:4321' },
  projects: [
    { name: 'mobile-375', use: { viewport: { width: 375, height: 812 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

- [ ] **Step 3: Write the smoke spec**

Create `tests/e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import stores from '../../src/data/stores.json';

const first = stores[0];
if (!first) throw new Error('no baked stores — run npm run bake');

test('home renders hero and city links', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText(/every card shop/i);
  await expect(page.locator('a[href^="/alberta/"]').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow, 'no horizontal scroll').toBe(false);
});

test('city page lists store cards linking to detail pages', async ({ page }) => {
  await page.goto(`/alberta/${first.citySlug}/`);
  const link = page.locator(`a[href="/store/${first.slug}/"]`).first();
  await expect(link).toBeVisible();
});

test('store page has structured data, directions, and tel link when present', async ({ page }) => {
  await page.goto(`/store/${first.slug}/`);
  await expect(page.locator('h1')).toContainText(first.name.split(' ')[0] ?? '');
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(ld).toContain('"@type":"Store"');
  await expect(page.locator('a', { hasText: 'Directions' })).toBeVisible();
});

test('404 page serves', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist/');
  expect(res?.status()).toBe(404);
});
```

- [ ] **Step 4: Build then run e2e**

Run: `npm run build && npm run test:e2e`
Expected: 8 passed (4 tests × 2 viewport projects). If the 404 status assertion fails under `astro preview` (some static hosts return 200 for the 404 page), change that assertion to `expect(await page.locator('h1').textContent()).toContain('Traded away')` — the page content is the contract, the status code is host behavior.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e package.json package-lock.json .gitignore
git commit -m "test: Playwright smoke at 375px and desktop"
```

---

### Task 13: CI — build, test, daily re-bake, deploy to Cloudflare Pages

**Files:**
- Create: `.github/workflows/site.yml`

**Interfaces:**
- Consumes: all npm scripts above.
- Produces: on every push to `redesign` and daily at 09:00 UTC: bake → unit tests → build → e2e → deploy preview to Cloudflare Pages project `sportscardsnearme`.
- **Nathan steps (blockers for the deploy step only, not for CI tests):** create the Cloudflare Pages project (`npx wrangler pages project create sportscardsnearme` after `npx wrangler login`), then add repo secrets `CLOUDFLARE_API_TOKEN` (Pages:Edit permission) and `CLOUDFLARE_ACCOUNT_ID`. Record in `~/jarvis-memory/_ops/WAITING-ON-NATHAN.md` when this task starts.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/site.yml`:

```yaml
name: site
on:
  push:
    branches: [redesign]
  schedule:
    - cron: '0 9 * * *'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: redesign
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run bake
      - run: npm test
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          CI: 'true'
      - name: Deploy to Cloudflare Pages
        if: ${{ github.event_name != 'pull_request' }}
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=sportscardsnearme --branch=redesign
```

Note: the scheduled run re-bakes from the sheet, so a sheet edit ships within 24h with no human step (spec acceptance #6). The bake's count guard makes a broken sheet fail the build instead of shipping an empty site.

- [ ] **Step 2: Validate YAML locally**

Run: `npx --yes yaml-lint .github/workflows/site.yml || node -e "const yaml=require('js-yaml')"` — if neither tool is available, visually confirm indentation and run `git diff --check`.
Expected: no parse errors.

- [ ] **Step 3: Commit and push the branch (branch push only — never main)**

```bash
git add .github/workflows/site.yml
git commit -m "ci: build, test, daily re-bake, Cloudflare Pages deploy"
git push -u origin redesign
```

- [ ] **Step 4: Verify CI**

Run: `gh run watch --repo ndwiebe/sports-cards-near-me` (or `gh run list --branch redesign --limit 1`)
Expected: bake/test/build/e2e steps green. The deploy step fails until Nathan adds the two secrets — that is expected; add the WAITING-ON-NATHAN line and report it, don't treat it as a code failure.

---

## Self-Review (done at authoring time)

- **Spec coverage (Plan 1's slice):** data pipeline + guard (§6.4–6.5, acceptance #1/#6) → Tasks 4–6, 13. Tokens/type (§3) → Task 2. Site structure minus map/shows/guides (§4) → Tasks 8–10. SEO plumbing (§4, acceptance #3) → Tasks 9, 11. Tests at 375px (§8, acceptance #2 partial) → Task 12. $0 hosting (§8) → Task 13. Deferred by decomposition: map island (Plan 2), Canada-wide data + logos (Plan 3), brand mark/imagery/shows/guides/native suggest (Plan 4), launch cutover + Lighthouse budget + Rich Results validation (Plan 5).
- **Placeholder scan:** clean — every code step has complete code; the suggest page's interim Google-Form link is an explicit product decision noted in the copy, not a TBD.
- **Type consistency:** `Store` fields used in pages match Task 3's interface; `GvizRow` flows Task 4 → 5 → 6; route `/store/${slug}/` consistent between StoreCard (Task 8) and detail page (Task 9); `map-slot` id reserved for Plan 2.
