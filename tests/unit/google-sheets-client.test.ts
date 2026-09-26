import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import { GoogleSheetsClient, LIVE_SHEET_ID } from '../../src/lib/google-sheets-client';

const TEST_SPREADSHEET_ID = 'test-copy-id-123';

const STORE_HEADER = [
  'Store Name', 'City', 'Address', 'Rating', 'Hours', 'Phone', 'Website',
  'Social Media Links', 'Services', 'Sports/TCG Available', 'lat', 'lng', 'Status', 'Unverified Note',
];

const META_RESPONSE = {
  sheets: [
    { properties: { sheetId: 1_588_938_698, title: 'Stores' } },
    { properties: { sheetId: 222, title: 'Shows' } },
    { properties: { sheetId: 333, title: 'Resellers' } },
  ],
};

type Handler = { match: (url: string, method: string) => boolean; respond: (call: Call) => unknown };

interface Call {
  url: string;
  method: string;
  body: unknown;
  authorization: string | undefined;
}

/** A tiny fetch stub: routes by URL substring, records every call. */
function makeFetchStub(handlers: Handler[]) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const isJsonBody = typeof init?.body === 'string' && init.body.trim().startsWith('{');
    const body: unknown = isJsonBody ? JSON.parse(init!.body as string) : undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const call: Call = { url, method, body, authorization: headers['authorization'] };
    calls.push(call);

    if (url === 'https://oauth2.googleapis.com/token') {
      return new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 });
    }
    const handler = handlers.find((h) => h.match(url, method));
    if (handler === undefined) {
      throw new Error(`unmocked fetch: ${method} ${url}`);
    }
    return new Response(JSON.stringify(handler.respond(call)), { status: 200 });
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

function makeClient(fetchImpl: typeof fetch, spreadsheetId = TEST_SPREADSHEET_ID, allowLiveSheet?: boolean): GoogleSheetsClient {
  return new GoogleSheetsClient({
    spreadsheetId,
    keyFilePath: '/nonexistent/should-not-be-read.json',
    fetchImpl,
    allowLiveSheet,
    tokenProvider: undefined,
  } as never);
}

// The client builds its own GoogleAuthTokenProvider unless one is injected;
// since keyFilePath points nowhere, we verify the JWT/token exchange is
// exercised for real by asserting the token endpoint gets hit and a bearer
// token from that response is used on subsequent calls. To avoid reading a
// real key file in this test, we hand it a tokenProvider stub instead of a
// keyFilePath-based one whenever a test doesn't care about the auth path
// itself (the dedicated auth tests already cover JWT shape and caching).
function makeClientWithStubToken(fetchImpl: typeof fetch, spreadsheetId = TEST_SPREADSHEET_ID): GoogleSheetsClient {
  return new GoogleSheetsClient({
    spreadsheetId,
    keyFilePath: '/nonexistent/should-not-be-read.json',
    fetchImpl,
    tokenProvider: { getToken: () => Promise.resolve('stub-token') } as never,
  });
}

describe('GoogleSheetsClient — live sheet refusal', () => {
  it('refuses to construct against the live sheet id without allowLiveSheet', () => {
    expect(() => makeClient(vi.fn() as unknown as typeof fetch, LIVE_SHEET_ID)).toThrow(/live sheet/i);
  });

  it('does not throw when allowLiveSheet is explicitly true', () => {
    expect(() => makeClient(vi.fn() as unknown as typeof fetch, LIVE_SHEET_ID, true)).not.toThrow();
  });

  it('does not throw for a non-live spreadsheet id', () => {
    expect(() => makeClient(vi.fn() as unknown as typeof fetch, TEST_SPREADSHEET_ID)).not.toThrow();
  });
});

describe('GoogleSheetsClient — auth', () => {
  let dir: string;
  let keyFilePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'scnm-google-client-'));
    keyFilePath = join(dir, 'key.json');
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    await writeFile(
      keyFilePath,
      JSON.stringify({ client_email: 'bot@test.iam.gserviceaccount.com', private_key: privateKey }),
    );
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('fetches an access token via the JWT flow and sends it as a bearer token on API calls', async () => {
    const { fetchImpl, calls } = makeFetchStub([
      { match: (url) => url.includes('fields=sheets.properties'), respond: () => META_RESPONSE },
      { match: (url) => url.includes('!1:1'), respond: () => ({ values: [STORE_HEADER] }) },
    ]);
    const client = new GoogleSheetsClient({ spreadsheetId: TEST_SPREADSHEET_ID, keyFilePath, fetchImpl });
    await client.countRows('Stores').catch(() => undefined); // triggers auth + meta + header, may fail later on row range — fine

    const tokenCall = calls.find((c) => c.url === 'https://oauth2.googleapis.com/token');
    expect(tokenCall).toBeDefined();
    expect(tokenCall?.method).toBe('POST');

    const apiCall = calls.find((c) => c.url.includes('fields=sheets.properties'));
    expect(apiCall).toBeDefined();
    expect(apiCall?.authorization).toBe('Bearer test-token');
  });
});

describe('GoogleSheetsClient — reads', () => {
  let handlers: Handler[];

  beforeEach(() => {
    handlers = [
      { match: (url) => url.includes('fields=sheets.properties'), respond: () => META_RESPONSE },
      { match: (url) => url.includes(encodeURIComponent("'Stores'!1:1")), respond: () => ({ values: [STORE_HEADER] }) },
      {
        match: (url) => url.includes(encodeURIComponent("'Stores'!A2:N")),
        respond: () => ({
          values: [
            ['203 Collectibles LTD.', 'Edmonton', '2331 66 St NW', '4.8 (33)', 'Mon-Sat 11-7', '780-555-0100', 'https://example.com', '', '', '', 53.5, -113.4, '', ''],
            ['Sample Shop', 'Calgary', '100 Sample St', '', '', '', '', '', '', '', 51.0, -114.0, '', ''],
          ],
        }),
      },
      {
        match: (url) => url.includes(encodeURIComponent("'Stores'!A2:N2")),
        respond: () => ({ values: [['203 Collectibles LTD.', 'Edmonton', '2331 66 St NW', '4.8 (33)', 'Mon-Sat 11-7', '780-555-0100', 'https://example.com', '', '', '', 53.5, -113.4, '', '']] }),
      },
    ];
  });

  it('reads row counts', async () => {
    const { fetchImpl } = makeFetchStub(handlers);
    const client = makeClientWithStubToken(fetchImpl);
    expect(await client.countRows('Stores')).toBe(2);
  });

  it('reads a row by its derived slug', async () => {
    const { fetchImpl } = makeFetchStub(handlers);
    const client = makeClientWithStubToken(fetchImpl);
    const row = await client.getRow('Stores', '203-collectibles-ltd-edmonton');
    expect(row).toMatchObject({ Name: '203 Collectibles LTD.', City: 'Edmonton', Hours: 'Mon-Sat 11-7' });
  });

  it('returns undefined for a slug that does not exist', async () => {
    const { fetchImpl } = makeFetchStub(handlers);
    const client = makeClientWithStubToken(fetchImpl);
    expect(await client.getRow('Stores', 'nope-nowhere')).toBeUndefined();
  });
});

describe('GoogleSheetsClient — writes', () => {
  it('writes an update to the correct cell range', async () => {
    const handlers: Handler[] = [
      { match: (url) => url.includes('fields=sheets.properties'), respond: () => META_RESPONSE },
      { match: (url) => url.includes(encodeURIComponent("'Stores'!1:1")), respond: () => ({ values: [STORE_HEADER] }) },
      {
        match: (url) => url.includes(encodeURIComponent("'Stores'!A2:N")) && !url.includes('2:N2'),
        respond: () => ({
          values: [['203 Collectibles LTD.', 'Edmonton', 'Addr', '', 'Mon-Sat 11-7', '', '', '', '', '', 53.5, -113.4, '', '']],
        }),
      },
      {
        match: (url, method) => method === 'PUT' && url.includes(encodeURIComponent("'Stores'!E2")),
        respond: () => ({ updatedCells: 1 }),
      },
    ];
    const { fetchImpl, calls } = makeFetchStub(handlers);
    const client = makeClientWithStubToken(fetchImpl);

    await client.updateCell('Stores', '203-collectibles-ltd-edmonton', 'Hours', 'Mon-Sat 11-7 (trial)');

    const putCall = calls.find((c) => c.method === 'PUT');
    expect(putCall).toBeDefined();
    expect(putCall?.url).toContain(encodeURIComponent("'Stores'!E2"));
    expect(putCall?.url).toContain('valueInputOption=RAW');
    expect(putCall?.body).toMatchObject({ values: [['Mon-Sat 11-7 (trial)']] });
  });

  it('refuses to update a row that does not exist', async () => {
    const handlers: Handler[] = [
      { match: (url) => url.includes('fields=sheets.properties'), respond: () => META_RESPONSE },
      { match: (url) => url.includes(encodeURIComponent("'Stores'!1:1")), respond: () => ({ values: [STORE_HEADER] }) },
      { match: (url) => url.includes(encodeURIComponent("'Stores'!A2:N")), respond: () => ({ values: [] }) },
    ];
    const { fetchImpl } = makeFetchStub(handlers);
    const client = makeClientWithStubToken(fetchImpl);
    await expect(client.updateCell('Stores', 'nope', 'Hours', 'x')).rejects.toThrow(/not found/);
  });
});

describe('GoogleSheetsClient — header mismatch', () => {
  it('fails loudly when the header row does not match the expected layout', async () => {
    const shiftedHeader = ['Store Name', 'City', 'Address', 'Hours', 'Rating']; // Rating/Hours swapped
    const handlers: Handler[] = [
      { match: (url) => url.includes('fields=sheets.properties'), respond: () => META_RESPONSE },
      { match: (url) => url.includes(encodeURIComponent("'Stores'!1:1")), respond: () => ({ values: [shiftedHeader] }) },
    ];
    const { fetchImpl } = makeFetchStub(handlers);
    const client = makeClientWithStubToken(fetchImpl);
    await expect(client.countRows('Stores')).rejects.toThrow(/header mismatch/i);
  });

  it('fails loudly when a tab cannot be found at all', async () => {
    const handlers: Handler[] = [{ match: (url) => url.includes('fields=sheets.properties'), respond: () => ({ sheets: [] }) }];
    const { fetchImpl } = makeFetchStub(handlers);
    const client = makeClientWithStubToken(fetchImpl);
    await expect(client.countRows('Stores')).rejects.toThrow(/could not find/i);
  });
});
