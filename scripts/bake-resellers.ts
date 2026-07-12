import { mkdir, writeFile } from 'node:fs/promises';
import { fetchSheetRowsByName } from '../src/lib/sheet';
import { rowToReseller } from '../src/lib/resellers';
import { sanitizeText } from '../src/lib/transform';
import { log } from '../src/lib/log';

const SHEET_ID = '14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I';
const SHEET_NAME = 'Resellers';
const OUT = 'src/data/resellers.json';

const rows = await fetchSheetRowsByName(SHEET_ID, SHEET_NAME);
const mapped = rows.map((cells, i) => ({ cells, i, reseller: rowToReseller(cells) }));

for (const { cells, i, reseller } of mapped) {
  if (reseller === null) {
    const name = sanitizeText(cells[0]?.v);
    log.warn(`skipped row ${i}${name !== undefined ? ` (${name})` : ''}: not Verified or missing required field(s)`);
  }
}

const seen = new Set<string>();
const resellers = mapped
  .flatMap(({ reseller }) => (reseller !== null ? [reseller] : []))
  .filter((r) => {
    if (seen.has(r.slug)) {
      log.warn(`duplicate slug dropped: ${r.slug}`);
      return false;
    }
    seen.add(r.slug);
    return true;
  })
  .sort((a, b) => a.province.localeCompare(b.province) || a.name.localeCompare(b.name));

// NO count guard — zero verified resellers is the designed launch state.
await mkdir('src/data', { recursive: true });
await writeFile(OUT, JSON.stringify(resellers, null, 2) + '\n');
log.info(`baked ${resellers.length} resellers → ${OUT}`);
log.info(`skipped ${mapped.length - resellers.length} rows`);
