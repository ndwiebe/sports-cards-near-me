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
    shell.style.removeProperty('height');
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

  if (opts.center === undefined && opts.zoom === undefined && stores.length >= 2) {
    const bounds = new mapboxgl.LngLatBounds();
    for (const s of stores) bounds.extend([s.lng, s.lat]);
    map.fitBounds(bounds, { padding: 64, maxZoom: 13, animate: false, pitch: opts.pitch ?? 55, bearing: -12 });
  }

  let clickCb: ((slug: string) => void) | null = null;
  let markers: mapboxgl.Marker[] = [];
  let index: Supercluster<{ store: MapStore }> | null = null;
  let current: MapStore[] = stores;
  let highlighted: string | null = null;
  let firstRender = true;

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
        elp.classList.toggle('pin-active', highlighted !== null && store.slug === highlighted);
        elp.addEventListener('click', () => clickCb?.(store.slug));
        markers.push(
          new mapboxgl.Marker({ element: elp, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map),
        );
      }
    }
    if (firstRender) {
      firstRender = false;
      window.setTimeout(() => {
        shell.dataset['mapSettled'] = '';
      }, 600);
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
      highlighted = slug;
      for (const m of markers) {
        const node = m.getElement();
        node.classList.toggle('pin-active', slug !== null && node.dataset['slug'] === slug);
      }
    },
  };
}
