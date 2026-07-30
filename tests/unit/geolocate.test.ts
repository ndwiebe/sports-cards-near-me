import { it, expect, vi } from 'vitest';
import { locate, geoErrorMessage, GEO_OPTIONS } from '../../src/scripts/geolocate';

const position = { coords: { latitude: 45.5, longitude: -73.6 } } as GeolocationPosition;

const fakeGeo = (impl: Geolocation['getCurrentPosition']): Geolocation =>
  ({ getCurrentPosition: impl, watchPosition: vi.fn(), clearWatch: vi.fn() }) as unknown as Geolocation;

// The actual bug: getCurrentPosition was called with no options at all, so the spec
// default of timeout: Infinity applied and neither callback ever fired. The button
// looked dead — no location, no prompt the user could act on, no error.
it('always passes a finite timeout so the request cannot hang forever', async () => {
  const spy = vi.fn(
    (ok: PositionCallback, _fail?: PositionErrorCallback | null, _opts?: PositionOptions) => ok(position),
  );
  await locate(fakeGeo(spy));
  const opts = spy.mock.calls[0]?.[2];
  expect(opts).toBeDefined();
  expect(Number.isFinite(opts?.timeout)).toBe(true);
  expect(opts?.timeout ?? 0).toBeGreaterThan(0);
});

it('resolves with plain coordinates on success', async () => {
  const geo = fakeGeo((ok: PositionCallback) => ok(position));
  await expect(locate(geo)).resolves.toEqual({ lat: 45.5, lng: -73.6 });
});

it('rejects with an actionable message when permission is denied', async () => {
  const geo = fakeGeo((_ok: PositionCallback, fail?: PositionErrorCallback | null) =>
    fail?.({ code: 1, message: 'denied' } as GeolocationPositionError));
  await expect(locate(geo)).rejects.toThrow(/permission/i);
});

it('rejects when the request times out', async () => {
  const geo = fakeGeo((_ok: PositionCallback, fail?: PositionErrorCallback | null) =>
    fail?.({ code: 3, message: 'timeout' } as GeolocationPositionError));
  await expect(locate(geo)).rejects.toThrow(/took too long/i);
});

it('rejects rather than hanging when the API is missing', async () => {
  await expect(locate(undefined)).rejects.toThrow(/not supported/i);
});

it('maps position-unavailable to the OS location-services hint', () => {
  // The macOS case: Chrome lacks system Location Services, so the site prompt
  // never appears and the request would otherwise hang.
  expect(geoErrorMessage(2)).toMatch(/location services/i);
});

it('exposes a default timeout that is finite', () => {
  expect(Number.isFinite(GEO_OPTIONS.timeout)).toBe(true);
});
