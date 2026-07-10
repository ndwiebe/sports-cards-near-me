import { describe, it, expect } from 'vitest';
import { parseGviz } from '../../src/lib/sheet';

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
});
