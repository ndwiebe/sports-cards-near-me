export interface Coords {
  lat: number;
  lng: number;
}

// A finite timeout is the whole point: the spec default is Infinity, so without
// this the request can sit pending forever and neither callback ever fires —
// the button looks dead and the error path is unreachable.
export const GEO_OPTIONS: PositionOptions = {
  timeout: 10_000,
  maximumAge: 300_000,
};

const isApplePhone = (platform: string): boolean => /iPhone|iPad|iPod/i.test(platform);
const isMac = (platform: string): boolean => /Mac/i.test(platform) && !isApplePhone(platform);

// Nathan hit code 2 on a phone and was told to open macOS System Settings.
// The remedy is genuinely platform-specific, so the hint has to be too.
const unavailableHint = (platform: string): string => {
  if (isApplePhone(platform)) return 'Open Settings › Privacy & Security › Location Services, turn it on, and allow it for your browser.';
  if (isMac(platform)) return 'Check System Settings › Privacy & Security › Location Services is on for your browser.';
  return 'Check location services are turned on for your device and browser.';
};

export const geoErrorMessage = (
  code: number,
  platform: string = typeof navigator === 'undefined' ? '' : navigator.platform,
): string => {
  if (code === 1) return 'Location permission was blocked. Allow location for this site in your browser, then try again.';
  if (code === 2) return `Your device wouldn't share a location. ${unavailableHint(platform)}`;
  if (code === 3) return 'Locating took too long. Try again, or pick a city below.';
  // Deliberately NOT the pre-fix wording ("Location unavailable — pick a city
  // instead."): keeping that string made a stale cached page look identical to
  // a live failure and cost a diagnosis cycle.
  return "Couldn't get your location — pick a city below instead.";
};

export const locate = (geo: Geolocation | undefined, options: PositionOptions = GEO_OPTIONS): Promise<Coords> =>
  new Promise((resolve, reject) => {
    if (geo === undefined) {
      reject(new Error('Location is not supported by this browser — pick a city instead.'));
      return;
    }
    geo.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(geoErrorMessage(err.code))),
      options,
    );
  });
