import { describe, it, expect, vi } from 'vitest';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { buildSignedJwt, GoogleAuthTokenProvider } from '../../src/lib/google-service-account-auth';
import type { ServiceAccountKey } from '../../src/lib/google-service-account-auth';

function makeTestKeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return { privateKey, publicKey };
}

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as Record<string, unknown>;
}

describe('buildSignedJwt', () => {
  it('produces a three-part token with the expected header and claims, signed with the key', () => {
    const { privateKey, publicKey } = makeTestKeyPair();
    const key: ServiceAccountKey = {
      client_email: 'bot@test.iam.gserviceaccount.com',
      private_key: privateKey,
      token_uri: 'https://oauth2.googleapis.com/token',
    };
    const nowSeconds = 1_700_000_000;
    const jwt = buildSignedJwt(key, 'https://www.googleapis.com/auth/spreadsheets', nowSeconds);

    const parts = jwt.split('.');
    expect(parts).toHaveLength(3);
    const [headerPart, claimsPart, signaturePart] = parts as [string, string, string];

    expect(decodeSegment(headerPart)).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(decodeSegment(claimsPart)).toEqual({
      iss: 'bot@test.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    });

    const signingInput = `${headerPart}.${claimsPart}`;
    const verifier = createVerify('RSA-SHA256');
    verifier.update(signingInput);
    const signatureBuf = Buffer.from(signaturePart, 'base64url');
    expect(verifier.verify(publicKey, signatureBuf)).toBe(true);
  });

  it('defaults the audience to the real Google token endpoint when the key omits token_uri', () => {
    const { privateKey } = makeTestKeyPair();
    const jwt = buildSignedJwt({ client_email: 'x@y.iam.gserviceaccount.com', private_key: privateKey }, 'scope', 0);
    const claimsPart = jwt.split('.')[1] as string;
    expect(decodeSegment(claimsPart)['aud']).toBe('https://oauth2.googleapis.com/token');
  });
});

describe('GoogleAuthTokenProvider', () => {
  const { privateKey } = makeTestKeyPair();
  const testKey: ServiceAccountKey = {
    client_email: 'bot@test.iam.gserviceaccount.com',
    private_key: privateKey,
    token_uri: 'https://oauth2.googleapis.com/token',
  };

  it('exchanges the JWT for an access token via a POST to the token endpoint', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(url).toBe('https://oauth2.googleapis.com/token');
      expect(init?.method).toBe('POST');
      const body = new URLSearchParams(init?.body as string);
      expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
      expect(body.get('assertion')?.split('.')).toHaveLength(3);
      return new Response(JSON.stringify({ access_token: 'token-abc', expires_in: 3600 }), { status: 200 });
    });

    const provider = new GoogleAuthTokenProvider({
      keyFilePath: '/nonexistent/should-not-be-read.json',
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      loadKey: () => Promise.resolve(testKey),
    });

    expect(await provider.getToken()).toBe('token-abc');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('caches the token until shortly before it expires, then refreshes', async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      return new Response(JSON.stringify({ access_token: `token-${call}`, expires_in: 3600 }), { status: 200 });
    });
    let clock = 1_000_000;
    const provider = new GoogleAuthTokenProvider({
      keyFilePath: '/nonexistent/should-not-be-read.json',
      scope: 'scope',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      loadKey: () => Promise.resolve(testKey),
      now: () => clock,
    });

    expect(await provider.getToken()).toBe('token-1');
    clock += 1000; // well within the cached lifetime
    expect(await provider.getToken()).toBe('token-1');
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    clock += 3600 * 1000; // past expiry (including the 60s refresh slack)
    expect(await provider.getToken()).toBe('token-2');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws a clear error when the token endpoint rejects the request', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }),
    );
    const provider = new GoogleAuthTokenProvider({
      keyFilePath: '/nonexistent/should-not-be-read.json',
      scope: 'scope',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      loadKey: () => Promise.resolve(testKey),
    });
    await expect(provider.getToken()).rejects.toThrow(/token exchange failed/);
  });
});
