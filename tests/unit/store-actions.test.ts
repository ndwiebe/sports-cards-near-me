import { describe, expect, it } from 'vitest';
import { directionsUrl, telHref } from '../../src/lib/store-actions';

describe('store action links', () => {
  it('builds a Google Maps directions URL from coordinates', () => {
    expect(directionsUrl({ lat: 53.5, lng: -113.6 })).toBe('https://www.google.com/maps/dir/?api=1&destination=53.5,-113.6');
  });
  it('strips formatting from phone numbers, keeping a leading plus', () => {
    expect(telHref('(780) 555-0199')).toBe('tel:7805550199');
    expect(telHref('+1 780-555-0199')).toBe('tel:+17805550199');
  });
});
