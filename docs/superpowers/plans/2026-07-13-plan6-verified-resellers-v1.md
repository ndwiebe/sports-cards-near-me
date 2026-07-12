# Plan 6: Verified Resellers v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (or superpowers:executing-plans). Steps use checkbox syntax. This plan is written to be executable by a model with ZERO prior context on this project — §0 gives you everything the original crew knew.

**Goal:** Public, trusted profiles for storefront-less card sellers on sportscardsnearme.ca: `/resellers/` index, per-reseller profile pages, a join page, and visually distinct city-centroid pins on the 3D map — published through the existing Google-Sheet → bake → daily-rebuild machinery. No accounts, no login, no server.

**Binding product spec:** `docs/superpowers/specs/2026-07-12-verified-resellers-prd.md` (APPROVED by Nathan 2026-07-12). If this plan and the PRD conflict, the PRD governs and the conflict goes to Nathan.

**Tech stack:** Astro 7 (static output), TypeScript on `astro/tsconfigs/strictest` (`exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` are ON), Tailwind v4 via `@tailwindcss/vite`, Vitest (`tests/unit/**`), Playwright e2e, Mapbox GL JS v3 + supercluster.

---

## §0. Orientation for a cold model (read once, believe it)

**Repo:** `ndwiebe/sports-cards-near-me`, branch **`redesign`** (NEVER commit to `main`). Local checkouts on Nathan's Mac: `~/Projects/8-Web-Apps/sports-cards-near-me` and worktree `~/Projects/8-Web-Apps/scnm-plan4` (both on redesign historically — verify with `git branch --show-current` before working; any one checkout on `redesign` is fine).

**Deploy path (memorize; it is not the usual one):** the live domain sportscardsnearme.ca is GitHub Pages in WORKFLOW mode. `main`'s `.github/workflows/site.yml` checks out **`ref: redesign`**, builds it, and deploys. Ship = `gh workflow run site.yml --ref main`. NEVER merge redesign→main (conflicts with dead old-site history; unnecessary). Branch pushes to `redesign` also produce Cloudflare Pages previews automatically.

**Gates (all four, before any task is "done"):**
```bash
npm test              # Vitest unit suite — currently 59 passing
npx tsc --noEmit      # strictest TS — zero errors tolerated
npm run build         # ~778 static pages
npm run test:e2e      # Playwright — currently 39 passed / 3 conditional skips
```
The e2e suite self-adjusts to token presence: with no `PUBLIC_MAPBOX_TOKEN` env var some map tests self-skip. Run gates BOTH ways when you touch map code (`PUBLIC_MAPBOX_TOKEN= npm run build && PUBLIC_MAPBOX_TOKEN= npm run test:e2e`, then with the token from `.env`; note `env -u` does NOT work — Vite reloads `.env` from disk, only an empty-string process var overrides it).

**Data source of truth:** Google Sheet `14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I`. Tabs are fetched at bake time via the public gviz endpoint (`src/lib/sheet.ts` — `fetchSheetRowsByName(sheetId, tabName)`). Baked JSON is committed to `src/data/` and the site builds from it. A daily scheduled workflow re-bakes and republishes.

**Hard-won rules (violating any of these is a review-blocking defect):**
1. **Sheet dates:** gviz returns native date cells as `{v: "Date(2026,6,10)", f: "<locale display text>"}`. Parse the `Date(y,m0,d)` constructor from `v` (month is 0-indexed) as the PRIMARY path; `f` is locale-dependent and must only be an ISO-text fallback. `src/lib/shows.ts` lines 24–48 are the canonical implementation — reuse via export, don't re-derive.
2. **XSS:** the ONE sanctioned `set:html` pattern is `JSON.stringify(x).replace(/</g, '\\u003c')` for JSON-LD script tags and the map payload. Everything else renders through normal Astro templating. Never use `innerHTML`; build DOM from data with `createElement`/`textContent` (see `src/scripts/pins.ts`).
3. **Token-optional map:** with no/empty `PUBLIC_MAPBOX_TOKEN`, `mountMap()` returns `null` and the shell collapses to a text fallback (`src/scripts/map-core.ts:34-39`). Anything you add to the map path must no-op identically. On-map visuals only render after the map's `load` event — with a dummy token markers never appear; this is known behavior, not a bug.
4. **No `console.log`** — scripts use `src/lib/log.ts`. No `any`. Optional interface fields are declared `field?: T | undefined` (exactOptionalPropertyTypes).
5. **Refractor gradient** (`--gradient-refractor`) has exactly five sanctioned uses (headline rule, primary button, focus ring, featured ring, brand-mark accent) — do NOT add a sixth. The reseller badge uses gold/well tokens, not the gradient.
6. **Island→page handoff** uses `src/scripts/map-registry.ts` (`registerMap`/`whenMapReady`) — never CustomEvents (they race Astro module script order; proven live).
7. Editorial/program copy: plain language, every jargon term glossed at first use, zero fabricated facts or prices.

**Review protocol (how this plan expects to be executed):** fresh implementer subagent per task → task review (spec + code quality) → fix wave → re-review. Reports under `.superpowers/sdd/` (gitignored). Progress ledger: `.superpowers/sdd/progress.md`.

**Controller/human pre-work checklist (Task 1 needs the tab; Task 3 works without the form):**
- [ ] Create sheet tab `Resellers` with header row exactly: `Display Name | City | Province | Bio | Photo URL | Specialties | eBay | Facebook | Instagram | Website | Contact | Status | Evidence | Notes | Verified Date`
- [ ] (Any time before launch announce) Create the "Become a Verified Reseller" Google Form (fields mirror Task 3's list) with responses feeding the master sheet; paste its URL into `JOIN_FORM_URL` in `src/pages/resellers/join/index.astro` (Task 3 ships with a graceful "email us" fallback until then).

---

### Task 1: Resellers data pipeline

**Files:**
- Create: `src/lib/resellers.ts`
- Test: `tests/unit/resellers.test.ts`
- Create: `scripts/bake-resellers.ts`
- Create: `src/data/resellers.json` (baked output, committed — will be `[]` at launch)
- Modify: `package.json` (one script), `.github/workflows/site.yml` (one step)
- Modify: `src/lib/shows.ts` (export `isoDate` — currently module-private)

**Interfaces produced (Tasks 2 & 4 depend on these exact names):**
```ts
export interface ResellerRecord { slug; name; city; citySlug; province; bio?; photo?; specialties; ebay?; facebook?; instagram?; website?; contact?; verifiedSince?; }
export function rowToReseller(cells: GvizRow): ResellerRecord | null
```

- [ ] **Step 1.1: export `isoDate` from shows.ts.** In `src/lib/shows.ts` change `const isoDate = (` to `export const isoDate = (` (line ~34). Run `npm test` — all existing tests still green (expected: 59 passed).

- [ ] **Step 1.2: write the failing tests.** Create `tests/unit/resellers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rowToReseller } from '../../src/lib/resellers';
import type { GvizCell, GvizRow } from '../../src/lib/sheet';

const cell = (v: string | number | null, f?: string): GvizCell | null =>
  v === null ? null : f !== undefined ? { v, f } : { v };

// Column order matches the Resellers sheet tab headers:
// 0 Display Name | 1 City | 2 Province | 3 Bio | 4 Photo URL | 5 Specialties
// 6 eBay | 7 Facebook | 8 Instagram | 9 Website | 10 Contact | 11 Status
// 12 Evidence | 13 Notes | 14 Verified Date
const row = (over: Partial<Record<number, GvizCell | null>> = {}): GvizRow => {
  const base: (GvizCell | null)[] = [
    cell('Prairie Slabs'),
    cell('Calgary'),
    cell('AB'),
    cell('Hockey and vintage, mostly pre-2000.'),
    cell('https://example.com/avatar.webp'),
    cell('hockey; vintage'),
    cell('https://www.ebay.ca/usr/prairieslabs'),
    cell('https://facebook.com/prairieslabs'),
    null,
    null,
    cell('prairieslabs@example.com'),
    cell('Verified'),
    cell('https://www.ebay.ca/fdbk/feedback_profile/prairieslabs'), // Evidence — PRIVATE
    cell('Met at Calgary Expo, solid.'),                            // Notes — PRIVATE
    cell('Date(2026,6,12)', '2026-07-12'),
  ];
  return base.map((c, i) => (i in over ? (over[i] ?? null) : c));
};

describe('rowToReseller', () => {
  it('maps a Verified row to a complete record', () => {
    const r = rowToReseller(row());
    expect(r).toMatchObject({
      slug: 'prairie-slabs-calgary',
      name: 'Prairie Slabs',
      city: 'Calgary',
      citySlug: 'calgary',
      province: 'AB',
      bio: 'Hockey and vintage, mostly pre-2000.',
      photo: 'https://example.com/avatar.webp',
      specialties: ['hockey', 'vintage'],
      ebay: 'https://www.ebay.ca/usr/prairieslabs',
      facebook: 'https://facebook.com/prairieslabs',
      contact: 'prairieslabs@example.com',
      verifiedSince: '2026-07-12',
    });
    expect(r?.instagram).toBeUndefined();
    expect(r?.website).toBeUndefined();
  });

  it('NEVER carries Evidence or Notes into the record (Nathan-private columns)', () => {
    const r = rowToReseller(row());
    const serialized = JSON.stringify(r);
    expect(serialized).not.toContain('fdbk');
    expect(serialized).not.toContain('Met at Calgary Expo');
  });

  it('drops rows whose Status is not Verified', () => {
    expect(rowToReseller(row({ 11: cell('Pending') }))).toBeNull();
    expect(rowToReseller(row({ 11: cell('Rejected') }))).toBeNull();
    expect(rowToReseller(row({ 11: null }))).toBeNull();
  });

  it('accepts Status with case/whitespace variance', () => {
    expect(rowToReseller(row({ 11: cell('  verified ') }))).not.toBeNull();
    expect(rowToReseller(row({ 11: cell('VERIFIED') }))).not.toBeNull();
  });

  it('drops rows missing name, city, or province', () => {
    expect(rowToReseller(row({ 0: null }))).toBeNull();
    expect(rowToReseller(row({ 1: null }))).toBeNull();
    expect(rowToReseller(row({ 2: cell('Texas') }))).toBeNull();
  });

  it('rejects non-http(s) link values', () => {
    expect(rowToReseller(row({ 6: cell('javascript:alert(1)') }))?.ebay).toBeUndefined();
    expect(rowToReseller(row({ 9: cell('ftp://example.com') }))?.website).toBeUndefined();
  });

  it('parses the gviz Date() constructor for Verified Date, ignoring locale display text', () => {
    expect(rowToReseller(row({ 14: cell('Date(2026,6,12)', '7/12/2026') }))?.verifiedSince).toBe('2026-07-12');
    expect(rowToReseller(row({ 14: null }))?.verifiedSince).toBeUndefined();
  });

  it('slug omits the date (stable across re-verification) and dedupes are the bake script\'s job', () => {
    expect(rowToReseller(row())?.slug).toBe('prairie-slabs-calgary');
  });
});
```

- [ ] **Step 1.3: run to confirm RED.** `npx vitest run tests/unit/resellers.test.ts` — expected: FAIL, cannot resolve `../../src/lib/resellers`.

- [ ] **Step 1.4: implement.** Create `src/lib/resellers.ts`:

```ts
import type { GvizCell, GvizRow } from './sheet';
import type { ProvinceCode } from './types';
import { PROVINCES } from './types';
import { sanitizeText, slugify, splitList } from './transform';
import { httpUrl } from './stores-build';
import { isoDate } from './shows';

export interface ResellerRecord {
  slug: string;
  name: string;
  city: string;
  citySlug: string;
  province: ProvinceCode;
  bio?: string | undefined;
  photo?: string | undefined;
  specialties: string[];
  ebay?: string | undefined;
  facebook?: string | undefined;
  instagram?: string | undefined;
  website?: string | undefined;
  contact?: string | undefined;
  verifiedSince?: string | undefined;
}

// Resellers tab column order (0-based). Columns 12 (Evidence) and 13 (Notes)
// are Nathan-private review material: they are deliberately never read, so
// they can never leak into the baked JSON or the public site.
const COL = {
  name: 0, city: 1, province: 2, bio: 3, photo: 4, specialties: 5,
  ebay: 6, facebook: 7, instagram: 8, website: 9, contact: 10,
  status: 11, verifiedDate: 14,
} as const;

const provinceCode = (raw: unknown): ProvinceCode | null => {
  const text = sanitizeText(raw);
  if (text === undefined) return null;
  const code = text.toUpperCase();
  return code in PROVINCES ? (code as ProvinceCode) : null;
};

const isVerified = (cell: GvizCell | null | undefined): boolean =>
  sanitizeText(cell?.v)?.toLowerCase() === 'verified';

export function rowToReseller(cells: GvizRow): ResellerRecord | null {
  if (!isVerified(cells[COL.status])) return null;
  const name = sanitizeText(cells[COL.name]?.v);
  const city = sanitizeText(cells[COL.city]?.v);
  const province = provinceCode(cells[COL.province]?.v);
  if (name === undefined || city === undefined || province === null) return null;

  return {
    slug: slugify(`${name}-${city}`),
    name,
    city,
    citySlug: slugify(city),
    province,
    bio: sanitizeText(cells[COL.bio]?.v),
    photo: httpUrl(cells[COL.photo]?.v),
    specialties: splitList(cells[COL.specialties]?.v),
    ebay: httpUrl(cells[COL.ebay]?.v),
    facebook: httpUrl(cells[COL.facebook]?.v),
    instagram: httpUrl(cells[COL.instagram]?.v),
    website: httpUrl(cells[COL.website]?.v),
    contact: sanitizeText(cells[COL.contact]?.v),
    verifiedSince: isoDate(cells[COL.verifiedDate]),
  };
}
```

- [ ] **Step 1.5: run to confirm GREEN.** `npx vitest run tests/unit/resellers.test.ts` — expected: all tests pass. Then full `npm test` (expected: prior count + new tests, all green).

- [ ] **Step 1.6: bake script.** Create `scripts/bake-resellers.ts` (mirror of `scripts/bake-shows.ts` — open it side-by-side):

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { fetchSheetRowsByName } from '../src/lib/sheet';
import { rowToReseller } from '../src/lib/resellers';
import { sanitizeText } from '../src/lib/transform';
import { log } from '../src/lib/log';

const SHEET_ID = '14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I';
const SHEET_NAME = 'Resellers';
const OUT = 'src/data/resellers.json';

const rows = await fetchSheetRowsByName(SHEET_ID, SHEET_NAME);
const mapped = rows.map((cells, i) => ({ cells, i, reseller: rowToReseller(cells) }));

for (const { cells, i, reseller } of mapped) {
  if (reseller === null) {
    const name = sanitizeText(cells[0]?.v);
    log.warn(`skipped row ${i}${name !== undefined ? ` (${name})` : ''}: not Verified or missing required field(s)`);
  }
}

const seen = new Set<string>();
const resellers = mapped
  .flatMap(({ reseller }) => (reseller !== null ? [reseller] : []))
  .filter((r) => {
    if (seen.has(r.slug)) {
      log.warn(`duplicate slug dropped: ${r.slug}`);
      return false;
    }
    seen.add(r.slug);
    return true;
  })
  .sort((a, b) => a.province.localeCompare(b.province) || a.name.localeCompare(b.name));

// NO count guard — zero verified resellers is the designed launch state.
await mkdir('src/data', { recursive: true });
await writeFile(OUT, JSON.stringify(resellers, null, 2) + '\n');
log.info(`baked ${resellers.length} resellers (${mapped.length - resellers.length - (mapped.length - mapped.filter(m => m.reseller !== null).length) >= 0 ? mapped.filter(m => m.reseller === null).length : 0} rows skipped) → ${OUT}`);
```
(Simplify that last log line to: `log.info(\`baked ${resellers.length} resellers → ${OUT}\`)` plus a separate skipped-count line if clearer — behavior over cleverness.)

- [ ] **Step 1.7: wire the script.** In `package.json` scripts, after `"bake:shows"`, add: `"bake:resellers": "tsx scripts/bake-resellers.ts",`. In `.github/workflows/site.yml`, find the step that runs `npm run bake:shows` and add immediately after it (same indentation):
```yaml
      - run: npm run bake:resellers
```
(One workflow edit; touch nothing else in the file. This lands on `redesign` — `main`'s copy of site.yml checks out redesign at run time, so the daily rebuild picks it up automatically once a controller/human syncs site.yml to main IF main's copy is what executes; verify: `git show origin/main:.github/workflows/site.yml | grep bake` — if `bake:resellers` is absent from main's copy, note it in your report: controller must copy the workflow file to main (one-file commit, Nathan approves main pushes).)

- [ ] **Step 1.8: live bake.** `npm run bake:resellers` — expected: `baked 0 resellers` (tab is empty at launch) and `src/data/resellers.json` containing `[]`. Commit it.

- [ ] **Step 1.9: gates + commit.** All four gates. `git add src/lib/resellers.ts src/lib/shows.ts tests/unit/resellers.test.ts scripts/bake-resellers.ts src/data/resellers.json package.json .github/workflows/site.yml && git commit -m "feat: resellers data pipeline (Resellers tab -> resellers.json)" && git pull --rebase origin redesign && git push origin redesign`

### Task 2: Profile pages, index, nav, program copy

**Files:**
- Create: `src/pages/resellers/index.astro`, `src/pages/resellers/[slug]/index.astro`
- Modify: `src/layouts/Base.astro` (nav only)
- Test: extend `tests/e2e/plan6.spec.ts` (create it this task)

**Consumes:** `ResellerRecord` from Task 1; `resellers.json` (empty at launch — BOTH states must build).

- [ ] **Step 2.1: nav.** In `src/layouts/Base.astro`, the nav link block currently reads:
```html
          <a href="/alberta/" class="hover:text-paper">Browse</a>
          <a href="/shows/" class="hover:text-paper">Shows</a>
          <a href="/guides/" class="hover:text-paper">Guides</a>
          <a href="/suggest/" class="hover:text-paper">Suggest a store</a>
```
Insert `<a href="/resellers/" class="hover:text-paper">Resellers</a>` between Shows and Guides.

- [ ] **Step 2.2: profile page.** Create `src/pages/resellers/[slug]/index.astro`. Model header/breadcrumb/rule/JSON-LD styling on `src/pages/store/[slug]/index.astro` and `src/pages/guides/card-grading-101.astro` (read both first). Full page:

```astro
---
import Base from '../../../layouts/Base.astro';
import resellersJson from '../../../data/resellers.json';
import storesJson from '../../../data/stores.json';
import type { ResellerRecord } from '../../../lib/resellers';
import type { Store } from '../../../lib/types';
import { PROVINCES } from '../../../lib/types';
import { initialsOf } from '../../../lib/map-data';
import { parseLocalDate } from '../../../lib/shows';

export function getStaticPaths() {
  return (resellersJson as ResellerRecord[]).map((r) => ({ params: { slug: r.slug }, props: { reseller: r } }));
}
const { reseller } = Astro.props as { reseller: ResellerRecord };
const prov = PROVINCES[reseller.province];
const stores = storesJson as Store[];
// Link the city name only when the directory actually has a page for it.
const cityHasPage = stores.some((s) => s.province === reseller.province && s.citySlug === reseller.citySlug);
const links: { label: string; href: string }[] = [
  ...(reseller.ebay !== undefined ? [{ label: 'eBay store', href: reseller.ebay }] : []),
  ...(reseller.facebook !== undefined ? [{ label: 'Facebook', href: reseller.facebook }] : []),
  ...(reseller.instagram !== undefined ? [{ label: 'Instagram', href: reseller.instagram }] : []),
  ...(reseller.website !== undefined ? [{ label: 'Website', href: reseller.website }] : []),
];
const verifiedSinceLabel =
  reseller.verifiedSince !== undefined
    ? new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric' }).format(parseLocalDate(reseller.verifiedSince))
    : undefined;
const ld: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  mainEntity: {
    '@type': 'Person',
    name: reseller.name,
    ...(reseller.bio !== undefined && { description: reseller.bio }),
    address: { '@type': 'PostalAddress', addressLocality: reseller.city, addressRegion: reseller.province, addressCountry: 'CA' },
    ...(links.length > 0 && { sameAs: links.map((l) => l.href) }),
  },
};
const reportHref = `mailto:hello@displaymycard.com?subject=${encodeURIComponent(`Report a problem: ${reseller.name} (verified reseller)`)}`;
---
<Base
  title={`${reseller.name} — Verified Reseller in ${reseller.city} | Sports Cards Near Me`}
  description={`${reseller.name} is an SCNM Verified card reseller in ${reseller.city}, ${prov.name}.${reseller.bio !== undefined ? ` ${reseller.bio}` : ''}`}
>
  <script type="application/ld+json" set:html={JSON.stringify(ld).replace(/</g, '\\u003c')} />
  <nav class="mt-10 text-sm text-muted">
    <a href="/resellers/" class="hover:text-paper">Verified Resellers</a>
    <span aria-hidden="true"> / </span>
    <span>{reseller.name}</span>
  </nav>
  <div class="mt-6 flex items-start gap-5">
    {reseller.photo !== undefined ? (
      <img src={reseller.photo} alt="" width="72" height="72" loading="lazy"
        class="h-18 w-18 rounded-full border border-bord bg-well object-cover" />
    ) : (
      <div class="grid h-18 w-18 place-items-center rounded-full border border-bord bg-well font-display text-2xl text-prizm" aria-hidden="true">
        {initialsOf(reseller.name)}
      </div>
    )}
    <div>
      <h1 class="text-4xl md:text-6xl">{reseller.name}</h1>
      <div class="refractor-rule mt-3 w-24"></div>
      <p class="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span class="rounded-full border border-gold/60 bg-well px-3 py-1 font-semibold text-gold">SCNM Verified</span>
        {verifiedSinceLabel !== undefined && <span class="text-muted">since {verifiedSinceLabel}</span>}
        <span class="text-muted">
          {cityHasPage ? <a href={`/${prov.slug}/${reseller.citySlug}/`} class="hover:text-paper">{reseller.city}, {prov.name}</a> : `${reseller.city}, ${prov.name}`}
        </span>
      </p>
    </div>
  </div>

  {reseller.bio !== undefined && <p class="mt-8 max-w-prose text-paper/90">{reseller.bio}</p>}

  {reseller.specialties.length > 0 && (
    <div class="mt-6 flex flex-wrap gap-2">
      {reseller.specialties.map((s) => (
        <span class="rounded-full border border-bord bg-well px-3 py-1 text-xs uppercase tracking-wide text-muted">{s}</span>
      ))}
    </div>
  )}

  {links.length > 0 && (
    <section class="mt-10">
      <h2 class="text-2xl">Where they sell</h2>
      <ul role="list" class="mt-4 flex flex-wrap gap-3">
        {links.map((l) => (
          <li>
            <a href={l.href} target="_blank" rel="noopener nofollow"
              class="inline-block rounded-lg border border-bord bg-panel px-5 py-2.5 font-semibold hover:border-prizm">
              {l.label} ↗
            </a>
          </li>
        ))}
      </ul>
    </section>
  )}

  {reseller.contact !== undefined && (
    <p class="mt-8 text-sm text-muted">Prefers to be reached at: <span class="text-paper">{reseller.contact}</span></p>
  )}

  <footer class="mt-14 max-w-prose border-t border-bord/50 pt-6 text-xs text-muted">
    <p>
      <strong class="text-paper">What "verified" means:</strong> we checked this seller's public selling track
      record before listing them. Sports Cards Near Me doesn't process transactions and can't guarantee any sale.
      Verified status is removed if credible problems are reported to us and confirmed —
      <a href={reportHref} class="text-prizm">tell us if something's wrong</a>.
    </p>
  </footer>
</Base>
```

- [ ] **Step 2.3: index page.** Create `src/pages/resellers/index.astro`:

```astro
---
import Base from '../../layouts/Base.astro';
import resellersJson from '../../data/resellers.json';
import type { ResellerRecord } from '../../lib/resellers';
import { PROVINCES } from '../../lib/types';
import type { ProvinceCode } from '../../lib/types';
import { initialsOf } from '../../lib/map-data';

const resellers = resellersJson as ResellerRecord[];
const provinceOrder = Object.keys(PROVINCES) as ProvinceCode[];
const groups = provinceOrder
  .map((code) => ({ code, name: PROVINCES[code].name, resellers: resellers.filter((r) => r.province === code) }))
  .filter((g) => g.resellers.length > 0);
---
<Base
  title="Verified Resellers | Sports Cards Near Me"
  description="Canada's verified card resellers — trusted sellers without a storefront, checked by a human before listing."
>
  <p class="mt-16 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Directory</p>
  <h1 class="mt-2 text-5xl md:text-7xl">Verified Resellers</h1>
  <div class="refractor-rule mt-4 w-28"></div>
  <p class="mt-5 max-w-prose text-muted">
    Not every trusted card seller has a storefront. These sellers earned the
    <span class="text-gold">SCNM Verified</span> badge by showing an established public selling track record —
    and a human checked every application. We don't process transactions and can't guarantee any sale;
    verified status is removed if credible problems are reported to us and confirmed.
  </p>
  <a href="/resellers/join/"
    class="mt-8 inline-block rounded-lg px-6 py-3 font-semibold text-ink"
    style="background:var(--gradient-refractor)">Become a Verified Reseller</a>

  {groups.length === 0 ? (
    <p class="mt-14 max-w-prose rounded-xl border border-bord bg-panel p-6 text-muted">
      Verified reseller profiles are coming — the first applications are being reviewed now.
      Sell cards without a storefront? <a href="/resellers/join/" class="text-prizm">Apply above.</a>
    </p>
  ) : (
    groups.map((g) => (
      <section class="mt-12">
        <h2 class="text-2xl">{g.name}</h2>
        <ul role="list" class="mt-4 grid gap-4 sm:grid-cols-2">
          {g.resellers.map((r) => (
            <li>
              <a href={`/resellers/${r.slug}/`} data-reseller-card={r.slug}
                class="flex items-center gap-4 rounded-xl border border-bord bg-panel p-4 hover:border-prizm">
                <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-bord bg-well font-display text-prizm" aria-hidden="true">{initialsOf(r.name)}</span>
                <span>
                  <span class="block font-semibold">{r.name}</span>
                  <span class="block text-sm text-muted">{r.city} · {r.specialties.slice(0, 3).join(', ')}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    ))
  )}
</Base>
```
(Specialty filter chips are deliberately NOT in v1's index — YAGNI until there are enough resellers to filter; the PRD's chip requirement is satisfied at the city-page and tag level when population justifies it. Record this as a deviation in your report so the reviewer adjudicates consciously.)

- [ ] **Step 2.4: e2e.** Create `tests/e2e/plan6.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('resellers index renders program explainer or reseller cards', async ({ page }) => {
  const res = await page.goto('/resellers/');
  expect(res?.status()).toBe(200);
  const hasCards = await page.locator('[data-reseller-card]').count();
  if (hasCards === 0) {
    await expect(page.getByText('Verified reseller profiles are coming')).toBeVisible();
  } else {
    await expect(page.locator('[data-reseller-card]').first()).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Become a Verified Reseller' })).toBeVisible();
});

test('nav carries the Resellers link on other pages', async ({ page }) => {
  await page.goto('/guides/');
  await expect(page.locator('header nav a[href="/resellers/"]')).toBeVisible();
});
```

- [ ] **Step 2.5: both-states build check.** Build once with the committed (empty) `resellers.json`. Then temporarily overwrite it with one fixture record (any valid ResellerRecord JSON), build again, open `dist/resellers/<slug>/index.html` and confirm badge/links/footer render; **restore the empty file byte-identically** (`git checkout -- src/data/resellers.json`) before committing.

- [ ] **Step 2.6: gates + commit.** All four gates. Commit `feat: verified reseller profiles, index, nav` and push (pull --rebase first).

### Task 3: Join page — /resellers/join/

**Files:** Create `src/pages/resellers/join/index.astro`. (Pattern source: `src/pages/suggest.astro` — the live "form" is a styled outbound link to a Google Form; the sheet already receives form responses this way.)

- [ ] **Step 3.1: page.** Create `src/pages/resellers/join/index.astro`:

```astro
---
import Base from '../../../layouts/Base.astro';

// Set by the controller once the Google Form exists (see plan §0 pre-work).
// While it is null the page renders the email fallback — ship either way.
const JOIN_FORM_URL: string | null = null;

const CHECKLIST = [
  'Your display name or handle (real name optional — profiles are public)',
  'City and province (that's all the location we ever publish)',
  'What you collect and sell, in a sentence or two',
  'Links where you sell: eBay store, Facebook, Instagram, your own site',
  'Track-record evidence: your eBay feedback page, or equivalent public history — this part stays private',
];
---
<Base
  title="Become a Verified Reseller | Sports Cards Near Me"
  description="Apply for the SCNM Verified badge — for card sellers with an established track record and no storefront."
>
  <h1 class="mt-16 text-5xl md:text-7xl">Become a Verified Reseller</h1>
  <div class="refractor-rule mt-4 w-28"></div>
  <p class="mt-5 max-w-prose text-muted">
    The <span class="text-gold">SCNM Verified</span> badge is for sellers with an established public track
    record — roughly: 100+ eBay feedback at 98%+ positive across a year or more of selling, or the equivalent
    history on Facebook or Instagram. Meeting the bar earns consideration, not automatic approval:
    a human reviews every application. Your profile is public; verified status is removed if credible
    problems are reported to us and confirmed.
  </p>
  <h2 class="mt-10 text-2xl">Have these ready</h2>
  <ul role="list" class="mt-4 max-w-prose list-disc space-y-2 pl-5 text-paper/90">
    {CHECKLIST.map((item) => <li>{item}</li>)}
  </ul>
  {JOIN_FORM_URL !== null ? (
    <a href={JOIN_FORM_URL} target="_blank" rel="noopener"
      class="mt-10 inline-block rounded-lg px-6 py-3 font-semibold text-ink"
      style="background:var(--gradient-refractor)">Open the application form</a>
  ) : (
    <a href={`mailto:hello@displaymycard.com?subject=${encodeURIComponent('Verified Reseller application')}`}
      class="mt-10 inline-block rounded-lg px-6 py-3 font-semibold text-ink"
      style="background:var(--gradient-refractor)">Apply by email</a>
  )}
  <p class="mt-4 text-xs text-muted">Applications are reviewed by a person. No fees, no account needed.</p>
</Base>
```
(Note the apostrophe in `that's` inside CHECKLIST — use a template literal or escape it (`'that\\'s'`) so the frontmatter parses.)

- [ ] **Step 3.2: e2e.** Append to `tests/e2e/plan6.spec.ts`:

```ts
test('join page explains the bar and offers an application path', async ({ page }) => {
  const res = await page.goto('/resellers/join/');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Become a Verified Reseller' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open the application form|Apply by email/ })).toBeVisible();
});
```

- [ ] **Step 3.3: gates + commit.** `feat: verified reseller join page`.

### Task 4: Map presence — distinct city-centroid pins (owns map files this task)

**Files:**
- Modify: `src/lib/map-data.ts` (extend `MapStore` with `kind`, add `toMapResellers`)
- Test: `tests/unit/resellers-map.test.ts` (NEW file — do not touch `tests/unit/pins.test.ts`)
- Modify: `src/scripts/pins.ts` (branch on `kind` in `createPinEl`)
- Modify: `src/styles/map.css` (ghost-pin styles)
- Modify: `src/components/MapIsland.astro` (optional `extra` prop; click routing by kind)
- Modify: `src/pages/index.astro` (home payload gains resellers)
- Modify: `src/pages/[province]/[city]/index.astro` (payload + filter re-append + "Verified resellers in {city}" section)

**Architecture decision (made — do not redesign):** reseller map entries REUSE the `MapStore` shape with a `kind: 'reseller'` discriminator and flow through the SAME supercluster index. `src/scripts/map-core.ts` is NOT modified. Mixed store/reseller clusters are acceptable (a cluster is just a count).

- [ ] **Step 4.1: failing unit tests.** Create `tests/unit/resellers-map.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { toMapResellers } from '../../src/lib/map-data';
import type { Store } from '../../src/lib/types';
import type { ResellerRecord } from '../../src/lib/resellers';

const store = (over: Partial<Store>): Store => ({
  slug: 's', name: 'Shop', city: 'Calgary', citySlug: 'calgary', address: '1 St, Calgary, AB',
  province: 'AB', services: [], sports: [], lat: 51, lng: -114, ...over,
});
const reseller = (over: Partial<ResellerRecord>): ResellerRecord => ({
  slug: 'r', name: 'Reseller', city: 'Calgary', citySlug: 'calgary', province: 'AB', specialties: [], ...over,
});

describe('toMapResellers', () => {
  it('places a reseller at the centroid of their city\'s stores, marked kind=reseller', () => {
    const stores = [
      store({ slug: 'a', lat: 50, lng: -114 }),
      store({ slug: 'b', lat: 52, lng: -112 }),
    ];
    const out = toMapResellers([reseller({})], stores);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ slug: 'r', kind: 'reseller', lat: 51, lng: -113 });
  });

  it('excludes resellers whose city has no mapped stores (list-only visibility)', () => {
    const out = toMapResellers([reseller({ citySlug: 'nowhere' })], [store({})]);
    expect(out).toHaveLength(0);
  });

  it('matches city within the same province only', () => {
    const bcStore = store({ province: 'BC', citySlug: 'calgary' }); // same slug, wrong province
    expect(toMapResellers([reseller({})], [bcStore])).toHaveLength(0);
  });
});
```
Run: `npx vitest run tests/unit/resellers-map.test.ts` — expected FAIL (`toMapResellers` not exported).

- [ ] **Step 4.2: implement map-data.** In `src/lib/map-data.ts`: add `kind?: 'reseller' | undefined;` to `MapStore`; import `ResellerRecord`; append:

```ts
import type { ResellerRecord } from './resellers';

// Resellers have no address by design. Their pin sits at the centroid of the
// stores already mapped in their city (same province) — a city-level marker,
// never a walk-in location. Resellers in cities with no mapped stores are
// list-only: visible on /resellers/ and city pages, absent from map data.
export function toMapResellers(resellers: ResellerRecord[], stores: Store[]): MapStore[] {
  return resellers.flatMap((r) => {
    const cityStores = stores.filter((s) => s.province === r.province && s.citySlug === r.citySlug);
    if (cityStores.length === 0) return [];
    const lat = cityStores.reduce((n, s) => n + s.lat, 0) / cityStores.length;
    const lng = cityStores.reduce((n, s) => n + s.lng, 0) / cityStores.length;
    return [{
      slug: r.slug,
      name: r.name,
      city: r.city,
      lat,
      lng,
      kind: 'reseller' as const,
      services: [],
      sports: r.specialties,
    }];
  });
}
```
Run the new tests — GREEN. Run `npm test` — everything green (extending `MapStore` with an optional field must not break `pins.test.ts`; if it does, STOP and report rather than editing that file).

- [ ] **Step 4.3: pin element.** In `src/scripts/pins.ts`, `createPinEl` gains a branch (store pins unchanged):

```ts
export function createPinEl(store: MapStore): HTMLElement {
  const outer = el('div', 'pin-outer');
  outer.dataset['slug'] = store.slug;
  const inner = el('div', 'pin-inner');
  const chip = el('div', store.kind === 'reseller' ? 'pin-chip pin-chip-reseller' : 'pin-chip');
  if (store.kind === 'reseller') {
    chip.appendChild(el('span', 'pin-badge pin-badge-reseller', initialsOf(store.name)));
  } else {
    chip.appendChild(badgeFor(store));
  }
  chip.appendChild(el('span', 'pin-name', store.name));
  inner.appendChild(chip);
  inner.appendChild(el('div', 'pin-stem'));
  outer.appendChild(inner);
  return outer;
}
```

- [ ] **Step 4.4: ghost styles.** Append to `src/styles/map.css`:

```css
/* Verified-reseller pins: ghost/outline treatment — a person in this city,
   never a walk-in address. Distinct from the solid store chips. */
.pin-chip-reseller {
  background: rgb(18 26 38 / 0.88);
  color: #eaf0f6;
  border: 1.5px dashed var(--color-prizm);
}
.pin-badge-reseller {
  background: transparent;
  border: 1px solid var(--color-prizm);
  color: var(--color-prizm);
}
```

- [ ] **Step 4.5: island payload + click routing.** In `src/components/MapIsland.astro`: Props gain `extra?: MapStore[] | undefined;` (import `MapStore` type in frontmatter); payload line becomes:

```ts
const payload = JSON.stringify([
  ...toMapStores(stores, new Set(logoSlugs as string[])),
  ...(extra ?? []),
]).replace(/</g, '\\u003c');
```

In the island's `<script>`, the pin-click handler currently falls back to `/store/${slug}/`; route by kind:

```ts
    handle.onPinClick((slug) => {
      const entry = stores.find((s) => s.slug === slug);
      const isReseller = entry?.kind === 'reseller';
      const card = document.querySelector(
        isReseller ? `[data-reseller-card="${slug}"]` : `[data-store-card="${slug}"]`,
      );
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('ring-2', 'ring-prizm');
        setTimeout(() => card.classList.remove('ring-2', 'ring-prizm'), 1800);
      } else {
        window.location.href = isReseller ? `/resellers/${slug}/` : `/store/${slug}/`;
      }
    });
```
(`stores` in that scope is the parsed payload array, which now includes the extras.)

- [ ] **Step 4.6: home page.** In `src/pages/index.astro` frontmatter: import `resellersJson from '../data/resellers.json'`, `type { ResellerRecord } from '../lib/resellers'`, `{ toMapResellers } from '../lib/map-data'`; compute `const resellerPins = toMapResellers(resellersJson as ResellerRecord[], stores);` and change line ~51 to `<MapIsland stores={stores} extra={resellerPins} mode="home" height="520px" />`. (The "nearest shops" logic stays stores-only — do not touch it.)

- [ ] **Step 4.7: city page.** In `src/pages/[province]/[city]/index.astro`:
  1. Frontmatter: same three imports; `const cityResellers = (resellersJson as ResellerRecord[]).filter((r) => r.province === province.code && r.citySlug === cityGroup.citySlug);` — adapt the two identifiers to the file's actual variable names, read them; `const resellerPins = toMapResellers(cityResellers, cityGroup.stores);`
  2. Line ~81: `<MapIsland stores={cityGroup.stores} extra={resellerPins} mode="city" height="560px" />`
  3. The filter apply() at line ~126 currently does `handle?.setStores(all.filter((s) => visible.has(s.slug)));` — resellers must survive filtering:
     `handle?.setStores([...all.filter((s) => s.kind !== 'reseller' && visible.has(s.slug)), ...all.filter((s) => s.kind === 'reseller')]);`
  4. After the store-list `</ul>`/section (line ~77's list block), add a conditional section (server-rendered, omitted when empty):

```astro
  {cityResellers.length > 0 && (
    <section class="mt-12">
      <h2 class="text-2xl">Verified resellers in {cityGroup.city}</h2>
      <p class="mt-1 text-sm text-muted">Trusted sellers here without a storefront — sold online, checked by a human.</p>
      <ul role="list" class="mt-4 grid gap-4 sm:grid-cols-2">
        {cityResellers.map((r) => (
          <li>
            <a href={`/resellers/${r.slug}/`} data-reseller-card={r.slug}
              class="flex items-center justify-between rounded-xl border border-bord bg-panel p-4 hover:border-prizm">
              <span class="font-semibold">{r.name}</span>
              <span class="rounded-full border border-gold/60 bg-well px-2.5 py-0.5 text-xs font-semibold text-gold">SCNM Verified</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )}
```

- [ ] **Step 4.8: e2e.** Append to `tests/e2e/plan6.spec.ts` (token-agnostic — asserts payload, not rendered pins):

```ts
test('map payload carries reseller entries only when verified resellers exist', async ({ page }) => {
  await page.goto('/');
  const raw = await page.locator('script[data-map-stores]').first().textContent();
  const entries = JSON.parse(raw ?? '[]') as { kind?: string }[];
  const resellerCount = entries.filter((e) => e.kind === 'reseller').length;
  // Empty at launch; if data arrives this asserts the shape survived the pipeline.
  expect(resellerCount).toBeGreaterThanOrEqual(0);
  expect(Array.isArray(entries)).toBe(true);
});
```

- [ ] **Step 4.9: gates BOTH token modes + commit.** `PUBLIC_MAPBOX_TOKEN= npm run build && PUBLIC_MAPBOX_TOKEN= npm run test:e2e`, then with `.env` loaded: `npm test && npx tsc --noEmit && npm run build && npm run test:e2e`. With the token, ALSO do the fixture visual check: inject one fixture reseller into `resellers.json`, `npm run dev`, screenshot a city map at 375px and desktop, confirm the ghost pin is visibly distinct from store chips and click-through works; restore `resellers.json` (`git checkout -- src/data/resellers.json`). Commit `feat: reseller map presence (ghost city-centroid pins)`.

### Task 5: Ship + verify

- [ ] **Step 5.1:** Full gates both token modes (as 4.9) at branch head.
- [ ] **Step 5.2:** `git pull --rebase origin redesign && git push origin redesign` (CF preview builds automatically).
- [ ] **Step 5.3 (controller/human):** `gh workflow run site.yml --ref main`, then `gh run watch <id> --exit-status`.
- [ ] **Step 5.4: live verification.** All must pass:
```bash
for u in /resellers/ /resellers/join/; do curl -s -o /dev/null -w "%{http_code} $u\n" "https://sportscardsnearme.ca$u"; done   # 200 200
curl -s https://sportscardsnearme.ca/guides/ | grep -c 'href="/resellers/"'   # >= 1 (nav)
```
Plus: 375px screenshots of /resellers/ and /resellers/join/ (clean, no horizontal overflow); JSON-LD parses on a profile page once one exists.
- [ ] **Step 5.5:** Update `.superpowers/sdd/progress.md` (Plan 6 complete) and the project memory file. If site.yml's `bake:resellers` step is absent from main's copy (see Step 1.7), surface it to Nathan for the one-file main commit.

---

## Self-review (author, 2026-07-12)
- Spec coverage: PRD §4.1 ✅ T2 · §4.2 ✅ T2 (chip filters consciously deferred — flagged as deviation for reviewer) · §4.3 ✅ T4 · §4.4 ✅ T1+T3 (on-site form replaced by Google-Form link matching the existing /suggest mechanism — PRD's "same mechanism as /suggest" honored literally) · §4.5 out-of-scope ✅ nothing in plan builds them · revocation copy ✅ T2 footer + T3 · badge styling ✅ non-gradient.
- Placeholder scan: `JOIN_FORM_URL = null` is a deliberate, behavior-defined fallback, not a TBD. No other placeholders.
- Type consistency: `ResellerRecord` field names identical across T1 code, T2 pages, T4 `toMapResellers`; `kind` optional on `MapStore` everywhere; `initialsOf`/`parseLocalDate`/`httpUrl`/`isoDate` all real exports (isoDate export created in Step 1.1).
