import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain Cloudflare Worker module, no types of its own
import worker from '../../worker/click-tracker.js';

const SITE = 'https://sportscardsnearme.ca';
const BROWSER_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile Safari/604.1';

/** Records what reached KV, so "returned 204" and "actually counted" stay distinguishable. */
function fakeEnv() {
  const writes: Record<string, string> = {};
  return {
    writes,
    env: {
      CLICKS: {
        get: async (key: string) => writes[key] ?? null,
        put: async (key: string, value: string) => {
          writes[key] = value;
        },
      },
    },
  };
}

function tap(overrides: { origin?: string; ua?: string; body?: unknown } = {}) {
  const { origin = SITE, ua = BROWSER_UA, body = { store: 'a-real-shop-toronto', method: 'call' } } = overrides;
  return new Request('https://tracker.example/', {
    method: 'POST',
    headers: { Origin: origin, 'User-Agent': ua, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('click-tracker worker', () => {
  it('counts a real tap from the site', async () => {
    const { env, writes } = fakeEnv();
    const res = await worker.fetch(tap(), env);
    expect(res.status).toBe(204);
    expect(Object.values(writes)).toEqual(['1']);
    expect(Object.keys(writes)[0]).toMatch(/^clicks:a-real-shop-toronto:call:\d{4}-\d{2}$/);
  });

  it('increments rather than overwriting on a second tap', async () => {
    const { env, writes } = fakeEnv();
    await worker.fetch(tap(), env);
    await worker.fetch(tap(), env);
    expect(Object.values(writes)).toEqual(['2']);
  });

  // The hole the 2026-09-03 review found: CORS headers only shape what a browser does
  // with the response, so they never stopped the worker writing. Anyone could inflate
  // any shop's count from anywhere with one curl.
  it('refuses a request from another origin, and writes nothing', async () => {
    const { env, writes } = fakeEnv();
    const res = await worker.fetch(tap({ origin: 'https://someone-elses-site.example' }), env);
    expect(res.status).toBe(403);
    expect(writes).toEqual({});
  });

  it('refuses a request with no origin at all (a bare curl)', async () => {
    const { env, writes } = fakeEnv();
    const res = await worker.fetch(tap({ origin: '' }), env);
    expect(res.status).toBe(403);
    expect(writes).toEqual({});
  });

  it.each([
    ['Googlebot/2.1 (+http://www.google.com/bot.html)'],
    ['Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/120.0.0.0'],
    ['curl/8.4.0'],
    ['Chrome-Lighthouse'],
    [''],
  ])('does not count a tap from %s', async (ua) => {
    const { env, writes } = fakeEnv();
    const res = await worker.fetch(tap({ ua }), env);
    // Same answer a person gets, so this can't be used to probe what is counted...
    expect(res.status).toBe(204);
    // ...but nothing was recorded.
    expect(writes).toEqual({});
  });

  it('still rejects an unknown method or a malformed slug', async () => {
    const { env, writes } = fakeEnv();
    expect((await worker.fetch(tap({ body: { store: 'a-shop', method: 'website' } }), env)).status).toBe(400);
    expect((await worker.fetch(tap({ body: { store: 'Not A Slug', method: 'call' } }), env)).status).toBe(400);
    expect(writes).toEqual({});
  });
});
