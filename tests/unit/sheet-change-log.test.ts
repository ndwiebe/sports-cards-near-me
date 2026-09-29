import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonlChangeLog } from '../../src/lib/sheet-change-engine';
import type { ChangeLogEntry } from '../../src/lib/sheet-change-engine';

const entry = (over: Partial<ChangeLogEntry> = {}): ChangeLogEntry => ({
  id: '11111111-1111-1111-1111-111111111111',
  timestamp: '2026-09-23T00:00:00.000Z',
  action: 'queued',
  change: {
    sheet: 'Stores',
    rowKey: 'a-shop-edmonton',
    op: { kind: 'update', column: 'Hours', oldValue: 'old', newValue: 'new' },
    source: 'refresh-ratings.py',
    reason: 'refresh',
  },
  level: 'low-risk',
  ...over,
});

describe('JsonlChangeLog', () => {
  let dir: string;
  let path: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'scnm-change-log-'));
    path = join(dir, 'sheet-changes.jsonl');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns an empty array when the file does not exist yet', async () => {
    const log = new JsonlChangeLog(path);
    expect(await log.readAll()).toEqual([]);
  });

  it('appends entries as one JSON object per line and reads them back in order', async () => {
    const log = new JsonlChangeLog(path);
    await log.append(entry({ id: 'a' }));
    await log.append(entry({ id: 'b', action: 'applied' }));
    const entries = await log.readAll();
    expect(entries.map((e) => e.id)).toEqual(['a', 'b']);
    expect(entries[1]?.action).toBe('applied');
  });

  it('never rewrites existing lines -- a fresh log instance on the same path sees prior appends', async () => {
    await new JsonlChangeLog(path).append(entry({ id: 'a' }));
    const second = new JsonlChangeLog(path);
    await second.append(entry({ id: 'b' }));
    expect((await new JsonlChangeLog(path).readAll()).map((e) => e.id)).toEqual(['a', 'b']);
  });
});
