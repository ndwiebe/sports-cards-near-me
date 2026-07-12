import { mkdir, writeFile } from 'node:fs/promises';
import { fetchSheetRowsByName } from '../src/lib/sheet';
import { rowToShow } from '../src/lib/shows';
import { sanitizeText } from '../src/lib/transform';
import { log } from '../src/lib/log';

const SHEET_ID = '14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I';
const SHEET_NAME = 'Shows';
const OUT = 'src/data/shows.json';

const rows = await fetchSheetRowsByName(SHEET_ID, SHEET_NAME);
const mapped = rows.map((cells, i) => ({ cells, i, show: rowToShow(cells) }));

for (const { cells, i, show } of mapped) {
  if (show === null) {
    const name = sanitizeText(cells[0]?.v);
    log.warn(`skipped row ${i}${name !== undefined ? ` (${name})` : ''}: missing required field(s)`);
  }
}

const skipped = mapped.filter(({ show }) => show === null).length;
const shows = mapped
  .flatMap(({ show }) => (show !== null ? [show] : []))
  .sort((a, b) => a.startDate.localeCompare(b.startDate));

// NO count guard here (unlike stores) — shows legitimately drop to zero
// when the sheet has no upcoming/verified entries yet.

await mkdir('src/data', { recursive: true });
await writeFile(OUT, `${JSON.stringify(shows, null, 2)}\n`);
log.info(`baked ${shows.length} shows (${skipped} rows skipped) → ${OUT}`);
