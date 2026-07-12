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
