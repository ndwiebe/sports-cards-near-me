// Rosters tab -> src/data/rosters.json
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fetchSheetRowsByName } from '../src/lib/sheet';
import { rowToRosterEntry } from '../src/lib/rosters';
import { sanitizeText } from '../src/lib/transform';
import showsJson from '../src/data/shows.json';
import { log } from '../src/lib/log';

const SHEET_ID = '14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I';
const SHEET_NAME = 'Rosters';
const OUT = 'src/data/rosters.json';

const rows = await fetchSheetRowsByName(SHEET_ID, SHEET_NAME);
const mapped = rows.map((cells, i) => ({ cells, i, entry: rowToRosterEntry(cells) }));

for (const { cells, i, entry } of mapped) {
  if (entry === null) {
    const name = sanitizeText(cells[4]?.v);
    log.warn(`skipped row ${i}${name !== undefined ? ` (${name})` : ''}: missing required field(s)`);
  }
}

const entries = mapped.flatMap(({ entry }) => (entry !== null ? [entry] : []));

// A Show URL that joins no show (http vs https, www., typo) would silently orphan its rows.
const trim = (u: string): string => u.replace(/\/+$/, '');
const showUrls = new Set((showsJson as { website?: string; sourceUrl?: string }[]).flatMap((s) => [s.website, s.sourceUrl]).filter((u): u is string => typeof u === 'string').map(trim));
for (const url of new Set(entries.map((e) => e.show))) {
  if (!showUrls.has(trim(url))) log.warn(`Show URL joins no show: ${url}`);
}

// Count guard (bake:shows and bake:resellers have none — CLAUDE.md trap #1).
// A malformed tab must not silently strip every roster off every show page.
let previous = 0;
try {
  previous = (JSON.parse(await readFile(OUT, 'utf8')) as unknown[]).length;
} catch {
  previous = 0;
}
if (previous > 0 && entries.length < previous * 0.5) {
  throw new Error(`bake:rosters refused: ${entries.length} rows is under half the previous ${previous}`);
}

await mkdir('src/data', { recursive: true });
await writeFile(OUT, `${JSON.stringify(entries, null, 2)}\n`);
log.info(`baked ${entries.length} roster rows (${mapped.length - entries.length} skipped) → ${OUT}`);
