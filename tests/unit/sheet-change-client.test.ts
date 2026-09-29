import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InMemorySheetClient, JsonFileSheetClient } from '../../src/lib/sheet-change-client';
import type { SheetClient } from '../../src/lib/sheet-change-client';

/** Same contract, run against both implementations, so neither drifts from the other. */
function sheetClientContract(makeClient: () => Promise<SheetClient>): void {
  it('reads a row that exists and undefined for one that does not', async () => {
    const client = await makeClient();
    expect(await client.getRow('Stores', 'a-shop-edmonton')).toMatchObject({ Name: 'A Shop', Status: '' });
    expect(await client.getRow('Stores', 'nope')).toBeUndefined();
  });

  it('updates a cell', async () => {
    const client = await makeClient();
    await client.updateCell('Stores', 'a-shop-edmonton', 'Status', 'closed');
    expect(await client.getRow('Stores', 'a-shop-edmonton')).toMatchObject({ Status: 'closed' });
  });

  it('adds a row and counts it', async () => {
    const client = await makeClient();
    const before = await client.countRows('Shows');
    await client.addRow('Shows', 'new-show-city-2026-12-01', { Name: 'New Show', City: 'City' });
    expect(await client.countRows('Shows')).toBe(before + 1);
    expect(await client.getRow('Shows', 'new-show-city-2026-12-01')).toMatchObject({ Name: 'New Show' });
  });

  it('refuses to add a row that already exists', async () => {
    const client = await makeClient();
    await expect(client.addRow('Stores', 'a-shop-edmonton', { Name: 'Dup' })).rejects.toThrow(/already exists/);
  });

  it('deletes a row and counts it', async () => {
    const client = await makeClient();
    const before = await client.countRows('Stores');
    await client.deleteRow('Stores', 'a-shop-edmonton');
    expect(await client.countRows('Stores')).toBe(before - 1);
    expect(await client.getRow('Stores', 'a-shop-edmonton')).toBeUndefined();
  });

  it('refuses to delete a row that does not exist', async () => {
    const client = await makeClient();
    await expect(client.deleteRow('Stores', 'nope')).rejects.toThrow(/not found/);
  });

  it('refuses to update a column on a row that does not exist', async () => {
    const client = await makeClient();
    await expect(client.updateCell('Stores', 'nope', 'Status', 'closed')).rejects.toThrow(/not found/);
  });
}

const FIXTURE = {
  Stores: {
    'a-shop-edmonton': { Name: 'A Shop', City: 'Edmonton', Status: '' },
    'b-shop-calgary': { Name: 'B Shop', City: 'Calgary', Status: '' },
  },
  Shows: {
    'existing-show-ottawa-2026-10-01': { Name: 'Existing Show', City: 'Ottawa' },
  },
};

describe('InMemorySheetClient', () => {
  sheetClientContract(() => Promise.resolve(new InMemorySheetClient(structuredClone(FIXTURE))));
});

describe('JsonFileSheetClient', () => {
  let dir: string;
  let path: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'scnm-sheet-client-'));
    path = join(dir, 'sheet-state.json');
    await import('node:fs/promises').then((fs) => fs.writeFile(path, JSON.stringify(FIXTURE, null, 2)));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  sheetClientContract(() => JsonFileSheetClient.open(path));

  it('persists writes to disk', async () => {
    const client = await JsonFileSheetClient.open(path);
    await client.updateCell('Stores', 'a-shop-edmonton', 'Status', 'closed');
    const onDisk = JSON.parse(await readFile(path, 'utf8'));
    expect(onDisk.Stores['a-shop-edmonton'].Status).toBe('closed');
  });
});
