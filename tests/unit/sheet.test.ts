import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseGviz, fetchSheetRowsByName } from '../../src/lib/sheet';

const SAMPLE =
  '/*O_o*/\ngoogle.visualization.Query.setResponse({"version":"0.6","reqId":"0","status":"ok","table":{"cols":[{"id":"A"}],"rows":[{"c":[{"v":"203 Collectibles LTD."},null,{"v":"Edmonton, AB"},{"v":4.8,"f":"4.8"}]}]}});';

describe('parseGviz', () => {
  it('extracts rows from the JSONP wrapper', () => {
    const rows = parseGviz(SAMPLE);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.[0]?.v).toBe('203 Collectibles LTD.');
    expect(rows[0]?.[1]).toBeNull();
    expect(rows[0]?.[3]?.v).toBe(4.8);
  });
  it('throws on non-gviz input', () => {
    expect(() => parseGviz('<html>login</html>')).toThrow('gviz: unexpected response shape');
  });
  it('skips blank rows (null row objects and null c)', () => {
    const s =
      '/*O_o*/\ngoogle.visualization.Query.setResponse({"table":{"rows":[null,{"c":null},{"c":[{"v":"x"}]}]}});';
    const rows = parseGviz(s);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.[0]?.v).toBe('x');
  });
});

describe('fetchSheetRowsByName', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the gviz endpoint by sheet name and parses the JSONP payload', async () => {
    const fetchMock = vi.fn(async () => new Response(SAMPLE, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const rows = await fetchSheetRowsByName('SHEET_ID_123', 'Shows');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://docs.google.com/spreadsheets/d/SHEET_ID_123/gviz/tq?tqx=out:json&sheet=Shows',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.[0]?.v).toBe('203 Collectibles LTD.');
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 404 })),
    );
    await expect(fetchSheetRowsByName('SHEET_ID_123', 'Shows')).rejects.toThrow('gviz: HTTP 404');
  });
});
