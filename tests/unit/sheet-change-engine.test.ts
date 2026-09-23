import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySheetClient } from '../../src/lib/sheet-change-client';
import {
  classifyChange,
  shouldAutoApply,
  processChange,
  approveChange,
  rejectChange,
  undoChange,
  InMemoryChangeLog,
} from '../../src/lib/sheet-change-engine';
import type { ProposedChange } from '../../src/lib/sheet-change-engine';

describe('classifyChange', () => {
  it('classifies a refresh-ratings closure as closure', () => {
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'update', column: 'Status', oldValue: '', newValue: 'closed' },
      source: 'refresh-ratings.py',
      reason: 'Google businessStatus CLOSED_PERMANENTLY',
    };
    expect(classifyChange(change)).toBe('closure');
  });

  it('classifies a manual/unknown-source status change as risky, not closure', () => {
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'update', column: 'Status', oldValue: '', newValue: 'closed' },
      source: 'nathan-manual',
      reason: 'Nathan confirmed by phone',
    };
    expect(classifyChange(change)).toBe('risky');
  });

  it('classifies hours/rating/logo updates as low-risk', () => {
    for (const column of ['Hours', 'Rating', 'Logo']) {
      const change: ProposedChange = {
        sheet: 'Stores',
        rowKey: 'a-shop-edmonton',
        op: { kind: 'update', column, oldValue: null, newValue: 'new value' },
        source: 'refresh-ratings.py',
        reason: 'refresh',
      };
      expect(classifyChange(change)).toBe('low-risk');
    }
  });

  it('classifies a new show row from a trusted source as low-risk', () => {
    const change: ProposedChange = {
      sheet: 'Shows',
      rowKey: 'new-show-city-2026-12-01',
      op: { kind: 'add-row', values: { Name: 'New Show' } },
      source: 'tcdb',
      reason: 'discovered on TCDb',
    };
    expect(classifyChange(change)).toBe('low-risk');
  });

  it('classifies a new row from an untrusted source as risky', () => {
    const change: ProposedChange = {
      sheet: 'Shows',
      rowKey: 'new-show-city-2026-12-01',
      op: { kind: 'add-row', values: { Name: 'New Show' } },
      source: 'random-facebook-post',
      reason: 'saw it mentioned',
    };
    expect(classifyChange(change)).toBe('risky');
  });

  it('classifies delete, merge and rename as risky regardless of source', () => {
    const del: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'dup-shop',
      op: { kind: 'delete-row', snapshot: { Name: 'Dup' } },
      source: 'tcdb',
      reason: 'duplicate',
    };
    const merge: ProposedChange = {
      sheet: 'Shows',
      rowKey: 'dup-show',
      op: { kind: 'merge', keepRowKey: 'surviving-show', snapshot: { Name: 'Dup Show' } },
      source: 'tcdb',
      reason: 'day 2 of a multi-day event',
    };
    const rename: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'old-slug',
      op: { kind: 'rename', column: 'Name', oldValue: 'Old Name', newValue: 'New Name', oldSlug: 'old-slug', newSlug: 'new-slug' },
      source: 'tcdb',
      reason: 'business renamed',
    };
    expect(classifyChange(del)).toBe('risky');
    expect(classifyChange(merge)).toBe('risky');
    expect(classifyChange(rename)).toBe('risky');
  });

  it('defaults to risky for an unrecognized column update', () => {
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'update', column: 'Address', oldValue: 'old', newValue: 'new' },
      source: 'refresh-ratings.py',
      reason: 'address correction',
    };
    expect(classifyChange(change)).toBe('risky');
  });
});

describe('shouldAutoApply', () => {
  it('never auto-applies in review-all mode, including closure', () => {
    expect(shouldAutoApply('low-risk', 'review-all')).toBe(false);
    expect(shouldAutoApply('closure', 'review-all')).toBe(false);
    expect(shouldAutoApply('risky', 'review-all')).toBe(false);
  });

  it('auto-applies low-risk and closure, not risky, in auto-low-risk mode', () => {
    expect(shouldAutoApply('low-risk', 'auto-low-risk')).toBe(true);
    expect(shouldAutoApply('closure', 'auto-low-risk')).toBe(true);
    expect(shouldAutoApply('risky', 'auto-low-risk')).toBe(false);
  });
});

describe('processChange', () => {
  let client: InMemorySheetClient;
  let log: InMemoryChangeLog;

  beforeEach(() => {
    client = new InMemorySheetClient({
      Stores: { 'a-shop-edmonton': { Name: 'A Shop', City: 'Edmonton', Hours: 'old hours', Status: '' } },
      Shows: { 'existing-show-2026-10-01': { Name: 'Existing Show' } },
    });
    log = new InMemoryChangeLog();
  });

  it('queues everything in review-all mode, even low-risk', async () => {
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'update', column: 'Hours', oldValue: 'old hours', newValue: 'new hours' },
      source: 'refresh-ratings.py',
      reason: 'refresh',
    };
    const result = await processChange(client, log, change, 'review-all');
    expect(result.outcome).toBe('queued');
    expect((await client.getRow('Stores', 'a-shop-edmonton'))?.Hours).toBe('old hours'); // untouched
    const entries = await log.readAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe('queued');
  });

  it('auto-applies a low-risk change in auto-low-risk mode', async () => {
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'update', column: 'Hours', oldValue: 'old hours', newValue: 'new hours' },
      source: 'refresh-ratings.py',
      reason: 'refresh',
    };
    const result = await processChange(client, log, change, 'auto-low-risk');
    expect(result.outcome).toBe('applied');
    expect((await client.getRow('Stores', 'a-shop-edmonton'))?.Hours).toBe('new hours');
  });

  it('auto-applies a closure in auto-low-risk mode', async () => {
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'update', column: 'Status', oldValue: '', newValue: 'closed' },
      source: 'refresh-ratings.py',
      reason: 'Google businessStatus CLOSED_PERMANENTLY',
    };
    const result = await processChange(client, log, change, 'auto-low-risk');
    expect(result.outcome).toBe('applied');
    expect((await client.getRow('Stores', 'a-shop-edmonton'))?.Status).toBe('closed');
  });

  it('queues a risky change even in auto-low-risk mode', async () => {
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'delete-row', snapshot: { Name: 'A Shop', City: 'Edmonton', Hours: 'old hours', Status: '' } },
      source: 'tcdb',
      reason: 'duplicate listing',
    };
    const result = await processChange(client, log, change, 'auto-low-risk');
    expect(result.outcome).toBe('queued');
    expect(await client.countRows('Stores')).toBe(1); // untouched
  });

  it('aborts on optimistic-check mismatch and never writes', async () => {
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'update', column: 'Hours', oldValue: 'STALE VALUE', newValue: 'new hours' },
      source: 'refresh-ratings.py',
      reason: 'refresh',
    };
    const result = await processChange(client, log, change, 'auto-low-risk');
    expect(result.outcome).toBe('rejected');
    expect(result.reason).toMatch(/changed since/i);
    expect((await client.getRow('Stores', 'a-shop-edmonton'))?.Hours).toBe('old hours');
  });

  it('aborts an add-row when the row already exists (optimistic check)', async () => {
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'add-row', values: { Name: 'Duplicate' } },
      source: 'tcdb',
      reason: 'new listing',
    };
    const result = await processChange(client, log, change, 'auto-low-risk');
    expect(result.outcome).toBe('rejected');
  });

  it('aborts a delete that would shrink the dataset past the guard floor', async () => {
    // A single-row Stores sheet: deleting its only row is a 100% drop, well past
    // the 50% default floor -- the guard should refuse it even though the
    // optimistic check on the snapshot passes.
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'delete-row', snapshot: { Name: 'A Shop', City: 'Edmonton', Hours: 'old hours', Status: '' } },
      source: 'tcdb',
      reason: 'duplicate listing',
    };
    // Approve path (risky changes only ever apply via approve) exercises the same guard.
    await processChange(client, log, change, 'review-all');
    const entries = await log.readAll();
    const id = entries[0]!.id;
    const result = await approveChange(client, log, id);
    expect(result.outcome).toBe('rejected');
    expect(result.reason).toMatch(/drop/i);
    expect(await client.countRows('Stores')).toBe(1);
  });
});

describe('approveChange / rejectChange', () => {
  let client: InMemorySheetClient;
  let log: InMemoryChangeLog;
  let queuedId: string;

  beforeEach(async () => {
    client = new InMemorySheetClient({
      Stores: {
        'a-shop-edmonton': { Name: 'A Shop', City: 'Edmonton', Status: '' },
        'b-shop-calgary': { Name: 'B Shop', City: 'Calgary', Status: '' },
      },
    });
    log = new InMemoryChangeLog();
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'delete-row', snapshot: { Name: 'A Shop', City: 'Edmonton', Status: '' } },
      source: 'tcdb',
      reason: 'duplicate of b-shop-calgary',
    };
    const result = await processChange(client, log, change, 'review-all');
    queuedId = result.id;
  });

  it('approve applies the queued change', async () => {
    const result = await approveChange(client, log, queuedId);
    expect(result.outcome).toBe('applied');
    expect(await client.getRow('Stores', 'a-shop-edmonton')).toBeUndefined();
  });

  it('reject never writes to the sheet', async () => {
    const result = await rejectChange(log, queuedId, 'not actually a duplicate');
    expect(result.outcome).toBe('rejected');
    expect(await client.getRow('Stores', 'a-shop-edmonton')).toBeDefined();
  });

  it('approve refuses an unknown id', async () => {
    await expect(approveChange(client, log, 'nope')).rejects.toThrow(/not found/i);
  });

  it('approve refuses a change that was already rejected', async () => {
    await rejectChange(log, queuedId, 'no');
    await expect(approveChange(client, log, queuedId)).rejects.toThrow(/already/i);
  });
});

describe('undoChange', () => {
  let client: InMemorySheetClient;
  let log: InMemoryChangeLog;

  beforeEach(() => {
    client = new InMemorySheetClient({
      Stores: { 'a-shop-edmonton': { Name: 'A Shop', City: 'Edmonton', Hours: 'old hours', Status: '' } },
    });
    log = new InMemoryChangeLog();
  });

  it('undoes an applied update (swaps old/new back)', async () => {
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'update', column: 'Hours', oldValue: 'old hours', newValue: 'new hours' },
      source: 'refresh-ratings.py',
      reason: 'refresh',
    };
    const applied = await processChange(client, log, change, 'auto-low-risk');
    expect((await client.getRow('Stores', 'a-shop-edmonton'))?.Hours).toBe('new hours');

    const undone = await undoChange(client, log, applied.id);
    expect(undone.outcome).toBe('undone');
    expect((await client.getRow('Stores', 'a-shop-edmonton'))?.Hours).toBe('old hours');
  });

  it('undoes an applied closure (status back to open)', async () => {
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'update', column: 'Status', oldValue: '', newValue: 'closed' },
      source: 'refresh-ratings.py',
      reason: 'Google businessStatus CLOSED_PERMANENTLY',
    };
    const applied = await processChange(client, log, change, 'auto-low-risk');
    const undone = await undoChange(client, log, applied.id);
    expect(undone.outcome).toBe('undone');
    expect((await client.getRow('Stores', 'a-shop-edmonton'))?.Status).toBe('');
  });

  it('undoes an applied add-row by deleting it', async () => {
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'new-shop-edmonton',
      op: { kind: 'add-row', values: { Name: 'New Shop', City: 'Edmonton' } },
      source: 'tcdb',
      reason: 'new listing',
    };
    const applied = await processChange(client, log, change, 'auto-low-risk');
    expect(applied.outcome).toBe('applied');
    const undone = await undoChange(client, log, applied.id);
    expect(undone.outcome).toBe('undone');
    expect(await client.getRow('Stores', 'new-shop-edmonton')).toBeUndefined();
  });

  it('undoes an applied delete-row by restoring the snapshot', async () => {
    client = new InMemorySheetClient({
      Stores: {
        'a-shop-edmonton': { Name: 'A Shop', City: 'Edmonton', Status: '' },
        'b-shop-calgary': { Name: 'B Shop', City: 'Calgary', Status: '' },
      },
    });
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'delete-row', snapshot: { Name: 'A Shop', City: 'Edmonton', Status: '' } },
      source: 'tcdb',
      reason: 'duplicate',
    };
    const applied = await processChange(client, log, change, 'review-all');
    const approveResult = await approveChange(client, log, applied.id);
    expect(await client.getRow('Stores', 'a-shop-edmonton')).toBeUndefined();

    const undone = await undoChange(client, log, approveResult.id);
    expect(undone.outcome).toBe('undone');
    expect(await client.getRow('Stores', 'a-shop-edmonton')).toMatchObject({ Name: 'A Shop' });
  });

  it('refuses to undo an id that was never applied', async () => {
    await expect(undoChange(client, log, 'nope')).rejects.toThrow(/not found|not applied/i);
  });

  it('refuses to undo a change that was already undone', async () => {
    const change: ProposedChange = {
      sheet: 'Stores',
      rowKey: 'a-shop-edmonton',
      op: { kind: 'update', column: 'Hours', oldValue: 'old hours', newValue: 'new hours' },
      source: 'refresh-ratings.py',
      reason: 'refresh',
    };
    const applied = await processChange(client, log, change, 'auto-low-risk');
    await undoChange(client, log, applied.id);
    await expect(undoChange(client, log, applied.id)).rejects.toThrow(/already undone/i);
  });
});
