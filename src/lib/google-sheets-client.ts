import type { CellValue, SheetClient, SheetName, SheetRow } from './sheet-change-client';
import { slugify } from './transform';
import { GoogleAuthTokenProvider } from './google-service-account-auth';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const API_ROOT = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * The live production sheet (see `docs/superpowers/plans/2026-09-23-q4-sheet-automation.md`,
 * §6, and `CLAUDE.md`). A `GoogleSheetsClient` refuses to talk to it at all —
 * read or write — unless the caller explicitly opts in with
 * `allowLiveSheet: true`, which the CLI in this repo never does. This is the
 * ONE guardrail standing between an automated run and the real directory.
 */
export const LIVE_SHEET_ID = '14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I';

/** The Stores tab is fetched by its internal sheet id (GID) elsewhere in this
 * repo (`scripts/bake-stores.ts`), not by title — a full-spreadsheet "Make a
 * copy" preserves each tab's GID, so this is also how a copy's Stores tab is
 * found. */
const STORES_GID = 1_588_938_698;

type ColumnType = 'string' | 'number' | 'date';

interface ColumnDef {
  /** The canonical field name the sheet-change engine uses in a `ProposedChange` (e.g. `Hours`, `Status`). */
  key: string;
  /** The literal text expected in the sheet's header row for this column. */
  header: string;
  type?: ColumnType;
}

// Confirmed against the real Stores tab header row 2026-09-26 (read-only,
// public gviz fetch of the live sheet — reading headers is safe; writing is
// what this client gates). Column order: Store Name | City | Address |
// Rating | Hours | Phone | Website | Social Media Links | Services |
// Sports/TCG Available | lat | lng | Status | Unverified Note.
const STORE_COLUMNS: ColumnDef[] = [
  { key: 'Name', header: 'Store Name' },
  { key: 'City', header: 'City' },
  { key: 'Address', header: 'Address' },
  { key: 'Rating', header: 'Rating' },
  { key: 'Hours', header: 'Hours' },
  { key: 'Phone', header: 'Phone' },
  { key: 'Website', header: 'Website' },
  { key: 'Social', header: 'Social Media Links' },
  { key: 'Services', header: 'Services' },
  { key: 'Sports', header: 'Sports/TCG Available' },
  { key: 'Lat', header: 'lat', type: 'number' },
  { key: 'Lng', header: 'lng', type: 'number' },
  { key: 'Status', header: 'Status' },
  { key: 'UnverifiedNote', header: 'Unverified Note' },
];

// Documented header row (`docs/superpowers/plans/2026-07-12-plan4-brand-shows-guides.md`):
// Show Name | City | Province | Venue | Address | Start Date | End Date |
// Hours | Admission | Website | Source URL | Recurring. Two more fields
// (`tableBooking`, `organizer`) were added to `rowToShow` later at columns
// 12/13 with no header text recorded anywhere this session could confirm —
// deliberately NOT pinned here, so this client neither reads nor writes them.
// Nothing in this task needs them (the trial only reads Shows' row count).
const SHOW_COLUMNS: ColumnDef[] = [
  { key: 'Name', header: 'Show Name' },
  { key: 'City', header: 'City' },
  { key: 'Province', header: 'Province' },
  { key: 'Venue', header: 'Venue' },
  { key: 'Address', header: 'Address' },
  { key: 'StartDate', header: 'Start Date', type: 'date' },
  { key: 'EndDate', header: 'End Date', type: 'date' },
  { key: 'Hours', header: 'Hours' },
  { key: 'Admission', header: 'Admission' },
  { key: 'Website', header: 'Website' },
  { key: 'SourceUrl', header: 'Source URL' },
  { key: 'Recurring', header: 'Recurring' },
];

// Pinned by `tests/unit/resellers.test.ts` ("reseller column layout is
// pinned"): Display Name | City | Province | Bio | Photo URL | Specialties |
// eBay | Facebook | Instagram | Website | Contact | Status | Verified Date.
const RESELLER_COLUMNS: ColumnDef[] = [
  { key: 'Name', header: 'Display Name' },
  { key: 'City', header: 'City' },
  { key: 'Province', header: 'Province' },
  { key: 'Bio', header: 'Bio' },
  { key: 'Photo', header: 'Photo URL' },
  { key: 'Specialties', header: 'Specialties' },
  { key: 'eBay', header: 'eBay' },
  { key: 'Facebook', header: 'Facebook' },
  { key: 'Instagram', header: 'Instagram' },
  { key: 'Website', header: 'Website' },
  { key: 'Contact', header: 'Contact' },
  { key: 'Status', header: 'Status' },
  { key: 'VerifiedDate', header: 'Verified Date', type: 'date' },
];

function columnsFor(sheet: SheetName): ColumnDef[] {
  switch (sheet) {
    case 'Stores':
      return STORE_COLUMNS;
    case 'Shows':
      return SHOW_COLUMNS;
    case 'Resellers':
      return RESELLER_COLUMNS;
  }
}

/** 0-based column index -> spreadsheet column letter (0 -> A, 26 -> AA). */
function columnLetter(index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function quoteSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

// Google Sheets' date epoch: serial 0 is 1899-12-30 (UNFORMATTED_VALUE
// returns native date cells as a day count from this day).
const SHEETS_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);

function serialToIsoDate(serial: number): string {
  const d = new Date(SHEETS_EPOCH_UTC_MS + Math.round(serial) * 86_400_000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

type RawCell = string | number | boolean | null | undefined;

function rawToDisplayString(raw: RawCell, type: ColumnType | undefined): string {
  if (raw === undefined || raw === null) return '';
  if (type === 'date' && typeof raw === 'number') return serialToIsoDate(raw);
  return String(raw);
}

function rawToCellValue(raw: RawCell, type: ColumnType | undefined): CellValue {
  if (type === 'date') {
    const display = rawToDisplayString(raw, type);
    return display === '' ? null : display;
  }
  if (type === 'number') {
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw))) return Number(raw);
    return null;
  }
  // Plain text columns mirror the sample fixtures' convention of an empty
  // string for a blank cell, not null — the engine's optimistic check
  // compares this directly against a proposed change's `oldValue`.
  return rawToDisplayString(raw, type);
}

interface SheetMeta {
  title: string;
  sheetId: number;
}

interface ColumnMap {
  title: string;
  sheetId: number;
  byKey: Map<string, number>;
}

export interface GoogleSheetsClientOptions {
  spreadsheetId: string;
  /** Path to a service-account JSON key file (read at runtime, never logged). */
  keyFilePath: string;
  /**
   * Must be explicitly `true` to operate against `LIVE_SHEET_ID`. There is no
   * flag for this anywhere in `scripts/sheet-change-engine.ts` — it can only
   * be set by code that constructs a `GoogleSheetsClient` directly.
   */
  allowLiveSheet?: boolean;
  fetchImpl?: typeof fetch;
  /** Test seam — see `GoogleAuthTokenProvider`'s own `loadKey` option. */
  tokenProvider?: GoogleAuthTokenProvider;
}

/**
 * A `SheetClient` backed by the real Google Sheets v4 REST API, authenticated
 * as a service account (a Google-managed "robot" account with no human login
 * — see `google-service-account-auth.ts`). Identifies a row the same way the
 * bake scripts derive a page's slug (`slugify(name + city [+ startDate])`),
 * cached once per process and maintained incrementally across writes — see
 * the block comment above `rowKeyIndex` for the one identity limitation this
 * implies for a `rename`.
 */
export class GoogleSheetsClient implements SheetClient {
  private readonly spreadsheetId: string;
  private readonly fetchImpl: typeof fetch;
  private readonly tokenProvider: GoogleAuthTokenProvider;

  private metaCache: SheetMeta[] | undefined;
  private readonly columnMapCache = new Map<SheetName, ColumnMap>();
  private readonly rowKeyIndex = new Map<SheetName, Map<string, number>>();

  constructor(options: GoogleSheetsClientOptions) {
    if (options.spreadsheetId === LIVE_SHEET_ID && options.allowLiveSheet !== true) {
      throw new Error(
        `refusing to open a GoogleSheetsClient against the live sheet (${LIVE_SHEET_ID}) without allowLiveSheet: true`,
      );
    }
    this.spreadsheetId = options.spreadsheetId;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.tokenProvider =
      options.tokenProvider ??
      new GoogleAuthTokenProvider({ keyFilePath: options.keyFilePath, scope: SHEETS_SCOPE, fetchImpl: this.fetchImpl });
  }

  // ---- low-level request helpers ------------------------------------------------

  private async request(path: string, init?: RequestInit): Promise<unknown> {
    const token = await this.tokenProvider.getToken();
    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}),
    };
    const res = await this.fetchImpl(`${API_ROOT}/${this.spreadsheetId}${path}`, { ...init, headers });
    const body: unknown = await res.json().catch(() => undefined);
    if (!res.ok) {
      throw new Error(`Google Sheets API error (HTTP ${res.status}) at ${path}: ${JSON.stringify(body)}`);
    }
    return body;
  }

  private async getValues(range: string): Promise<RawCell[][]> {
    const body = (await this.request(
      `/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`,
    )) as { values?: RawCell[][] };
    return body.values ?? [];
  }

  // ---- sheet + column resolution --------------------------------------------------

  private async getMeta(): Promise<SheetMeta[]> {
    if (this.metaCache !== undefined) return this.metaCache;
    const body = (await this.request('?fields=sheets.properties(sheetId,title)')) as {
      sheets?: { properties?: { sheetId?: number; title?: string } }[];
    };
    const sheets = (body.sheets ?? []).flatMap((s) => {
      const { sheetId, title } = s.properties ?? {};
      return sheetId !== undefined && title !== undefined ? [{ sheetId, title }] : [];
    });
    this.metaCache = sheets;
    return sheets;
  }

  private async resolveSheet(sheet: SheetName): Promise<SheetMeta> {
    const sheets = await this.getMeta();
    const byGid = sheet === 'Stores' ? sheets.find((s) => s.sheetId === STORES_GID) : undefined;
    const byTitle = sheets.find((s) => s.title.toLowerCase() === sheet.toLowerCase());
    const found = byGid ?? byTitle;
    if (found === undefined) {
      const available = sheets.map((s) => `"${s.title}" (gid ${s.sheetId})`).join(', ');
      throw new Error(`could not find a "${sheet}" tab in this spreadsheet. Tabs present: ${available || '(none)'}`);
    }
    return found;
  }

  private async getColumnMap(sheet: SheetName): Promise<ColumnMap> {
    const cached = this.columnMapCache.get(sheet);
    if (cached !== undefined) return cached;

    const { title, sheetId } = await this.resolveSheet(sheet);
    const headerRows = await this.getValues(`${quoteSheetTitle(title)}!1:1`);
    const header = (headerRows[0] ?? []).map((c) => (c === undefined || c === null ? '' : String(c)));

    const columns = columnsFor(sheet);
    const byKey = new Map<string, number>();
    for (let i = 0; i < columns.length; i += 1) {
      const col = columns[i]!;
      const actual = header[i] ?? '';
      if (actual !== col.header) {
        throw new Error(
          `Google Sheet header mismatch on "${title}": expected column ${columnLetter(i)} to be "${col.header}", found "${actual}". ` +
            `Refusing to guess — a shifted column would silently misfile data.`,
        );
      }
      byKey.set(col.key, i);
    }

    const map: ColumnMap = { title, sheetId, byKey };
    this.columnMapCache.set(sheet, map);
    return map;
  }

  private lastColumnLetter(sheet: SheetName): string {
    return columnLetter(columnsFor(sheet).length - 1);
  }

  // ---- row identity (slug) index --------------------------------------------------

  private rowKeyFor(sheet: SheetName, row: RawCell[], colMap: ColumnMap): string | undefined {
    const at = (key: string): RawCell => {
      const idx = colMap.byKey.get(key);
      return idx === undefined ? undefined : row[idx];
    };
    const name = rawToDisplayString(at('Name'), undefined);
    const city = rawToDisplayString(at('City'), undefined);
    if (name === '' || city === '') return undefined;
    if (sheet === 'Shows') {
      const startDate = rawToDisplayString(at('StartDate'), 'date');
      if (startDate === '') return undefined;
      return slugify(`${name}-${city}-${startDate}`);
    }
    return slugify(`${name}-${city}`);
  }

  /**
   * Loads (once) and thereafter incrementally maintains a row-key -> sheet
   * row number map, built by re-deriving each row's slug the same way the
   * bake scripts do. Stores also mirrors `dedupeSlugs`' collision suffixing
   * (`-2`, `-3`, ...); Shows/Resellers just drop a second row that computes
   * the same slug, matching `bake-resellers.ts`'s "duplicate slug dropped".
   *
   * LIMITATION: because identity is re-derived from content rather than
   * stored, a `rename` that changes `Name`/`City` makes the OLD row key
   * unresolvable in any process that (re)builds this index afterward — the
   * row's slug has genuinely changed. Within one process, the index already
   * built stays valid for the rest of that run (an `update`/`rename` never
   * rewrites this cache), matching how `InMemorySheetClient`/`JsonFileSheetClient`
   * key rows by a fixed string regardless of their contents. A rename is
   * always `risky` and therefore never auto-undone across a fresh process in
   * this engine, so this never bites the auto-apply/undo path — only a
   * human re-proposing a change against a since-renamed row would notice, and
   * the optimistic check (`checkCurrent`) would then correctly refuse it as
   * a row it can't find rather than misapplying anything.
   */
  private async getRowKeyIndex(sheet: SheetName): Promise<Map<string, number>> {
    const cached = this.rowKeyIndex.get(sheet);
    if (cached !== undefined) return cached;

    const colMap = await this.getColumnMap(sheet);
    const range = `${quoteSheetTitle(colMap.title)}!A2:${this.lastColumnLetter(sheet)}`;
    const rows = await this.getValues(range);

    const index = new Map<string, number>();
    const seenCount = new Map<string, number>();
    rows.forEach((row, i) => {
      const rowNumber = i + 2; // row 1 is the header
      const baseSlug = this.rowKeyFor(sheet, row, colMap);
      if (baseSlug === undefined) return;
      if (sheet === 'Stores') {
        const n = (seenCount.get(baseSlug) ?? 0) + 1;
        seenCount.set(baseSlug, n);
        index.set(n === 1 ? baseSlug : `${baseSlug}-${n}`, rowNumber);
      } else if (!index.has(baseSlug)) {
        index.set(baseSlug, rowNumber);
      }
    });

    this.rowKeyIndex.set(sheet, index);
    return index;
  }

  // ---- SheetClient ------------------------------------------------------------

  async getRow(sheet: SheetName, rowKey: string): Promise<SheetRow | undefined> {
    const [colMap, index] = await Promise.all([this.getColumnMap(sheet), this.getRowKeyIndex(sheet)]);
    const rowNumber = index.get(rowKey);
    if (rowNumber === undefined) return undefined;

    const lastCol = this.lastColumnLetter(sheet);
    const [row] = await this.getValues(`${quoteSheetTitle(colMap.title)}!A${rowNumber}:${lastCol}${rowNumber}`);
    const values = row ?? [];

    const columns = columnsFor(sheet);
    const result: SheetRow = {};
    for (const col of columns) {
      const idx = colMap.byKey.get(col.key);
      result[col.key] = idx === undefined ? null : rawToCellValue(values[idx], col.type);
    }
    return result;
  }

  async updateCell(sheet: SheetName, rowKey: string, column: string, value: CellValue): Promise<void> {
    const [colMap, index] = await Promise.all([this.getColumnMap(sheet), this.getRowKeyIndex(sheet)]);
    const rowNumber = index.get(rowKey);
    if (rowNumber === undefined) throw new Error(`row not found: ${sheet}/${rowKey}`);
    const colIdx = colMap.byKey.get(column);
    if (colIdx === undefined) throw new Error(`unknown column "${column}" for sheet ${sheet}`);

    const range = `${quoteSheetTitle(colMap.title)}!${columnLetter(colIdx)}${rowNumber}`;
    await this.request(`/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
      method: 'PUT',
      body: JSON.stringify({ range, majorDimension: 'ROWS', values: [[value]] }),
    });
  }

  async addRow(sheet: SheetName, rowKey: string, values: SheetRow): Promise<void> {
    const [colMap, index] = await Promise.all([this.getColumnMap(sheet), this.getRowKeyIndex(sheet)]);
    if (index.has(rowKey)) throw new Error(`row already exists: ${sheet}/${rowKey}`);

    const columns = columnsFor(sheet);
    const rowArray: CellValue[] = columns.map((col) => values[col.key] ?? '');
    const anchorRange = `${quoteSheetTitle(colMap.title)}!A1`;
    const body = (await this.request(
      `/values/${encodeURIComponent(anchorRange)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: JSON.stringify({ values: [rowArray] }) },
    )) as { updates?: { updatedRange?: string } };

    const updatedRange = body.updates?.updatedRange;
    const match = updatedRange !== undefined ? /![A-Z]+(\d+)/.exec(updatedRange) : null;
    const rowNumber = match !== null ? Number(match[1]) : undefined;
    if (rowNumber === undefined) {
      // The write happened; only OUR bookkeeping is now stale. Drop the
      // cached index so the next call rebuilds it from the sheet rather than
      // silently missing this row.
      this.rowKeyIndex.delete(sheet);
      return;
    }
    index.set(rowKey, rowNumber);
  }

  async deleteRow(sheet: SheetName, rowKey: string): Promise<void> {
    const [colMap, index] = await Promise.all([this.getColumnMap(sheet), this.getRowKeyIndex(sheet)]);
    const rowNumber = index.get(rowKey);
    if (rowNumber === undefined) throw new Error(`row not found: ${sheet}/${rowKey}`);

    await this.request('/:batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: { sheetId: colMap.sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber },
            },
          },
        ],
      }),
    });

    index.delete(rowKey);
    for (const [key, num] of index) {
      if (num > rowNumber) index.set(key, num - 1);
    }
  }

  async countRows(sheet: SheetName): Promise<number> {
    const index = await this.getRowKeyIndex(sheet);
    return index.size;
  }
}
