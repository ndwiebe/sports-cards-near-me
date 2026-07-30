// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { registerMap, whenMapReady } from '../../src/scripts/map-registry';
import type { MapHandle } from '../../src/scripts/map-core';

const fakeHandle = { flyTo: () => undefined } as unknown as MapHandle;

it('callback fires when registration happens after whenMapReady (the race)', () => {
  const shell = document.createElement('div');
  let got: MapHandle | null = null;
  whenMapReady(shell, (h) => { got = h; });
  expect(got).toBeNull();
  registerMap(shell, fakeHandle);
  expect(got).toBe(fakeHandle);
});

it('callback fires immediately when already registered', () => {
  const shell = document.createElement('div');
  registerMap(shell, fakeHandle);
  let got: MapHandle | null = null;
  whenMapReady(shell, (h) => { got = h; });
  expect(got).toBe(fakeHandle);
});

// The "find shops near me" button used to be registered inside whenMapReady,
// so a map that failed to mount left it with no click handler at all — a dead
// button and no error. getMapHandle lets a caller work either way.
it('getMapHandle returns undefined before a map registers, and never blocks', async () => {
  const { getMapHandle, registerMap } = await import('../../src/scripts/map-registry');
  const shell = document.createElement('div');
  expect(getMapHandle(shell)).toBeUndefined();
  const handle = { flyTo: () => {} } as unknown as Parameters<typeof registerMap>[1];
  registerMap(shell, handle);
  expect(getMapHandle(shell)).toBe(handle);
});
