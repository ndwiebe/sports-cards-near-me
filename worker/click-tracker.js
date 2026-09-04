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
const LOCAL_ORIGIN = 'http://localhost:4321';
const ALLOWED_METHODS = new Set(['directions', 'call']);
const SLUG_RE = /^[a-z0-9-]{1,120}$/;

// Substrings of the User-Agent for crawlers, previewers and monitoring tools.
// A bot that runs page JS would otherwise increment a counter that is meant to
// represent a person choosing to contact a shop, and PLAN.md step 8 requires bot
// filtering before any of this is sold against.
const BOT_UA_MARKERS = [
  'bot', 'crawl', 'spider', 'slurp', 'headless', 'phantomjs', 'puppeteer',
  'playwright', 'lighthouse', 'pagespeed', 'gtmetrix', 'pingdom', 'uptime',
  'curl', 'wget', 'python-requests', 'axios', 'go-http-client', 'java/',
  'preview', 'fetcher', 'monitor', 'scrap',
];

function looksLikeABot(userAgent) {
  if (userAgent === '') return true; // a real browser always sends one
  const ua = userAgent.toLowerCase();
  return BOT_UA_MARKERS.some((marker) => ua.includes(marker));
}

function isAllowedOrigin(origin) {
  return origin === ALLOWED_ORIGIN || origin === LOCAL_ORIGIN;
}

function corsHeaders(origin) {
  const allow = isAllowedOrigin(origin);
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

    // CORS headers only shape what a BROWSER does with the response — they never stop
    // the worker processing a request, so until now anyone could inflate any shop's
    // count from anywhere with one curl. This is the check that actually refuses.
    // It is not proof of a real visitor (an Origin header can be forged), but it means
    // inflating a number now takes deliberate effort rather than a one-line command,
    // and every accidental or automated hit is filtered.
    if (!isAllowedOrigin(origin)) {
      return new Response('Forbidden', { status: 403, headers });
    }

    if (looksLikeABot(request.headers.get('User-Agent') ?? '')) {
      // 204, not 403: a bot gets the same answer a person does, so this can't be used
      // to probe which requests are being counted. Nothing is written.
      return new Response(null, { status: 204, headers });
    }

    const month = new Date().toISOString().slice(0, 7); // YYYY-MM, UTC is fine for a monthly bucket
    const key = `clicks:${store}:${method}:${month}`;

    const current = await env.CLICKS.get(key);
    const next = (current === null ? 0 : Number.parseInt(current, 10)) + 1;
    await env.CLICKS.put(key, String(next));

    return new Response(null, { status: 204, headers });
  },
};
