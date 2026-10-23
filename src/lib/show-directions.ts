import { isUpcoming, showScheduleWarning, type ShowRecord } from './shows';
import { PROVINCES } from './types';

export function showDirectionsUrl(show: ShowRecord, date: Date): string | undefined {
  if (!isUpcoming(show, date) || showScheduleWarning(show) !== undefined || !show.address?.trim()) return undefined;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${show.address.trim()}, ${show.city}, ${PROVINCES[show.province].name}, Canada`)}`;
}
