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

it('createPinEl falls back to ? for unbadgeable names', () => {
  const elp = createPinEl({ ...store, name: '★★★' });
  expect(elp.querySelector('.pin-badge')?.textContent).toBe('?');
});

it('createClusterEl shows the count', () => {
  const el = createClusterEl(14);
  expect(el.querySelector('.cluster-inner')?.textContent).toBe('14');
});

it('createPinEl uses a logo image when the store has one', () => {
  const elp = createPinEl({ ...store, logo: true });
  const img = elp.querySelector<HTMLImageElement>('img.pin-badge-img');
  expect(img).not.toBeNull();
  expect(img?.getAttribute('src')).toBe(`/logos/${store.slug}.webp`);
  expect(elp.querySelector('span.pin-badge')).toBeNull();
});

it('createPinEl replaces a failed logo image with the initials badge', () => {
  const elp = createPinEl({ ...store, logo: true });
  const img = elp.querySelector<HTMLImageElement>('img.pin-badge-img');

  img?.dispatchEvent(new Event('error'));

  expect(elp.querySelector('img.pin-badge-img')).toBeNull();
  expect(elp.querySelector('span.pin-badge')?.textContent).toBe('203');
});
