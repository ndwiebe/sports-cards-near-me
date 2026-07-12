// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock('mapbox-gl');
});

it('does not load mapbox-gl when the public token is empty', async () => {
  vi.stubEnv('PUBLIC_MAPBOX_TOKEN', '');
  let mapboxLoaded = false;
  vi.doMock('mapbox-gl', () => {
    mapboxLoaded = true;
    return { default: {} };
  });

  const { mountMap } = await import('../../src/scripts/map-core');
  const shell = document.createElement('div');
  const handle = await mountMap(shell, []);

  expect(handle).toBeNull();
  expect(shell.dataset['mapState']).toBe('off');
  expect(mapboxLoaded).toBe(false);
});
