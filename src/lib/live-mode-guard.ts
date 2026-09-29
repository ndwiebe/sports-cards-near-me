import type { EngineMode } from './sheet-change-engine';

/**
 * Trial-lock gate for the sheet-change engine's `--live` mode (the CLI flag
 * that points the engine at the real Google Sheet via `GoogleSheetsClient`
 * instead of a local fixture -- see `scripts/sheet-change-engine.ts`).
 *
 * Nathan approved a sheet-automation trial on 2026-09-23
 * (`~/jarvis-memory/decisions/2026/2026-09-23-scnm-q4-automation-calls.md`),
 * on the terms the PRD already named for this engine (`docs/PRD-q4-2026-growth.md`
 * Phase 2b): "the first two weeks run in review-everything mode before
 * automatic writes are switched on." `LIVE_TRIAL_LOCK_UNTIL` is that two-week
 * window's end date, named once here so it is never hardcoded a second time.
 *
 * Before that date, every live change -- including a closure, which is
 * otherwise auto-appliable in `auto-low-risk` mode -- must queue for Nathan's
 * review. Rather than silently downgrading a requested `auto-low-risk` run to
 * `review-all` (which could look like the flag "worked" when it didn't do
 * what was asked), a live `auto-low-risk` request during the trial is refused
 * outright with an explanation.
 */
export const LIVE_TRIAL_LOCK_UNTIL = new Date('2026-10-10T00:00:00Z');

export interface LiveModeCheckInput {
  /** Whether the CLI was invoked with `--live`. */
  live: boolean;
  mode: EngineMode;
  /** Pass `process.env` in real use; a plain object in tests. */
  env: Record<string, string | undefined>;
  /** Injectable clock for tests. Defaults to the real current time. */
  now?: Date;
}

export type LiveModeCheck = { ok: true } | { ok: false; reason: string };

/**
 * Returns `{ ok: true }` when a `--live` invocation (or a non-live one, which
 * is always fine) may proceed, or `{ ok: false, reason }` with a plain-English
 * explanation when it must be refused. Never throws -- the caller decides how
 * to surface the refusal (the CLI turns it into a thrown `Error`).
 */
export function checkLiveModeAllowed(input: LiveModeCheckInput): LiveModeCheck {
  const { live, mode, env, now = new Date() } = input;
  if (!live) return { ok: true };

  if (env['SCNM_ALLOW_LIVE_SHEET'] !== '1') {
    return {
      ok: false,
      reason:
        '--live also requires the SCNM_ALLOW_LIVE_SHEET=1 environment variable -- both must be set ' +
        'together before this CLI will read or write the real directory sheet (the live copy of the ' +
        "spreadsheet, not a test copy). This is deliberate: a stray --live flag by itself should never " +
        'be enough to touch production data.',
    };
  }

  if (mode === 'auto-low-risk' && now.getTime() < LIVE_TRIAL_LOCK_UNTIL.getTime()) {
    return {
      ok: false,
      reason:
        `--mode auto-low-risk is refused against the live sheet until ${LIVE_TRIAL_LOCK_UNTIL.toISOString()}. ` +
        'Nathan approved a two-week trial (decided 2026-09-23) where every live change -- even ones that ' +
        'would normally auto-apply, including a shop closure -- queues for his review first, with nothing ' +
        'written automatically. Use --mode review-all (the default) until the trial window ends, or omit ' +
        '--mode entirely.',
    };
  }

  return { ok: true };
}
