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
const isAndroid = (platform: string, ua: string): boolean => /Android/i.test(platform) || /Android/i.test(ua);

// "Open Safari" is wrong advice when the user is in Chrome, and the settings
// entry they need is listed under the browser's own name.
export const browserName = (ua: string): string => {
  if (/CriOS|Chrome|Chromium/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
  if (/FxiOS|Firefox/i.test(ua)) return 'Firefox';
  if (/Edg/i.test(ua)) return 'Edge';
  if (/Safari/i.test(ua)) return 'Safari';
  return 'your browser';
};

// Nathan asked for the exact steps. These are numbered because the user has to
// leave the page, change a setting elsewhere, and come back — a single sentence
// doesn't survive that trip.
export const locationSteps = (
  platform: string = typeof navigator === 'undefined' ? '' : navigator.platform,
  ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): string => {
  const b = browserName(ua);
  if (isApplePhone(platform)) {
    return [
      '1. Open the Settings app',
      '2. Tap Privacy & Security › Location Services',
      '3. Turn Location Services on',
      `4. In that same list, tap ${b} and choose "While Using the App"`,
      '5. Come back here and tap the button again',
    ].join('\n');
  }
  if (isMac(platform)) {
    return [
      '1. Open System Settings',
      '2. Go to Privacy & Security › Location Services',
      '3. Turn Location Services on',
      `4. Switch on ${b} in the list below it`,
      '5. Come back here and tap the button again',
    ].join('\n');
  }
  if (isAndroid(platform, ua)) {
    return [
      '1. Open the Settings app',
      '2. Tap Location and turn it on',
      `3. Go to Apps › ${b} › Permissions › Location`,
      '4. Choose "Allow only while using the app"',
      '5. Come back here and tap the button again',
    ].join('\n');
  }
  return [
    '1. Turn on location services in your device settings',
    `2. Allow location access for ${b}`,
    '3. Reload this page and tap the button again',
  ].join('\n');
};

export const geoErrorMessage = (
  code: number,
  platform: string = typeof navigator === 'undefined' ? '' : navigator.platform,
  ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): string => {
  // Code 1 is a site-level block, fixed in the browser, not in OS settings —
  // sending the user to Location Services here would be a wild goose chase.
  if (code === 1) {
    return [
      'This site is blocked from using your location.',
      '',
      `1. Tap the icon at the left of the address bar (or ${browserName(ua)}'s site settings)`,
      '2. Find Location and set it to Allow or Ask',
      '3. Reload this page and tap the button again',
    ].join('\n');
  }
  if (code === 2) {
    return [
      "Your device wouldn't share a location. To turn it on:",
      '',
      locationSteps(platform, ua),
    ].join('\n');
  }
  if (code === 3) return 'Locating took too long — check your signal and try again, or pick a city below.';
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
