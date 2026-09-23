const CITY_PATH = /^(alberta|british-columbia|manitoba|new-brunswick|newfoundland-and-labrador|nova-scotia|northwest-territories|nunavut|ontario|prince-edward-island|quebec|saskatchewan|yukon)\/[a-z0-9-]{1,100}$/;

/** @param {unknown} value */
export function validSourceCity(value) {
  return typeof value === 'string' && (value === 'unknown' || CITY_PATH.test(value));
}

/** Only the immediately preceding canonical city route qualifies.
 * @param {string} referrer
 * @param {string} origin
 */
export function sourceCityFromReferrer(referrer, origin) {
  try {
    const url = new URL(referrer);
    if (url.origin !== origin) return 'unknown';
    const path = url.pathname.replace(/^\/|\/$/g, '');
    return validSourceCity(path) ? path : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** A tap made on a city page belongs to that city; otherwise use the preceding page.
 * @param {string} pathname
 * @param {string} referrer
 * @param {string} origin
 */
export function sourceCityForClick(pathname, referrer, origin) {
  const here = pathname.replace(/^\/|\/$/g, '');
  return CITY_PATH.test(here) ? here : sourceCityFromReferrer(referrer, origin);
}
