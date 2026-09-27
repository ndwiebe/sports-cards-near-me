#!/usr/bin/env -S npx tsx
/**
 * Generates the weekly plain-English digest described in PRD Phase 2b:
 * what the sheet-change engine did this week, what's waiting for approval
 * (with the exact approve command), the tap/click trend if that data is
 * reachable, and anything failing.
 *
 * Delivery (email or Telegram) is out of scope — this only writes the file,
 * to `docs/digests/YYYY-MM-DD-weekly-digest.md`.
 *
 * Usage:
 *   npx tsx scripts/weekly-digest.ts [--log <path>] [--days 7] [--out <path>] [--held <path>]
 *
 * Reads, all optional:
 *   --log <path>     the change log (default: docs/change-log/sheet-changes.jsonl)
 *   --held <path>    this run's held-items file, as written by
 *                    `scripts/refresh-shows-to-payload.ts --held-out` (a JSON array of
 *                    `{ row: RefreshShowsRow, reason: string }`) -- shown under "Held for
 *                    a closer look". Unlike the change log this has no history of its own;
 *                    it's this run's file, passed in fresh each time.
 *   docs/research/click-events-report-*.csv (newest file, if any — see docs/click-tracking.md)
 *   docs/digests/job-status.json ({ name, status, lastRun?, note? }[], if present -- a
 *   "publish" entry, if present, drives the "Getting this week's show changes live" section)
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { JsonlChangeLog } from '../src/lib/sheet-change-engine';
import type { ChangeLogEntry } from '../src/lib/sheet-change-engine';
import { buildDigest, parseClickEventsCsv, summarizeMonthlyTaps } from '../src/lib/weekly-digest';
import type { HeldShowItem, JobStatus, MonthlyTaps } from '../src/lib/weekly-digest';
import type { HeldItem } from '../src/lib/refresh-shows-payload';
import { log } from '../src/lib/log';

const DEFAULT_LOG = 'docs/change-log/sheet-changes.jsonl';
const RESEARCH_DIR = 'docs/research';
const DIGEST_DIR = 'docs/digests';
const JOB_STATUS_PATH = join(DIGEST_DIR, 'job-status.json');

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}

function weekLabel(days: number): string {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const fmt = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

async function recentEntries(logPath: string, days: number): Promise<ChangeLogEntry[]> {
  const changeLog = new JsonlChangeLog(logPath);
  const all = await changeLog.readAll();
  const cutoff = Date.now() - days * 86_400_000;
  return all.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
}

/** Newest `click-events-report-*.csv` in docs/research, or undefined if none exist. */
async function findLatestClickEventsCsv(): Promise<string | undefined> {
  let names: string[];
  try {
    names = await readdir(RESEARCH_DIR);
  } catch {
    return undefined;
  }
  const matches = names.filter((n) => /^click-events-report-\d{4}-\d{2}-\d{2}\.csv$/.test(n)).sort();
  const latest = matches.at(-1);
  return latest === undefined ? undefined : join(RESEARCH_DIR, latest);
}

async function loadClickTrend(): Promise<MonthlyTaps[] | undefined> {
  const path = await findLatestClickEventsCsv();
  if (path === undefined) return undefined;
  const csv = await readFile(path, 'utf8');
  return summarizeMonthlyTaps(parseClickEventsCsv(csv));
}

async function loadJobStatuses(): Promise<JobStatus[] | undefined> {
  try {
    const raw = JSON.parse(await readFile(JOB_STATUS_PATH, 'utf8')) as unknown;
    return Array.isArray(raw) ? (raw as JobStatus[]) : undefined;
  } catch {
    return undefined;
  }
}

/** Adapts a converter `HeldItem` (`row: RefreshShowsRow`) to the digest's own narrow `HeldShowItem` shape. */
function toHeldShowItem(item: HeldItem): HeldShowItem {
  return {
    name: item.row.name,
    city: item.row.city,
    province: item.row.province,
    startDate: item.row.startDate,
    status: item.row.status,
    reason: item.reason,
  };
}

async function loadHeldItems(path: string | undefined): Promise<HeldShowItem[] | undefined> {
  if (path === undefined) return undefined;
  try {
    const raw = JSON.parse(await readFile(path, 'utf8')) as unknown;
    return Array.isArray(raw) ? (raw as HeldItem[]).map(toHeldShowItem) : undefined;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const logPath = flag(args, '--log') ?? DEFAULT_LOG;
  const days = Number(flag(args, '--days') ?? '7');
  const heldPath = flag(args, '--held');

  const [changeLogEntries, clickTrend, jobStatuses, heldItems] = await Promise.all([
    recentEntries(logPath, days),
    loadClickTrend(),
    loadJobStatuses(),
    loadHeldItems(heldPath),
  ]);

  const markdown = buildDigest({ weekLabel: weekLabel(days), changeLogEntries, clickTrend, jobStatuses, heldItems });

  const outPath = flag(args, '--out') ?? join(DIGEST_DIR, `${new Date().toISOString().slice(0, 10)}-weekly-digest.md`);
  await mkdir(DIGEST_DIR, { recursive: true });
  await writeFile(outPath, markdown);
  log.info(`wrote ${outPath}`);
  log.info(
    clickTrend === undefined
      ? 'Click data: not reachable this run (no docs/research/click-events-report-*.csv found).'
      : 'Click data: included from the latest docs/research/click-events-report-*.csv.',
  );
  log.info(
    jobStatuses === undefined
      ? `Job status: not wired up (no ${JOB_STATUS_PATH}).`
      : `Job status: read from ${JOB_STATUS_PATH}.`,
  );
  log.info(
    heldItems === undefined
      ? 'Held items: none passed (no --held flag, or the file could not be read).'
      : `Held items: ${heldItems.length} read from ${heldPath}.`,
  );
}

await main();
