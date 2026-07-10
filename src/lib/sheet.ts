export interface GvizCell {
  v: string | number | null;
  f?: string;
}
export type GvizRow = (GvizCell | null)[];

interface GvizPayload {
  table?: { rows?: { c: GvizRow }[] };
}

export function parseGviz(text: string): GvizRow[] {
  const m = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s);
  if (!m || m[1] === undefined) throw new Error('gviz: unexpected response shape');
  const payload = JSON.parse(m[1]) as GvizPayload;
  const rows = payload.table?.rows;
  if (!Array.isArray(rows)) throw new Error('gviz: unexpected response shape');
  return rows.map((r) => r.c);
}

export async function fetchSheetRows(sheetId: string, gid: string): Promise<GvizRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gviz: HTTP ${res.status}`);
  return parseGviz(await res.text());
}
