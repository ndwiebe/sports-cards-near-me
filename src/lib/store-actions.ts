import type { Store } from './types';

export function directionsUrl(store: Pick<Store, 'lat' | 'lng'>): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, '')}`;
}
