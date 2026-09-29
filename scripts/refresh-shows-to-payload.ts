#!/usr/bin/env -S npx tsx
/**
 * Converts a `refresh-shows.py` payload CSV
 * (`docs/research/<date>-show-refresh-payload.csv`) into a JSON array of
 * `ProposedChange` objects that `scripts/sheet-change-engine.ts process` can
 * consume directly, per the 2026-09-26 decision ("SCNM: newly found shows
 * post automatically"):
 *
 *   - NEW -> add-row.
 *   - CHANGED -> update op(s) on the matching existing show's changed fields.
 *   - REVIEW-MULTIDAY -> an EndDate/StartDate-extending update when matched
 *     to an existing show, held otherwise.
 *   - REVIEW-IDENTITY -> always held, never a change.
 *
 * `source` defaults to `refresh-shows.py` (or `tcdb` via `--source`) so the
 * engine's `show-autopost` policy recognizes these -- see
 * `src/lib/sheet-change-engine.ts` and `src/lib/refresh-shows-payload.ts` for
 * the full reasoning.
 *
 * CHANGED/REVIEW-MULTIDAY matching needs to know what's already on the
 * sheet: this reads the committed `src/data/shows.json` (the very snapshot
 * `refresh-shows.py` itself matched against when it produced the CSV's
 * `_status` column), not the live sheet -- see `ExistingShow` in
 * `src/lib/refresh-shows-payload.ts`.
 *
 * Usage:
 *   npx tsx scripts/refresh-shows-to-payload.ts <payload.csv> --out <payload.json> \
 *     [--held-out <held.json>] [--source refresh-shows.py] [--shows-json src/data/shows.json]
 *
 * Writes `[]` (not an error) when the CSV has zero rows that produce a
 * change -- "nothing to do this week" is a legitimate, common outcome, not a
 * failure. `--held-out` is optional; when omitted, held items are only
 * logged, not written anywhere (existing callers that don't pass it keep
 * working unchanged).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { refreshShowRowsToProposedChanges, parseRefreshShowsCsv } from '../src/lib/refresh-shows-payload';
import type { ExistingShow } from '../src/lib/refresh-shows-payload';
import { log } from '../src/lib/log';

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}

async function loadExistingShows(path: string): Promise<ExistingShow[]> {
  const raw = JSON.parse(await readFile(path, 'utf8')) as unknown;
  if (!Array.isArray(raw)) throw new Error(`${path}: expected a JSON array of shows`);
  return raw as ExistingShow[];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const csvPath = args[0];
  if (csvPath === undefined || csvPath.startsWith('--')) {
    throw new Error(
      'usage: refresh-shows-to-payload.ts <payload.csv> --out <payload.json> [--held-out <held.json>] ' +
        '[--source refresh-shows.py] [--shows-json src/data/shows.json]',
    );
  }
  const outPath = flag(args, '--out');
  if (outPath === undefined) throw new Error('--out <payload.json> is required');
  const heldOutPath = flag(args, '--held-out');
  const source = flag(args, '--source') ?? 'refresh-shows.py';
  const showsJsonPath = flag(args, '--shows-json') ?? 'src/data/shows.json';

  const [csv, existingShows] = await Promise.all([readFile(csvPath, 'utf8'), loadExistingShows(showsJsonPath)]);
  const rows = parseRefreshShowsCsv(csv);
  const { changes, held, skipped } = refreshShowRowsToProposedChanges(rows, source, existingShows);

  await writeFile(outPath, `${JSON.stringify(changes, null, 2)}\n`);
  log.info(`${rows.length} row(s) read from ${csvPath}; ${changes.length} change(s) written to ${outPath}`);
  if (heldOutPath !== undefined) {
    await writeFile(heldOutPath, `${JSON.stringify(held, null, 2)}\n`);
    log.info(`${held.length} held item(s) written to ${heldOutPath}`);
  } else if (held.length > 0) {
    log.info(`${held.length} row(s) held for a closer look (no --held-out given, so not written to a file):`);
    for (const h of held) log.info(`  ${h.row.name || '(no name)'} / ${h.row.city || '(no city)'} — ${h.reason}`);
  }
  if (skipped.length > 0) {
    log.warn(`${skipped.length} row(s) skipped (missing a required field):`);
    for (const s of skipped) log.warn(`  ${s.row.name || '(no name)'} / ${s.row.city || '(no city)'} — ${s.reason}`);
  }
}

await main();
