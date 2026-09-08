/**
 * Records accepted listing actions as separate KV events. Existing clicks: keys
 * are approximate legacy counters and are no longer changed. No cookies,
 * visitor identifiers, IP addresses or full referrers are stored.
 */
import { validSourceCity } from './event-schema.js';
import cityPaths from './city-paths.json' with { type: 'json' };
const KNOWN_CITIES = new Set(cityPaths);

const ALLOWED_ORIGIN = 'https://sportscardsnearme.ca';
const LOCAL_ORIGIN = 'http://localhost:4321';
const ALLOWED_METHODS = new Set(['directions', 'call', 'website']);
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
    const sourceCandidate = body?.sourceCity ?? 'unknown';

    if (store === undefined || !SLUG_RE.test(store) || method === undefined || !ALLOWED_METHODS.has(method) || !validSourceCity(sourceCandidate)) {
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
    const sourceCity = KNOWN_CITIES.has(sourceCandidate) ? sourceCandidate : 'unknown';
    // Independent keys avoid lost updates from concurrent KV read/modify/write.
    // The random event ID identifies this request, never a visitor or session.
    // Keep old clicks: counters untouched for separately labelled legacy reports.
    const key = `events:${store}:${method}:${month}:${sourceCity}:${crypto.randomUUID()}`;
    await env.CLICKS.put(key, '1');

    return new Response(null, { status: 204, headers });
  },
};
