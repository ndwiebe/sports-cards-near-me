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

it('rejects with an actionable message when the site is blocked', async () => {
  const geo = fakeGeo((_ok: PositionCallback, fail?: PositionErrorCallback | null) =>
    fail?.({ code: 1, message: 'denied' } as GeolocationPositionError));
  await expect(locate(geo)).rejects.toThrow(/blocked from using your location/i);
});

// A site-level block is fixed in the browser, not in OS settings. Sending the
// user to Location Services here would be a wild goose chase — their device
// location is already on.
it('the blocked message points at site settings, not OS location services', () => {
  const msg = geoErrorMessage(1, 'iPhone', 'CriOS');
  expect(msg).toMatch(/site settings|address bar/i);
  expect(msg).not.toMatch(/Location Services/);
});

it('rejects when the request times out', async () => {
  const geo = fakeGeo((_ok: PositionCallback, fail?: PositionErrorCallback | null) =>
    fail?.({ code: 3, message: 'timeout' } as GeolocationPositionError));
  await expect(locate(geo)).rejects.toThrow(/took too long/i);
});

it('rejects rather than hanging when the API is missing', async () => {
  await expect(locate(undefined)).rejects.toThrow(/not supported/i);
});

// The defect Nathan hit: on a phone he was told to open macOS "System
// Settings". "System Settings" is the macOS-only wording, so that exact
// string is what must not reach an iPhone.
it('gives an iPhone-appropriate hint on iOS, not macOS instructions', () => {
  const msg = geoErrorMessage(2, 'iPhone');
  expect(msg).toMatch(/location services/i);
  expect(msg).not.toMatch(/System Settings/);
});

it('gives the macOS hint on a Mac', () => {
  expect(geoErrorMessage(2, 'MacIntel')).toMatch(/System Settings/);
});

it('gives a platform-neutral hint when the platform is unknown', () => {
  const msg = geoErrorMessage(2, '');
  expect(msg).toMatch(/location services/i);
  expect(msg).not.toMatch(/System Settings/);
});

// The old code alerted exactly "Location unavailable — pick a city instead."
// Reusing that string as the fallback made a cached old page indistinguishable
// from a live failure and cost a diagnosis cycle. The fallback must differ.
it('fallback text is distinguishable from the pre-fix message', () => {
  expect(geoErrorMessage(99)).not.toBe('Location unavailable — pick a city instead.');
  expect(geoErrorMessage(99)).toMatch(/couldn't get your location/i);
});

it('exposes a default timeout that is finite', () => {
  expect(Number.isFinite(GEO_OPTIONS.timeout)).toBe(true);
});
