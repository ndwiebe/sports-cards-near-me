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
