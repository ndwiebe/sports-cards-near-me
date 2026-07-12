import { mkdir, writeFile } from 'node:fs/promises';
import { fetchSheetRowsByName } from '../src/lib/sheet';
import { rowToShow } from '../src/lib/shows';
import { log } from '../src/lib/log';
import type { ShowRecord } from '../src/lib/shows';

const SHEET_ID = '14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I';
const SHEET_NAME = 'Shows';
const OUT = 'src/data/shows.json';

const rows = await fetchSheetRowsByName(SHEET_ID, SHEET_NAME);
const mapped = rows.map(rowToShow);
const skipped = mapped.filter((s) => s === null).length;
const shows = mapped
  .filter((s): s is ShowRecord => s !== null)
  .sort((a, b) => a.startDate.localeCompare(b.startDate));

// NO count guard here (unlike stores) — shows legitimately drop to zero
// when the sheet has no upcoming/verified entries yet.

await mkdir('src/data', { recursive: true });
await writeFile(OUT, `${JSON.stringify(shows, null, 2)}\n`);
log.info(`baked ${shows.length} shows (${skipped} rows skipped) → ${OUT}`);
