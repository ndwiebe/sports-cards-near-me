import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('stores.json contains at least one store with required fields', async () => {
  const raw = await readFile('data/stores.json', 'utf8');
  const data = JSON.parse(raw);
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0, 'expected at least one store');
  const store = data[0];
  for (const key of ['Store Name', 'City', 'Address', 'lat', 'lng']) {
    assert.ok(store[key] !== undefined, `missing field ${key}`);
  }
});
