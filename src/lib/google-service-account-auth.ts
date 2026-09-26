import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/**
 * The handful of fields we actually read out of a downloaded Google service
 * account JSON key file. There are more fields in the real file (`type`,
 * `project_id`, `private_key_id`, ...) that this tool never needs.
 */
export interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token';

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/**
 * Builds and RS256-signs the JWT (a signed, self-contained login token) that
 * Google's OAuth token endpoint exchanges for a short-lived access token —
 * this is the "service account" flow: no browser, no human sign-in, just a
 * private key proving "this bot is who it says it is". `nowSeconds` is
 * injectable so tests don't depend on the real clock.
 */
export function buildSignedJwt(key: ServiceAccountKey, scope: string, nowSeconds: number): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: key.client_email,
    scope,
    aud: key.token_uri ?? DEFAULT_TOKEN_URI,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(key.private_key);
  return `${signingInput}.${base64url(signature)}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

function isTokenResponse(x: unknown): x is TokenResponse {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return typeof r['access_token'] === 'string' && typeof r['expires_in'] === 'number';
}

export interface GoogleAuthTokenProviderOptions {
  /** Path to a service-account JSON key file, read lazily on first use. */
  keyFilePath: string;
  scope: string;
  fetchImpl?: typeof fetch;
  /** Returns the current time in milliseconds. Injectable for tests. */
  now?: () => number;
  /** Overrides reading `keyFilePath` from disk — tests use this to hand in a throwaway key. */
  loadKey?: () => Promise<ServiceAccountKey>;
}

/**
 * Fetches and caches an OAuth access token for a Google service account.
 * Never logs or exposes the private key or the token itself — callers only
 * ever see `getToken()`'s return value, which they must treat as a secret.
 * Refreshes a little early (60s of slack) rather than exactly at expiry, so a
 * slow request never straddles the token going stale mid-flight.
 */
export class GoogleAuthTokenProvider {
  private readonly keyFilePath: string;
  private readonly scope: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly loadKey: () => Promise<ServiceAccountKey>;
  private cached: { token: string; expiresAtMs: number } | undefined;
  private readonly refreshSlackMs = 60_000;

  constructor(options: GoogleAuthTokenProviderOptions) {
    this.keyFilePath = options.keyFilePath;
    this.scope = options.scope;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.loadKey = options.loadKey ?? (() => this.readKeyFile());
  }

  private async readKeyFile(): Promise<ServiceAccountKey> {
    const raw = JSON.parse(await readFile(this.keyFilePath, 'utf8')) as Record<string, unknown>;
    const clientEmail = raw['client_email'];
    const privateKey = raw['private_key'];
    if (typeof clientEmail !== 'string' || typeof privateKey !== 'string') {
      throw new Error(`${this.keyFilePath}: not a valid service-account key file (missing client_email/private_key)`);
    }
    const tokenUri = raw['token_uri'];
    return { client_email: clientEmail, private_key: privateKey, ...(typeof tokenUri === 'string' ? { token_uri: tokenUri } : {}) };
  }

  async getToken(): Promise<string> {
    const nowMs = this.now();
    if (this.cached !== undefined && this.cached.expiresAtMs - this.refreshSlackMs > nowMs) {
      return this.cached.token;
    }

    const key = await this.loadKey();
    const jwt = buildSignedJwt(key, this.scope, Math.floor(nowMs / 1000));
    const tokenUri = key.token_uri ?? DEFAULT_TOKEN_URI;
    const res = await this.fetchImpl(tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
    });
    const body: unknown = await res.json();
    if (!res.ok || !isTokenResponse(body)) {
      throw new Error(`token exchange failed: HTTP ${res.status} ${JSON.stringify(body)}`);
    }
    this.cached = { token: body.access_token, expiresAtMs: nowMs + body.expires_in * 1000 };
    return this.cached.token;
  }
}
