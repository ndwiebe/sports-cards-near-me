import type { MapStore } from '../lib/map-data';
import { initialsOf } from '../lib/map-data';

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function badgeFor(store: MapStore): HTMLElement {
  if (store.logo === true) {
    const img = document.createElement('img');
    img.className = 'pin-badge pin-badge-img';
    img.src = `/logos/${store.slug}.webp`;
    img.alt = '';
    img.width = 20;
    img.height = 20;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.replaceWith(el('span', 'pin-badge', initialsOf(store.name)));
    }, { once: true });
    return img;
  }
  return el('span', 'pin-badge', initialsOf(store.name));
}

export function createPinEl(store: MapStore): HTMLElement {
  const outer = el('div', 'pin-outer');
  outer.dataset['slug'] = store.slug;
  const inner = el('div', 'pin-inner');
  const chip = el('div', 'pin-chip');
  chip.appendChild(badgeFor(store));
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
