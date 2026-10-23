import { describe, it, expect } from 'vitest';
import { showDirectionsUrl } from '../../src/lib/show-directions';
import type { ShowRecord } from '../../src/lib/shows';
const date = new Date(2026, 9, 1, 12);
const show: ShowRecord = { slug: 'example', name: 'Example', city: 'Abbotsford', citySlug: 'abbotsford', province: 'BC', startDate: '2026-10-24', address: ' 1190 Cornell Ave ' };
describe('show directions eligibility', () => {
  it('uses a complete encoded destination', () => {
    const url = new URL(showDirectionsUrl(show, date)!);
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('destination')).toBe('1190 Cornell Ave, Abbotsford, British Columbia, Canada');
  });
  it('does not route to a held show even before its listed date', () => {
    expect(showDirectionsUrl({ ...show, slug: 'uxbridge-sports-card-show-stouffville-2026-10-03', startDate: '2026-10-03' }, date)).toBeUndefined();
  });
  it('does not route to past shows', () => expect(showDirectionsUrl({ ...show, startDate: '2026-09-30' }, date)).toBeUndefined());
  it.each([undefined, '', '   '])('does not invent a destination for address %s', address => {
    expect(showDirectionsUrl({ ...show, address }, date)).toBeUndefined();
  });
});
