import { describe, it, expect } from 'vitest';
import { checkLiveModeAllowed, LIVE_TRIAL_LOCK_UNTIL } from '../../src/lib/live-mode-guard';

const BEFORE_LOCK = new Date('2026-09-27T00:00:00Z');
const AFTER_LOCK = new Date('2026-10-11T00:00:00Z');

describe('checkLiveModeAllowed', () => {
  it('allows a non-live run regardless of mode or env', () => {
    expect(checkLiveModeAllowed({ live: false, mode: 'auto-low-risk', env: {} })).toEqual({ ok: true });
  });

  it('refuses --live when SCNM_ALLOW_LIVE_SHEET is missing', () => {
    const result = checkLiveModeAllowed({ live: true, mode: 'review-all', env: {}, now: BEFORE_LOCK });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/SCNM_ALLOW_LIVE_SHEET/);
  });

  it('refuses --live when SCNM_ALLOW_LIVE_SHEET is set to something other than "1"', () => {
    const result = checkLiveModeAllowed({
      live: true,
      mode: 'review-all',
      env: { SCNM_ALLOW_LIVE_SHEET: 'true' },
      now: BEFORE_LOCK,
    });
    expect(result.ok).toBe(false);
  });

  it('allows --live with review-all mode once the env var is set, even before the trial lock date', () => {
    const result = checkLiveModeAllowed({
      live: true,
      mode: 'review-all',
      env: { SCNM_ALLOW_LIVE_SHEET: '1' },
      now: BEFORE_LOCK,
    });
    expect(result).toEqual({ ok: true });
  });

  it('refuses --live with --mode auto-low-risk before the trial lock date, with an explanation', () => {
    const result = checkLiveModeAllowed({
      live: true,
      mode: 'auto-low-risk',
      env: { SCNM_ALLOW_LIVE_SHEET: '1' },
      now: BEFORE_LOCK,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/auto-low-risk/);
      expect(result.reason).toMatch(/trial/i);
    }
  });

  it('allows --live with --mode auto-low-risk after the trial lock date', () => {
    const result = checkLiveModeAllowed({
      live: true,
      mode: 'auto-low-risk',
      env: { SCNM_ALLOW_LIVE_SHEET: '1' },
      now: AFTER_LOCK,
    });
    expect(result).toEqual({ ok: true });
  });

  it('treats the lock date itself as the trial having ended (now === lock date passes)', () => {
    const result = checkLiveModeAllowed({
      live: true,
      mode: 'auto-low-risk',
      env: { SCNM_ALLOW_LIVE_SHEET: '1' },
      now: LIVE_TRIAL_LOCK_UNTIL,
    });
    expect(result).toEqual({ ok: true });
  });
});
