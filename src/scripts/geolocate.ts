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

export const geoErrorMessage = (code: number): string => {
  if (code === 1) return 'Location permission was blocked. Allow location for this site in your browser, then try again.';
  if (code === 2) return "Your device wouldn't share a location. On a Mac, check System Settings › Privacy & Security › Location Services is on for your browser.";
  if (code === 3) return 'Locating took too long. Try again, or pick a city below.';
  return 'Location unavailable — pick a city instead.';
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
