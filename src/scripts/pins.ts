import type { MapStore } from '../lib/map-data';
import { initialsOf } from '../lib/map-data';

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createPinEl(store: MapStore): HTMLElement {
  const outer = el('div', 'pin-outer');
  outer.dataset['slug'] = store.slug;
  const inner = el('div', 'pin-inner');
  const chip = el('div', 'pin-chip');
  chip.appendChild(el('span', 'pin-badge', initialsOf(store.name)));
  chip.appendChild(el('span', 'pin-name', store.name));
  inner.appendChild(chip);
  inner.appendChild(el('div', 'pin-stem'));
  outer.appendChild(inner);
  return outer;
}

export function createClusterEl(count: number): HTMLElement {
  const outer = el('div', 'cluster-outer');
  outer.appendChild(el('div', 'cluster-inner', String(count)));
  return outer;
}
