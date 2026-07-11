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

it('initialsOf falls back to ? when nothing badgeable', () => {
  expect(initialsOf('★★★')).toBe('?');
  expect(initialsOf('')).toBe('?');
});
