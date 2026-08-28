import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fetchSheetRows } from '../src/lib/sheet';
import { rowToStore, dedupeSlugs, assertCountSane, splitStores } from '../src/lib/stores-build';
import { log } from '../src/lib/log';
import type { Store } from '../src/lib/types';

const SHEET_ID = '14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I';
const GID = '1588938698';
const OUT = 'src/data/stores.json';
// Unlisted shops (closed OR online-only) live in their own file rather than carrying
// a flag inside stores.json. 30-odd pages, guides and helpers import stores.json to
// build listings, counts, maps and the sitemap; filtering at each of those is a
// correctness problem you only find out about when an unlisted shop shows up in
// someone's city. Splitting at the bake means every one of those consumers excludes
// unlisted shops with no code change at all. The store page reads BOTH, so an
// unlisted shop keeps its URL and gets a banner — worded for its actual status.
const OUT_CLOSED = 'src/data/stores-closed.json';

// Previous TOTAL, not previous listed count. assertCountSane runs before the closed
// split, so it must compare like with like — reading only stores.json would compare
// this run's total against last run's open-only figure, and every closure marked would
// quietly raise the floor the guard is measured against.
async function previousCount(): Promise<number | null> {
  const count = async (path: string): Promise<number | null> => {
    try {
      return (JSON.parse(await readFile(path, 'utf8')) as Store[]).length;
    } catch {
      return null;
    }
  };
  const open = await count(OUT);
  if (open === null) return null;
  return open + (await count(OUT_CLOSED) ?? 0);
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

// Guard on the TOTAL parsed count, before the closed split. This guard exists to catch
// a malformed sheet, and marking shops closed is a legitimate reason for the listed
// count to fall — running it on the post-split number would make a real closure batch
// look like sheet breakage, and a genuinely broken sheet look smaller than it is.
assertCountSane(stores.length, await previousCount());

const { open, closed } = splitStores(stores);

await mkdir('src/data', { recursive: true });
await writeFile(OUT, `${JSON.stringify(open, null, 2)}\n`);
await writeFile(OUT_CLOSED, `${JSON.stringify(closed, null, 2)}\n`);
log.info(`baked ${open.length} stores (${skipped} rows skipped) → ${OUT}`);
log.info(`  ${closed.length} unlisted (closed or online-only) → ${OUT_CLOSED} (kept as pages, excluded from every listing)`);
