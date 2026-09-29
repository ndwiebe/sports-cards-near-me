import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fetchSheetRowsByName } from '../src/lib/sheet';
import { rowToShow } from '../src/lib/shows';
import { sanitizeText } from '../src/lib/transform';
import { assertNoUnexpectedShrink } from '../src/lib/dataset-guard';
import { log } from '../src/lib/log';
import type { ShowRecord } from '../src/lib/shows';

const SHEET_ID = '14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I';
const SHEET_NAME = 'Shows';
const OUT = 'src/data/shows.json';

async function previousCount(): Promise<number | null> {
  try {
    return (JSON.parse(await readFile(OUT, 'utf8')) as ShowRecord[]).length;
  } catch {
    return null;
  }
}

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

// No absolute floor here (unlike stores) — shows legitimately drop to zero
// when the sheet has no upcoming/verified entries yet. `assertNoUnexpectedShrink`
// only compares against a previous non-zero run, so it catches a sheet read
// going sideways (wrong tab, truncated response) without policing a real
// editorial change or a legitimate empty-start state. See dataset-guard.ts.
assertNoUnexpectedShrink('shows', shows.length, await previousCount());

await mkdir('src/data', { recursive: true });
await writeFile(OUT, `${JSON.stringify(shows, null, 2)}\n`);
log.info(`baked ${shows.length} shows (${skipped} rows skipped) → ${OUT}`);
