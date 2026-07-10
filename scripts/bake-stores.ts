import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fetchSheetRows } from '../src/lib/sheet';
import { rowToStore, dedupeSlugs, assertCountSane } from '../src/lib/stores-build';
import { log } from '../src/lib/log';
import type { Store } from '../src/lib/types';

const SHEET_ID = '14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I';
const GID = '1588938698';
const OUT = 'src/data/stores.json';

async function previousCount(): Promise<number | null> {
  try {
    const prev = JSON.parse(await readFile(OUT, 'utf8')) as Store[];
    return prev.length;
  } catch {
    return null;
  }
}

const rows = await fetchSheetRows(SHEET_ID, GID);
const mapped = rows.map(rowToStore);
const skipped = mapped.filter((s) => s === null).length;
const stores = dedupeSlugs(mapped.filter((s): s is Store => s !== null)).sort(
  (a, b) =>
    a.province.localeCompare(b.province) ||
    a.citySlug.localeCompare(b.citySlug) ||
    a.slug.localeCompare(b.slug),
);

assertCountSane(stores.length, await previousCount());

await mkdir('src/data', { recursive: true });
await writeFile(OUT, `${JSON.stringify(stores, null, 2)}\n`);
log.info(`baked ${stores.length} stores (${skipped} rows skipped) → ${OUT}`);
