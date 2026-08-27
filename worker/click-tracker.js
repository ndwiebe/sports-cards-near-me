/**
 * Counts "Directions" and "Call" clicks per store, per month. Nothing else.
 *
 * Why this exists: the site is a static build with no server, so there was no way to
 * answer "how many customers did the directory actually send you" — the exact number a
 * shop owner needs before a paid listing is an obvious yes. GA4 would answer this but
 * needs a cookie-consent decision (see layouts/Base.astro); Cloudflare Web Analytics,
 * the analytics already running, has no event model at all (confirmed against their own
 * docs 2026-08-27). This avoids both: no cookies, no PII, one anonymous counter per
 * store per month, incremented via navigator.sendBeacon from the store page.
 *
 * KV key shape: clicks:{storeSlug}:{method}:{YYYY-MM} -> integer count (as text).
 * method is exactly "directions" or "call" — anything else is rejected, not recorded
 * under an unexpected key.
 */

const ALLOWED_ORIGIN = 'https://sportscardsnearme.ca';
const ALLOWED_METHODS = new Set(['directions', 'call']);
const SLUG_RE = /^[a-z0-9-]{1,120}$/;

function corsHeaders(origin) {
  const allow = origin === ALLOWED_ORIGIN || origin === 'http://localhost:4321';
  return {
    'Access-Control-Allow-Origin': allow ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Bad JSON', { status: 400, headers });
    }

    const store = typeof body?.store === 'string' ? body.store : undefined;
    const method = typeof body?.method === 'string' ? body.method : undefined;

    if (store === undefined || !SLUG_RE.test(store) || method === undefined || !ALLOWED_METHODS.has(method)) {
      return new Response('Bad request', { status: 400, headers });
    }

    const month = new Date().toISOString().slice(0, 7); // YYYY-MM, UTC is fine for a monthly bucket
    const key = `clicks:${store}:${method}:${month}`;

    const current = await env.CLICKS.get(key);
    const next = (current === null ? 0 : Number.parseInt(current, 10)) + 1;
    await env.CLICKS.put(key, String(next));

    return new Response(null, { status: 204, headers });
  },
};
