#!/usr/bin/env -S npx tsx
/**
 * Converts a `refresh-shows.py` payload CSV
 * (`docs/research/<date>-show-refresh-payload.csv`) into a JSON array of
 * `ProposedChange` objects that `scripts/sheet-change-engine.ts process` can
 * consume directly. Only NEW show rows are converted, with `source` set to
 * `refresh-shows.py` (or `tcdb` via `--source`) so the engine classifies them
 * as `low-risk` -- see `src/lib/refresh-shows-payload.ts` for the full
 * reasoning and `docs/superpowers/plans/2026-09-23-q4-sheet-automation.md` §3.
 *
 * Usage:
 *   npx tsx scripts/refresh-shows-to-payload.ts <payload.csv> --out <payload.json> [--source refresh-shows.py]
 *
 * Writes `[]` (not an error) when the CSV has zero NEW rows -- "nothing new
 * this week" is a legitimate, common outcome, not a failure.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { newShowRowsToProposedChanges, parseRefreshShowsCsv } from '../src/lib/refresh-shows-payload';
import { log } from '../src/lib/log';

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const csvPath = args[0];
  if (csvPath === undefined || csvPath.startsWith('--')) {
    throw new Error('usage: refresh-shows-to-payload.ts <payload.csv> --out <payload.json> [--source refresh-shows.py]');
  }
  const outPath = flag(args, '--out');
  if (outPath === undefined) throw new Error('--out <payload.json> is required');
  const source = flag(args, '--source') ?? 'refresh-shows.py';

  const csv = await readFile(csvPath, 'utf8');
  const rows = parseRefreshShowsCsv(csv);
  const { changes, skipped } = newShowRowsToProposedChanges(rows, source);

  await writeFile(outPath, `${JSON.stringify(changes, null, 2)}\n`);
  log.info(`${rows.length} row(s) read from ${csvPath}; ${changes.length} NEW show(s) written to ${outPath}`);
  if (skipped.length > 0) {
    log.warn(`${skipped.length} NEW row(s) skipped (missing a required field):`);
    for (const s of skipped) log.warn(`  ${s.row.name || '(no name)'} / ${s.row.city || '(no city)'} — ${s.reason}`);
  }
}

await main();
