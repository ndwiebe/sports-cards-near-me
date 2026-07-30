import type { MapHandle } from './map-core';

const handles = new Map<HTMLElement, MapHandle>();
const waiters = new Map<HTMLElement, ((handle: MapHandle) => void)[]>();

export function registerMap(shell: HTMLElement, handle: MapHandle): void {
  handles.set(shell, handle);
  for (const cb of waiters.get(shell) ?? []) cb(handle);
  waiters.delete(shell);
}

// Non-blocking lookup. Callers that must work with or without a map (the
// "find shops near me" button) use this instead of whenMapReady, which never
// fires if the map fails to mount and would leave the button with no handler.
export function getMapHandle(shell: HTMLElement): MapHandle | undefined {
  return handles.get(shell);
}

export function whenMapReady(shell: HTMLElement, cb: (handle: MapHandle) => void): void {
  const handle = handles.get(shell);
  if (handle) {
    cb(handle);
    return;
  }
  const list = waiters.get(shell) ?? [];
  list.push(cb);
  waiters.set(shell, list);
}
