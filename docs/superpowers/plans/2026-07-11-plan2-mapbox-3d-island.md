# Plan 2: Mapbox 3D Map Island + Interactivity

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mount the Refractor night-map — Mapbox GL JS v3, 3D tilt, chip pins with drop-in animation, clustering, fly-to, list↔map sync, client-side filters, and a mobile map/list toggle — into the slot Plan 1 reserved, with a complete tokenless fallback so the site never depends on the map.

**Architecture:** One framework-less TypeScript island. Pages embed a trimmed store payload as a JSON script tag; a client module reads it, mounts Mapbox (token from `PUBLIC_MAPBOX_TOKEN`), and renders HTML chip markers clustered via supercluster. No token (or JS off) → the map container collapses and the static, fully-rendered list experience from Plan 1 stands alone. Static HTML remains complete without client JS — the island is pure progressive enhancement.

**Tech Stack:** mapbox-gl (v3, Standard style `lightPreset: 'night'`), supercluster + @types/supercluster, happy-dom (DOM unit tests), existing Astro 7 / Vitest / Playwright stack.

**Scope decisions (controller-owned, per spec §5):** city pages get full filters (search + service/sport chips) syncing list AND pins; home gets city fly-to buttons + a geolocate "Find shops near me" button; free-text global search deferred to Plan 4. Logo images arrive with Plan 3's scraper — pins ship as designed initials chips (`.pin-logo` slot ready for an `<img>`). "New this week" pulse deferred (sheet has no date column).

## Global Constraints

- All Plan 1 Global Constraints stand (tokens, TS strictest no `any`, no `console.log`, refractor gradient's four sanctioned uses, never push `main`) with ONE amendment: client-side JS is now permitted as progressive enhancement only — every page's static content must remain complete and navigable with JS disabled.
- Token env var is exactly `PUBLIC_MAPBOX_TOKEN` (Astro exposes `PUBLIC_*` to the client; Mapbox public tokens are designed to be client-visible and URL-restricted).
- Tokenless behavior is a FEATURE with tests: no token → map UI hidden, list untouched, zero console errors.
- **XSS discipline in client code:** every DOM node built from store data uses `document.createElement` + `textContent` — `innerHTML` with data interpolation is forbidden.
- All motion respects `prefers-reduced-motion` (global.css already zeroes animations/transitions — new keyframes inherit that).
- Marker DOM pattern: outer div owned by Mapbox (GL transforms), inner div owned by us (CSS animations) — never animate the outer div.
- Mobile: map/list toggle verified at 375×812 in e2e.

---

### Task 1: Hardening ride-alongs from Plan 1's review roll-up

**Files:**
- Modify: `package.json` (engines), `src/styles/global.css` (gold token), `src/components/StoreCard.astro` (gold class, role="list"), `src/pages/store/[slug]/index.astro` (gold class), `playwright.config.ts` (retries, forbidOnly), `tests/e2e/smoke.spec.ts` (sitemap assertion), `.gitignore` (.env)

**Interfaces:**
- Produces: `--color-gold: #FFC46B` design token and Tailwind utility `text-gold`; e2e suite gains a sitemap test (5 tests × 2 projects = 10).

- [ ] **Step 1: Apply the batch**

`package.json` — add after `"private": true,`:

```json
  "engines": { "node": ">=22.12.0" },
```

`src/styles/global.css` — add inside `@theme` after the prizm line:

```css
  --color-gold: #FFC46B;
```

`src/components/StoreCard.astro` — replace `style="color:#FFC46B"` with `class:list` gone: change the rating `<p class="mt-1 text-sm" style="color:#FFC46B" data-testid="rating">` to `<p class="mt-1 text-sm text-gold" data-testid="rating">`; add `role="list"` to the tags `<ul class="mt-3 flex flex-wrap gap-1.5">` → `<ul role="list" class="mt-3 flex flex-wrap gap-1.5">`.

`src/pages/store/[slug]/index.astro` — same two changes: rating `<p class="mt-4" style="color:#FFC46B" data-testid="rating">` → `<p class="mt-4 text-gold" data-testid="rating">`; the services/sports `<ul class="mt-8 flex max-w-2xl flex-wrap gap-2">` → `<ul role="list" class="mt-8 flex max-w-2xl flex-wrap gap-2">`.

`playwright.config.ts` — inside `defineConfig({...})` add after `testDir`:

```ts
  retries: process.env['CI'] ? 1 : 0,
  forbidOnly: !!process.env['CI'],
```

`tests/e2e/smoke.spec.ts` — append:

```ts
test('sitemap index exists and references a sitemap', async ({ request }) => {
  const res = await request.get('/sitemap-index.xml');
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('sitemap-0.xml');
});
```

`.gitignore` — add a line: `.env*`

- [ ] **Step 2: Verify**

Run: `npm run build && npm run test:e2e && npm test && npx tsc --noEmit -p tsconfig.json`
Expected: build 92 pages; e2e 10 passed (5×2); unit 24/24; tsc clean. Also `grep -c 'text-gold' dist/alberta/calgary/index.html` ≥ 1.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: review roll-up hardening (engines, gold token, list roles, e2e retries + sitemap test)"
```

---

### Task 2: Map payload module (TDD)

**Files:**
- Create: `src/lib/map-data.ts`
- Test: `tests/unit/map-data.test.ts`

**Interfaces:**
- Produces:
  - `interface MapStore { slug: string; name: string; city: string; lat: number; lng: number; rating?: number | undefined; services: string[]; sports: string[] }`
  - `toMapStores(stores: Store[]): MapStore[]`
  - `initialsOf(name: string): string` — 1-3 chars for the pin chip (digits kept: "203 Collectibles" → "203"; "Wayne's Cards" → "WC"; single word → first 2 letters uppercased)

- [ ] **Step 1: Write failing tests**

Create `tests/unit/map-data.test.ts`:

```ts
import { it, expect } from 'vitest';
import { toMapStores, initialsOf } from '../../src/lib/map-data';
import type { Store } from '../../src/lib/types';

const store: Store = {
  slug: 's', name: '203 Collectibles LTD.', city: 'Edmonton', citySlug: 'edmonton',
  address: 'x', province: 'AB', rating: 4.8, reviewCount: 33, hours: 'h', phone: 'p',
  website: 'https://x.com', social: 'https://y.com', services: ['Buys'], sports: ['Hockey'],
  lat: 53.5, lng: -113.5,
};

it('toMapStores trims to the client payload shape', () => {
  const m = toMapStores([store])[0];
  expect(m).toEqual({
    slug: 's', name: '203 Collectibles LTD.', city: 'Edmonton',
    lat: 53.5, lng: -113.5, rating: 4.8, services: ['Buys'], sports: ['Hockey'],
  });
  expect(Object.keys(m ?? {})).not.toContain('address');
});

it('initialsOf keeps leading digits, else takes word initials', () => {
  expect(initialsOf('203 Collectibles LTD.')).toBe('203');
  expect(initialsOf("Wayne's Cards")).toBe('WC');
  expect(initialsOf('Breakaway')).toBe('BR');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/map-data.test.ts` — FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/lib/map-data.ts`:

```ts
import type { Store } from './types';

export interface MapStore {
  slug: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  rating?: number | undefined;
  services: string[];
  sports: string[];
}

export function toMapStores(stores: Store[]): MapStore[] {
  return stores.map((s) => ({
    slug: s.slug,
    name: s.name,
    city: s.city,
    lat: s.lat,
    lng: s.lng,
    ...(s.rating !== undefined && { rating: s.rating }),
    services: s.services,
    sports: s.sports,
  }));
}

export function initialsOf(name: string): string {
  const digits = name.match(/^\d{1,3}/);
  if (digits) return digits[0];
  const words = name.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((w) => (w[0] ?? '').toUpperCase())
      .join('');
  }
  return name.slice(0, 2).toUpperCase();
}
```

- [ ] **Step 4: Verify pass, commit**

Run: `npm test` — 27/27 (24 + 3... the two new test blocks count as 2 files/3 its; report actuals). Then:

```bash
git add src/lib/map-data.ts tests/unit/map-data.test.ts
git commit -m "feat: trimmed map payload + pin initials (tested)"
```

Note: `toMapStores` uses the conditional-spread pattern for `rating` — same `exactOptionalPropertyTypes` discipline as Plan 1.

---

### Task 3: Dependencies, map styles, pin/cluster DOM builders (TDD via happy-dom)

**Files:**
- Modify: `package.json` (+ mapbox-gl, supercluster, @types/supercluster, happy-dom)
- Create: `src/styles/map.css`, `src/scripts/pins.ts`
- Test: `tests/unit/pins.test.ts`

**Interfaces:**
- Produces:
  - `createPinEl(store: MapStore): HTMLElement` — outer div `.pin-outer` (Mapbox-owned) containing `.pin-inner` (animation-owned) containing chip markup; carries `data-slug={store.slug}`
  - `createClusterEl(count: number): HTMLElement` — `.cluster-outer` > `.cluster-inner`, textContent = count
  - CSS classes: `.pin-inner` (drop-in animation), `.pin-chip`, `.pin-badge`, `.pin-stem`, `.cluster-inner`, `.pin-active` (hover-sync highlight), `.map-shell`, `.map-fallback`

- [ ] **Step 1: Install**

```bash
npm install mapbox-gl supercluster
npm install -D @types/supercluster happy-dom
```

(mapbox-gl v3 ships its own TypeScript types.)

- [ ] **Step 2: Write failing tests**

Create `tests/unit/pins.test.ts`:

```ts
// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { createPinEl, createClusterEl } from '../../src/scripts/pins';
import type { MapStore } from '../../src/lib/map-data';

const store: MapStore = {
  slug: '203-collectibles-ltd-edmonton', name: '203 Collectibles LTD.', city: 'Edmonton',
  lat: 53.5, lng: -113.5, rating: 4.8, services: [], sports: [],
};

it('createPinEl builds outer/inner structure with data-slug and escaped text', () => {
  const el = createPinEl({ ...store, name: '<img src=x onerror=alert(1)>' });
  expect(el.className).toBe('pin-outer');
  expect(el.dataset['slug']).toBe(store.slug);
  expect(el.querySelector('.pin-inner')).not.toBeNull();
  expect(el.innerHTML).not.toContain('<img'); // textContent-only construction
  expect(el.querySelector('.pin-chip')?.textContent).toContain('<img src=x onerror=alert(1)>');
});

it('createPinEl shows initials badge', () => {
  const el = createPinEl(store);
  expect(el.querySelector('.pin-badge')?.textContent).toBe('203');
});

it('createClusterEl shows the count', () => {
  const el = createClusterEl(14);
  expect(el.querySelector('.cluster-inner')?.textContent).toBe('14');
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/unit/pins.test.ts` — FAIL (module not found).

- [ ] **Step 4: Implement pins.ts**

Create `src/scripts/pins.ts`:

```ts
import type { MapStore } from '../lib/map-data';
import { initialsOf } from '../lib/map-data';

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createPinEl(store: MapStore): HTMLElement {
  const outer = el('div', 'pin-outer');
  outer.dataset['slug'] = store.slug;
  const inner = el('div', 'pin-inner');
  const chip = el('div', 'pin-chip');
  chip.appendChild(el('span', 'pin-badge', initialsOf(store.name)));
  chip.appendChild(el('span', 'pin-name', store.name));
  inner.appendChild(chip);
  inner.appendChild(el('div', 'pin-stem'));
  outer.appendChild(inner);
  return outer;
}

export function createClusterEl(count: number): HTMLElement {
  const outer = el('div', 'cluster-outer');
  outer.appendChild(el('div', 'cluster-inner', String(count)));
  return outer;
}
```

- [ ] **Step 5: Write map.css**

Create `src/styles/map.css`:

```css
/* Map island — chip pins, clusters, shell. Colors from the Refractor tokens. */
.map-shell {
  position: relative;
  height: 480px;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid var(--color-bord);
  background: var(--color-panel);
}
.map-shell .mapboxgl-map { position: absolute; inset: 0; }
.map-fallback { display: none; }
.map-shell[data-map-state='off'] { height: auto; border: 0; background: none; }
.map-shell[data-map-state='off'] .map-fallback { display: block; }

.pin-outer { cursor: pointer; }
.pin-inner {
  display: flex; flex-direction: column; align-items: center;
  animation: pin-drop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) backwards;
  filter: drop-shadow(0 10px 10px rgb(0 0 0 / 0.55));
}
.pin-chip {
  display: flex; align-items: center; gap: 6px;
  background: #f5f8fb; color: #101722;
  border: 2px solid #fff; border-radius: 999px;
  padding: 3px 10px 3px 4px;
  font: 600 12px/1.4 var(--font-body);
  white-space: nowrap;
  transition: transform 0.15s ease-out;
}
.pin-badge {
  display: grid; place-items: center;
  width: 20px; height: 20px; border-radius: 50%;
  background: #122b3f; color: #5ad7ff;
  font: 600 10px/1 var(--font-display);
}
.pin-stem { width: 2px; height: 10px; background: #f5f8fb; opacity: 0.85; }
.pin-outer.pin-active .pin-chip,
.pin-outer:hover .pin-chip { transform: scale(1.08); border-color: var(--color-prizm); }

.cluster-outer { cursor: pointer; }
.cluster-inner {
  display: grid; place-items: center;
  width: 40px; height: 40px; border-radius: 50%;
  background: #f5f8fb; color: #101722;
  border: 2px solid #fff;
  box-shadow: 0 0 0 6px rgb(245 248 251 / 0.18), 0 10px 14px rgb(0 0 0 / 0.5);
  font: 600 15px/1 var(--font-display);
  animation: pin-drop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) backwards;
}

@keyframes pin-drop {
  from { opacity: 0; transform: translateY(-28px); }
  to { opacity: 1; transform: translateY(0); }
}

.mapboxgl-popup-content {
  background: var(--color-well);
  color: var(--color-paper);
  border: 1px solid var(--color-bord);
  border-radius: 10px;
  padding: 10px 14px;
  font-family: var(--font-body);
  box-shadow: 0 18px 36px rgb(0 0 0 / 0.7);
}
.mapboxgl-popup-tip { border-top-color: var(--color-bord); }
.map-popup-name { font: 600 15px/1.2 var(--font-display); text-transform: uppercase; letter-spacing: 0.02em; }
.map-popup-meta { color: var(--color-muted); font-size: 12px; margin-top: 2px; }
.map-popup-link { color: var(--color-prizm); font-size: 12.5px; font-weight: 600; }
```

(The global reduced-motion rule in global.css already disables all animations/transitions.)

- [ ] **Step 6: Verify pass, commit**

Run: `npx vitest run tests/unit/pins.test.ts` (PASS), `npm test` (all green), `npx tsc --noEmit -p tsconfig.json` (clean).

```bash
git add package.json package-lock.json src/styles/map.css src/scripts/pins.ts tests/unit/pins.test.ts
git commit -m "feat: pin/cluster DOM builders (XSS-safe, tested) + map styles"
```

---

### Task 4: Map core — mount, night 3D, markers, clustering, fly-to

**Files:**
- Create: `src/scripts/map-core.ts`

**Interfaces:**
- Consumes: `MapStore` (Task 2), `createPinEl`/`createClusterEl` (Task 3).
- Produces (consumed by Tasks 5-7):
  - `interface MapHandle { map: import('mapbox-gl').Map; setStores(stores: MapStore[]): void; flyTo(lng: number, lat: number, zoom?: number): void; onPinClick(cb: (slug: string) => void): void; highlight(slug: string | null): void }`
  - `mountMap(shell: HTMLElement, stores: MapStore[], opts?: { interactiveCluster?: boolean; pitch?: number; zoom?: number; center?: [number, number] }): MapHandle | null` — returns null (and sets `shell.dataset.mapState = 'off'`) when no token; sets `'on'` when mounted.
  - Token source: `import.meta.env.PUBLIC_MAPBOX_TOKEN` (typed via `src/env.d.ts` addition).

- [ ] **Step 1: Type the env var**

Append to `src/env.d.ts`:

```ts
interface ImportMetaEnv {
  readonly PUBLIC_MAPBOX_TOKEN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 2: Implement map-core.ts**

Create `src/scripts/map-core.ts`:

```ts
import mapboxgl from 'mapbox-gl';
import Supercluster from 'supercluster';
import type { MapStore } from '../lib/map-data';
import { createPinEl, createClusterEl } from './pins';

export interface MapHandle {
  map: mapboxgl.Map;
  setStores(stores: MapStore[]): void;
  flyTo(lng: number, lat: number, zoom?: number): void;
  onPinClick(cb: (slug: string) => void): void;
  highlight(slug: string | null): void;
}

interface MountOpts {
  pitch?: number;
  zoom?: number;
  center?: [number, number];
}

const ALBERTA_CENTER: [number, number] = [-113.8, 52.3];

function centerOf(stores: MapStore[]): [number, number] {
  if (stores.length === 0) return ALBERTA_CENTER;
  const lng = stores.reduce((n, s) => n + s.lng, 0) / stores.length;
  const lat = stores.reduce((n, s) => n + s.lat, 0) / stores.length;
  return [lng, lat];
}

export function mountMap(shell: HTMLElement, stores: MapStore[], opts: MountOpts = {}): MapHandle | null {
  const token = import.meta.env.PUBLIC_MAPBOX_TOKEN;
  if (token === undefined || token === '') {
    shell.dataset['mapState'] = 'off';
    return null;
  }
  shell.dataset['mapState'] = 'on';

  const container = document.createElement('div');
  shell.prepend(container);

  const map = new mapboxgl.Map({
    accessToken: token,
    container,
    style: 'mapbox://styles/mapbox/standard',
    center: opts.center ?? centerOf(stores),
    zoom: opts.zoom ?? 10.5,
    pitch: opts.pitch ?? 55,
    bearing: -12,
    config: { basemap: { lightPreset: 'night' } },
  });
  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

  let clickCb: ((slug: string) => void) | null = null;
  let markers: mapboxgl.Marker[] = [];
  let index: Supercluster<{ store: MapStore }> | null = null;
  let current: MapStore[] = stores;

  function rebuildIndex(list: MapStore[]): void {
    index = new Supercluster<{ store: MapStore }>({ radius: 52, maxZoom: 15 });
    index.load(
      list.map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: { store: s },
      })),
    );
  }

  function render(): void {
    if (!index) return;
    markers.forEach((m) => m.remove());
    markers = [];
    const b = map.getBounds();
    if (!b) return;
    const clusters = index.getClusters(
      [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      Math.floor(map.getZoom()),
    );
    for (const c of clusters) {
      const [lng, lat] = c.geometry.coordinates as [number, number];
      if (c.properties && 'cluster' in c.properties && c.properties.cluster === true) {
        const count = (c.properties as { point_count: number }).point_count;
        const elc = createClusterEl(count);
        const clusterId = (c.properties as { cluster_id: number }).cluster_id;
        elc.addEventListener('click', () => {
          const z = index?.getClusterExpansionZoom(clusterId) ?? map.getZoom() + 2;
          map.flyTo({ center: [lng, lat], zoom: z, duration: 900 });
        });
        markers.push(new mapboxgl.Marker({ element: elc }).setLngLat([lng, lat]).addTo(map));
      } else {
        const store = (c.properties as { store: MapStore }).store;
        const elp = createPinEl(store);
        elp.addEventListener('click', () => clickCb?.(store.slug));
        markers.push(
          new mapboxgl.Marker({ element: elp, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map),
        );
      }
    }
  }

  rebuildIndex(current);
  map.on('load', render);
  map.on('moveend', render);

  return {
    map,
    setStores(list: MapStore[]): void {
      current = list;
      rebuildIndex(current);
      render();
    },
    flyTo(lng: number, lat: number, zoom = 13): void {
      map.flyTo({ center: [lng, lat], zoom, pitch: opts.pitch ?? 55, duration: 1600, essential: false });
    },
    onPinClick(cb: (slug: string) => void): void {
      clickCb = cb;
    },
    highlight(slug: string | null): void {
      for (const m of markers) {
        const node = m.getElement();
        node.classList.toggle('pin-active', slug !== null && node.dataset['slug'] === slug);
      }
    },
  };
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean. (No runtime test yet — the island mounts in Task 5 and e2e covers the fallback path in Task 7; the token-on visual path is verified manually once Nathan's token exists.)

- [ ] **Step 4: Commit**

```bash
git add src/env.d.ts src/scripts/map-core.ts
git commit -m "feat: map core - night 3D mount, clustered chip markers, fly-to, tokenless off-state"
```

---

### Task 5: MapIsland component + home integration

**Files:**
- Create: `src/components/MapIsland.astro`
- Modify: `src/pages/index.astro` (replace the placeholder inside `#map-slot`)

**Interfaces:**
- Consumes: `toMapStores` (Task 2), `mountMap` (Task 4), map.css (Task 3).
- Produces: `MapIsland.astro` with `interface Props { stores: Store[]; mode: 'home' | 'city' | 'store'; height?: string }`. It renders: `.map-shell` (with `.map-fallback` inside), a `<script type="application/json" data-map-stores>` payload, and the client module. Pages using it must keep their static content outside the shell.
- The home page keeps `id="map-slot"` on the section wrapping the island (Plan 2 fulfills the Plan 1 contract rather than renaming it).

- [ ] **Step 1: Write MapIsland.astro**

```astro
---
import type { Store } from '../lib/types';
import { toMapStores } from '../lib/map-data';
import '../styles/map.css';

interface Props {
  stores: Store[];
  mode: 'home' | 'city' | 'store';
  height?: string;
}
const { stores, mode, height } = Astro.props;
const payload = JSON.stringify(toMapStores(stores)).replace(/</g, '\\u003c');
---
<div class="map-shell" data-map-mode={mode} style={height !== undefined ? `height:${height}` : undefined}>
  <script type="application/json" data-map-stores set:html={payload} />
  <p class="map-fallback p-6 text-sm text-muted">
    The interactive map needs JavaScript (and a map key) — every store below is fully browsable without it.
  </p>
</div>
<script>
  import { mountMap } from '../scripts/map-core';
  import type { MapStore } from '../lib/map-data';

  for (const shell of document.querySelectorAll<HTMLElement>('.map-shell')) {
    const raw = shell.querySelector('script[data-map-stores]')?.textContent ?? '[]';
    const stores = JSON.parse(raw) as MapStore[];
    const mode = shell.dataset['mapMode'];
    const handle = mountMap(shell, stores, mode === 'store' ? { zoom: 14, pitch: 60 } : {});
    if (!handle) continue;
    handle.onPinClick((slug) => {
      const card = document.querySelector(`[data-store-card="${slug}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('ring-2', 'ring-prizm');
        setTimeout(() => card.classList.remove('ring-2', 'ring-prizm'), 1800);
      } else {
        window.location.href = `/store/${slug}/`;
      }
    });
    shell.dispatchEvent(new CustomEvent('map:ready', { detail: handle, bubbles: true }));
  }
</script>
```

Note: the JSON payload uses the project's sanctioned `set:html` pattern — `JSON.stringify(...).replace(/</g, '\\u003c')` — same escape discipline as the store pages' structured data.

- [ ] **Step 2: Integrate on home**

In `src/pages/index.astro`: add imports `import MapIsland from '../components/MapIsland.astro';` and `import type { Store } from '../lib/types';` is already there. Replace the placeholder section:

```astro
  <section id="map-slot" class="mt-12 rounded-xl border border-bord bg-panel p-6 text-sm text-muted">
    Interactive map coming right here — browse by city below.
  </section>
```

with:

```astro
  <section id="map-slot" class="mt-12">
    <MapIsland stores={stores} mode="home" height="520px" />
    <div class="mt-4 flex flex-wrap items-center gap-2" data-city-flyto>
      <span class="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Fly to:</span>
      {featuredCities.map((c) => (
        <button
          type="button"
          class="rounded-full border border-bord px-3 py-1 text-sm text-muted hover:border-prizm hover:text-paper"
          data-fly={`${c.stores[0]?.lng ?? 0},${c.stores[0]?.lat ?? 0}`}
        >{c.city}</button>
      ))}
      <button type="button" class="rounded-full border border-bord px-3 py-1 text-sm text-prizm hover:border-prizm" data-geolocate>
        Find shops near me
      </button>
    </div>
  </section>
  <script>
    import type { MapHandle } from '../scripts/map-core';
    const slot = document.getElementById('map-slot');
    slot?.addEventListener('map:ready', (e) => {
      const handle = (e as CustomEvent<MapHandle>).detail;
      for (const btn of slot.querySelectorAll<HTMLButtonElement>('[data-fly]')) {
        btn.addEventListener('click', () => {
          const [lng, lat] = (btn.dataset['fly'] ?? '0,0').split(',').map(Number);
          if (lng !== undefined && lat !== undefined) handle.flyTo(lng, lat, 12.5);
        });
      }
      slot.querySelector('[data-geolocate]')?.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => handle.flyTo(pos.coords.longitude, pos.coords.latitude, 11.5),
          () => window.alert('Location unavailable — pick a city instead.'),
        );
      });
    });
  </script>
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: success; `grep -c 'map-slot' dist/index.html` = 1; `grep -c 'data-map-stores' dist/index.html` = 1; a JS bundle now exists in dist/_astro (this is the sanctioned island). Run `npm test` + `npx tsc --noEmit` (clean).

- [ ] **Step 4: Commit**

```bash
git add src/components/MapIsland.astro src/pages/index.astro
git commit -m "feat: map island on home with city fly-to and geolocate"
```

---

### Task 6: City pages — map + filters + list↔map sync + mobile toggle

**Files:**
- Modify: `src/pages/[province]/[city]/index.astro`, `src/components/StoreCard.astro` (add `data-store-card` + hover events via data attribute)

**Interfaces:**
- Consumes: MapIsland (Task 5), MapHandle (Task 4).
- Produces: StoreCard's root `<li>` gains `data-store-card={store.slug}`. City page gains: filter bar (search input + service/sport chips derived from that city's data), a `data-results-count` element, and a mobile-only map/list toggle. Filtering hides list cards (`hidden` class) AND calls `handle.setStores(filtered)`.

- [ ] **Step 1: StoreCard hook**

In `src/components/StoreCard.astro`, change the root `<li class="store-card ...">`-equivalent line `<li class="rounded-xl border border-bord bg-panel p-5 transition-transform duration-200 hover:-translate-y-0.5">` to:

```astro
<li data-store-card={store.slug} class="rounded-xl border border-bord bg-panel p-5 transition-transform duration-200 hover:-translate-y-0.5">
```

- [ ] **Step 2: City page — add island, filter bar, toggle, sync script**

In `src/pages/[province]/[city]/index.astro`, add imports:

```astro
import MapIsland from '../../../components/MapIsland.astro';
```

Compute filter vocab in frontmatter after `cityGroup`:

```astro
const services = [...new Set(cityGroup.stores.flatMap((s) => s.services))].sort();
const sports = [...new Set(cityGroup.stores.flatMap((s) => s.sports))].sort();
```

Replace the list section (`<ul class="mt-10 space-y-4">…</ul>`) with:

```astro
  <div class="mt-8 flex flex-col gap-3" data-filterbar>
    <input
      type="search"
      placeholder={`Search ${cityGroup.city} shops…`}
      class="w-full max-w-md rounded-lg border border-bord bg-well px-4 py-2.5 text-sm text-paper placeholder:text-faint"
      data-filter-search
    />
    {(services.length > 0 || sports.length > 0) && (
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filter stores">
        {[...services, ...sports].map((t) => (
          <button
            type="button"
            class="rounded-full border border-bord px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted hover:border-prizm aria-pressed:border-prizm aria-pressed:text-paper"
            data-filter-tag={t}
            aria-pressed="false"
          >{t}</button>
        ))}
      </div>
    )}
    <p class="text-sm text-muted"><span data-results-count>{cityGroup.stores.length}</span> shown</p>
  </div>

  <div class="mt-4 flex gap-2 md:hidden">
    <button type="button" class="flex-1 rounded-lg border border-prizm px-4 py-2 text-sm font-semibold" data-view="list" aria-pressed="true">List</button>
    <button type="button" class="flex-1 rounded-lg border border-bord px-4 py-2 text-sm font-semibold text-muted" data-view="map" aria-pressed="false">Map</button>
  </div>

  <div class="mt-4 grid gap-6 md:grid-cols-[1fr_1fr]" data-city-layout>
    <ul role="list" class="space-y-4" data-store-list>
      {cityGroup.stores.map((store) => <StoreCard store={store} />)}
    </ul>
    <div data-city-map class="md:sticky md:top-6 md:self-start">
      <MapIsland stores={cityGroup.stores} mode="city" height="560px" />
    </div>
  </div>

  <script>
    import type { MapHandle } from '../../../scripts/map-core';
    import type { MapStore } from '../../../lib/map-data';

    const layout = document.querySelector<HTMLElement>('[data-city-layout]');
    const list = document.querySelector<HTMLElement>('[data-store-list]');
    const search = document.querySelector<HTMLInputElement>('[data-filter-search]');
    const tags = [...document.querySelectorAll<HTMLButtonElement>('[data-filter-tag]')];
    const count = document.querySelector<HTMLElement>('[data-results-count]');
    let handle: MapHandle | null = null;
    let all: MapStore[] = [];

    document.querySelector('[data-city-map] .map-shell')?.addEventListener('map:ready', (e) => {
      handle = (e as CustomEvent<MapHandle>).detail;
      const raw = document.querySelector('script[data-map-stores]')?.textContent ?? '[]';
      all = JSON.parse(raw) as MapStore[];
      wireHover();
    });
    // JSON payload is also needed when the map is off (list filtering still works):
    if (all.length === 0) {
      const raw = document.querySelector('script[data-map-stores]')?.textContent ?? '[]';
      all = JSON.parse(raw) as MapStore[];
    }

    function activeTags(): string[] {
      return tags.filter((t) => t.getAttribute('aria-pressed') === 'true').map((t) => t.dataset['filterTag'] ?? '');
    }

    function apply(): void {
      const q = (search?.value ?? '').toLowerCase();
      const need = activeTags();
      const visible = new Set<string>();
      for (const s of all) {
        const hay = `${s.name} ${s.city}`.toLowerCase();
        const tagPool = [...s.services, ...s.sports];
        const ok = hay.includes(q) && need.every((n) => tagPool.includes(n));
        if (ok) visible.add(s.slug);
      }
      for (const card of list?.querySelectorAll<HTMLElement>('[data-store-card]') ?? []) {
        card.classList.toggle('hidden', !visible.has(card.dataset['storeCard'] ?? ''));
      }
      if (count) count.textContent = String(visible.size);
      handle?.setStores(all.filter((s) => visible.has(s.slug)));
    }

    search?.addEventListener('input', apply);
    for (const t of tags) {
      t.addEventListener('click', () => {
        t.setAttribute('aria-pressed', t.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        apply();
      });
    }

    function wireHover(): void {
      for (const card of list?.querySelectorAll<HTMLElement>('[data-store-card]') ?? []) {
        card.addEventListener('mouseenter', () => handle?.highlight(card.dataset['storeCard'] ?? null));
        card.addEventListener('mouseleave', () => handle?.highlight(null));
      }
    }

    for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
      btn.addEventListener('click', () => {
        const view = btn.dataset['view'];
        for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          b.classList.toggle('border-prizm', b === btn);
          b.classList.toggle('text-muted', b !== btn);
        }
        layout?.querySelector('[data-store-list]')?.classList.toggle('max-md:hidden', view === 'map');
        layout?.querySelector('[data-city-map]')?.classList.toggle('max-md:hidden', view === 'list');
      });
    }
    // Initial mobile state: list visible, map hidden below md
    document.querySelector('[data-city-map]')?.classList.add('max-md:hidden');
  </script>
```

- [ ] **Step 3: Verify**

Run: `npm run build && npm test && npx tsc --noEmit -p tsconfig.json`
Expected: all green; `grep -c 'data-filter-search' dist/alberta/calgary/index.html` = 1; `grep -c 'data-store-card' dist/alberta/calgary/index.html` = 8.

- [ ] **Step 4: Commit**

```bash
git add src/components/StoreCard.astro 'src/pages/[province]/[city]/index.astro'
git commit -m "feat: city pages - map, filters, list-map sync, mobile toggle"
```

---

### Task 7: Store mini-map + e2e coverage + Nathan handoff docs

**Files:**
- Modify: `src/pages/store/[slug]/index.astro` (mini-map), `tests/e2e/smoke.spec.ts` (island/fallback/filter/toggle tests), `README.md` (env var setup)

**Interfaces:**
- Consumes: everything above. E2E runs TOKENLESS in CI — tests assert the off-state contract and the filter/toggle behavior (which work without the map).

- [ ] **Step 1: Store page mini-map**

In `src/pages/store/[slug]/index.astro` frontmatter add `import MapIsland from '../../../components/MapIsland.astro';`, and after the `<dl>` block insert:

```astro
  <div class="mt-8 max-w-2xl">
    <MapIsland stores={[store]} mode="store" height="300px" />
  </div>
```

- [ ] **Step 2: E2E additions**

Append to `tests/e2e/smoke.spec.ts`:

```ts
test('map island degrades cleanly without a token', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  const shell = page.locator('#map-slot .map-shell');
  await expect(shell).toHaveAttribute('data-map-state', 'off');
  await expect(shell.locator('.map-fallback')).toBeVisible();
  expect(errors).toEqual([]);
});

test('city filters narrow the list', async ({ page }) => {
  await page.goto(`/alberta/${first.citySlug}/`);
  const count = page.locator('[data-results-count]');
  const before = Number(await count.textContent());
  await page.locator('[data-filter-search]').fill('zzzz-no-store-matches-this');
  await expect(count).toHaveText('0');
  await page.locator('[data-filter-search]').fill('');
  await expect(count).toHaveText(String(before));
});

test('mobile map/list toggle switches panels', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 1280) > 500, 'mobile-only behavior');
  await page.goto(`/alberta/${first.citySlug}/`);
  await expect(page.locator('[data-store-list]')).toBeVisible();
  await page.locator('button[data-view="map"]').click();
  await expect(page.locator('[data-store-list]')).toBeHidden();
  await expect(page.locator('[data-city-map]')).toBeVisible();
});
```

NOTE: if the token-off assertion is flaky because `mountMap` runs after load, use `await expect(shell).toHaveAttribute('data-map-state', 'off', { timeout: 5000 })` — the attribute is set synchronously in the island script, so the default should suffice.

- [ ] **Step 3: README env section**

Append to `README.md`:

```markdown
## Map setup

The interactive map needs a Mapbox public token (free tier: 50k loads/month).
Create one at account.mapbox.com → Tokens (URL-restrict it to sportscardsnearme.ca
and localhost), then:

- Local: put `PUBLIC_MAPBOX_TOKEN=pk.…` in `.env`
- CI/Cloudflare: add `PUBLIC_MAPBOX_TOKEN` as a repo Actions secret and pass it as an
  env var on the build step in `.github/workflows/site.yml`

No token? The site works fully — the map simply stays off.
```

- [ ] **Step 4: Full verify**

Run: `npm run bake && npm test && npm run build && npm run test:e2e && npx tsc --noEmit -p tsconfig.json`
Expected: bake unchanged (69); unit green; build ~92 pages; e2e now 8 tests × mobile + 7 × desktop (the mobile-only toggle test skips on desktop) — report actual counts; tsc clean.

- [ ] **Step 5: Commit and push branch**

```bash
git add -A
git commit -m "feat: store mini-map, map e2e coverage, token setup docs"
git push origin redesign
```

- [ ] **Step 6: Queue Nathan's token step**

Append to `~/jarvis-memory/_ops/WAITING-ON-NATHAN.md`:

```
- [ ] 2026-07-11 | sportscardsnearme | 3D map is built but dark until a map key exists | create free Mapbox token at account.mapbox.com, URL-restrict it, put PUBLIC_MAPBOX_TOKEN in repo Actions secrets + local .env (README "Map setup")
```

---

## Self-Review (done at authoring time)

- **Spec coverage (Plan 2's slice of §5):** Mapbox v3 night/3D ✓ (Task 4 config), chip pins + drop animation ✓ (Task 3), clustering ✓ (Task 4), fly-to ✓ (Tasks 4-5), list↔map sync ✓ (Task 6), filters ✓ (Task 6), mobile toggle @375px ✓ (Tasks 6-7), resilience/fallback ✓ (Tasks 4/5/7), geolocate ✓ (Task 5). Deferred with reasons: logo images (Plan 3 scraper), free-text global search (Plan 4), "new this week" pulse (no date data).
- **Placeholder scan:** clean — all code complete.
- **Type consistency:** `MapStore` flows Task 2 → 3 → 4 → 5/6; `MapHandle` Task 4 → 5/6; `data-store-card` Task 6 ↔ MapIsland's pin-click handler (Task 5); `map:ready` CustomEvent detail typed as MapHandle in both emit and listen sites; env typing in Task 4 Step 1.
- **Constraint check:** the one new `set:html` (JSON payload) uses the amended sanctioned escape pattern; all DOM built from data in client code uses textContent (Task 3 test asserts it).
