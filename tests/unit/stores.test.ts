import { it, expect } from 'vitest';
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
