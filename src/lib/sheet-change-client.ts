import { readFile, writeFile } from 'node:fs/promises';

/** A single sheet cell value, as the sheet-change engine sees it. */
export type CellValue = string | number | null;

export type SheetName = 'Stores' | 'Shows' | 'Resellers';

export type SheetRow = Record<string, CellValue>;

/** One tab's rows, keyed by row key (the same `slug` the bake scripts derive). */
export type SheetState = Record<SheetName, Record<string, SheetRow>>;

/**
 * What the sheet-change engine needs from "the sheet", kept deliberately narrow
 * so a real client only has to implement five methods. There is NO
 * network-backed implementation of this interface anywhere in this repo — see
 * the plan doc (`docs/superpowers/plans/2026-09-23-q4-sheet-automation.md`, §6)
 * for what a live one would need (a service account with edit access, pointed
 * at a COPY of the sheet first) and why it isn't built here.
 */
export interface SheetClient {
  getRow(sheet: SheetName, rowKey: string): Promise<SheetRow | undefined>;
  updateCell(sheet: SheetName, rowKey: string, column: string, value: CellValue): Promise<void>;
  addRow(sheet: SheetName, rowKey: string, values: SheetRow): Promise<void>;
  deleteRow(sheet: SheetName, rowKey: string): Promise<void>;
  countRows(sheet: SheetName): Promise<number>;
}

function emptySheetState(): SheetState {
  return { Stores: {}, Shows: {}, Resellers: {} };
}

/**
 * In-process, no I/O. Used by unit tests so the engine's logic is exercised
 * without ever touching a filesystem or network.
 */
export class InMemorySheetClient implements SheetClient {
  private state: SheetState;

  constructor(initial: Partial<SheetState> = {}) {
    this.state = { ...emptySheetState(), ...initial };
  }

  getRow(sheet: SheetName, rowKey: string): Promise<SheetRow | undefined> {
    return Promise.resolve(this.state[sheet][rowKey]);
  }

  updateCell(sheet: SheetName, rowKey: string, column: string, value: CellValue): Promise<void> {
    const row = this.state[sheet][rowKey];
    if (row === undefined) return Promise.reject(new Error(`row not found: ${sheet}/${rowKey}`));
    row[column] = value;
    return Promise.resolve();
  }

  addRow(sheet: SheetName, rowKey: string, values: SheetRow): Promise<void> {
    if (this.state[sheet][rowKey] !== undefined) {
      return Promise.reject(new Error(`row already exists: ${sheet}/${rowKey}`));
    }
    this.state[sheet][rowKey] = { ...values };
    return Promise.resolve();
  }

  deleteRow(sheet: SheetName, rowKey: string): Promise<void> {
    if (this.state[sheet][rowKey] === undefined) {
      return Promise.reject(new Error(`row not found: ${sheet}/${rowKey}`));
    }
    delete this.state[sheet][rowKey];
    return Promise.resolve();
  }

  countRows(sheet: SheetName): Promise<number> {
    return Promise.resolve(Object.keys(this.state[sheet]).length);
  }
}

/**
 * File-backed, for CLI dry runs against `scripts/fixtures/sheet-state.sample.json`
 * (or any local copy). Reads and writes ONLY the local JSON file passed to
 * `open()` — this is how "test against a mocked sheet client" is satisfied for
 * the CLI path without any live Google API involvement. Never point this at
 * anything other than a local file.
 */
export class JsonFileSheetClient implements SheetClient {
  private constructor(
    private readonly path: string,
    private state: SheetState,
  ) {}

  static async open(path: string): Promise<JsonFileSheetClient> {
    const raw = await readFile(path, 'utf8');
    const state = { ...emptySheetState(), ...(JSON.parse(raw) as Partial<SheetState>) };
    return new JsonFileSheetClient(path, state);
  }

  private async persist(): Promise<void> {
    await writeFile(this.path, `${JSON.stringify(this.state, null, 2)}\n`);
  }

  getRow(sheet: SheetName, rowKey: string): Promise<SheetRow | undefined> {
    return Promise.resolve(this.state[sheet][rowKey]);
  }

  async updateCell(sheet: SheetName, rowKey: string, column: string, value: CellValue): Promise<void> {
    const row = this.state[sheet][rowKey];
    if (row === undefined) throw new Error(`row not found: ${sheet}/${rowKey}`);
    row[column] = value;
    await this.persist();
  }

  async addRow(sheet: SheetName, rowKey: string, values: SheetRow): Promise<void> {
    if (this.state[sheet][rowKey] !== undefined) throw new Error(`row already exists: ${sheet}/${rowKey}`);
    this.state[sheet][rowKey] = { ...values };
    await this.persist();
  }

  async deleteRow(sheet: SheetName, rowKey: string): Promise<void> {
    if (this.state[sheet][rowKey] === undefined) throw new Error(`row not found: ${sheet}/${rowKey}`);
    delete this.state[sheet][rowKey];
    await this.persist();
  }

  countRows(sheet: SheetName): Promise<number> {
    return Promise.resolve(Object.keys(this.state[sheet]).length);
  }
}
