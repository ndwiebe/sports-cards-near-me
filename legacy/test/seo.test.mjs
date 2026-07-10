import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('index.html includes canonical and social meta tags', async () => {
  const html = await readFile('index.html', 'utf8');
  assert.match(html, /<link rel="canonical" href="https:\/\/sportscardsnearme\.ca\/"/);
  assert.match(html, /<meta property="og:title"/);
  assert.match(html, /<meta name="twitter:card"/);
});

