import { it, expect } from 'vitest';
import { toMapStores, initialsOf, distanceKm } from '../../src/lib/map-data';
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

it('initialsOf falls back to ? when nothing badgeable', () => {
  expect(initialsOf('★★★')).toBe('?');
  expect(initialsOf('')).toBe('?');
});

it('toMapStores sets logo only for slugs in the logo set', () => {
  const withLogo = toMapStores([store], new Set(['s']))[0];
  const without = toMapStores([store], new Set(['other']))[0];
  const noSet = toMapStores([store])[0];
  expect(withLogo?.logo).toBe(true);
  expect(Object.keys(without ?? {})).not.toContain('logo');
  expect(Object.keys(noSet ?? {})).not.toContain('logo');
});

it('distanceKm: Edmonton to Calgary is roughly 280 km', () => {
  const d = distanceKm(53.5461, -113.4938, 51.0447, -114.0719);
  expect(d).toBeGreaterThan(270);
  expect(d).toBeLessThan(300);
});
