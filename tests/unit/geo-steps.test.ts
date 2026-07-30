import { it, expect } from 'vitest';
import { browserName, locationSteps } from '../../src/scripts/geolocate';

const IOS_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1';
const IOS_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 CriOS/150.0 Mobile/15E148 Safari/604.1';
const MAC_CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150.0 Safari/537.36';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/150.0 Mobile Safari/537.36';

it('names the browser the user is actually in, not just Safari', () => {
  expect(browserName(IOS_SAFARI)).toBe('Safari');
  expect(browserName(IOS_CHROME)).toBe('Chrome');
  expect(browserName(MAC_CHROME)).toBe('Chrome');
});

it('gives numbered iOS steps that name the Settings app and the right browser', () => {
  const s = locationSteps('iPhone', IOS_CHROME);
  expect(s).toMatch(/1\./);
  expect(s).toMatch(/Settings/);
  expect(s).toMatch(/Location Services/);
  expect(s).toMatch(/Chrome/);
  expect(s).not.toMatch(/System Settings/); // macOS-only wording
});

it('iOS steps say While Using the App, the actual iOS control', () => {
  expect(locationSteps('iPhone', IOS_SAFARI)).toMatch(/While Using the App/);
});

it('gives macOS steps using System Settings', () => {
  const s = locationSteps('MacIntel', MAC_CHROME);
  expect(s).toMatch(/System Settings/);
  expect(s).toMatch(/Location Services/);
  expect(s).toMatch(/Chrome/);
});

it('gives Android steps that do not mention Apple menus', () => {
  const s = locationSteps('Linux armv8l', ANDROID);
  expect(s).toMatch(/Location/);
  expect(s).not.toMatch(/System Settings/);
  expect(s).not.toMatch(/While Using the App/);
});

it('always ends by telling the user to come back and tap again', () => {
  for (const [p, ua] of [['iPhone', IOS_SAFARI], ['MacIntel', MAC_CHROME], ['Linux armv8l', ANDROID]] as const) {
    expect(locationSteps(p, ua)).toMatch(/try again|tap the button again|again/i);
  }
});

it('every platform produces multiple numbered steps, not one sentence', () => {
  for (const [p, ua] of [['iPhone', IOS_SAFARI], ['MacIntel', MAC_CHROME], ['Linux armv8l', ANDROID], ['', '']] as const) {
    expect(locationSteps(p, ua).split('\n').length).toBeGreaterThanOrEqual(3);
  }
});
