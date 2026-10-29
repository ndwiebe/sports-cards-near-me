import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The wrapper's publish notes are prose that lands verbatim in the emailed
// digest (buildDigest in src/lib/weekly-digest.ts splices them in), so they are
// checked as text here, the same way superlative-claims.test.ts scans source
// files. Nothing else in tests/ reads the shell script, and a bad merge once
// restored "will go live with tomorrow's daily build" unnoticed.
const script = readFileSync(new URL('../../scripts/weekly-scnm-job.sh', import.meta.url), 'utf8');
const publishNotes = [...script.matchAll(/append_status "publish" "(ok|failing)"(?: "([^"]*)")?/g)].map((m) => m[2] ?? '');

describe('weekly job publish notes', () => {
  it('finds the publish status lines (mock, gh missing, gh unauthenticated, dispatch ok, dispatch failed)', () => {
    expect(publishNotes.length).toBeGreaterThanOrEqual(5);
  });

  it('never claim the change will reach the live site', () => {
    for (const note of publishNotes) {
      expect(note).not.toMatch(/will go live|should be live|lands on the live site|reaches the live site/i);
    }
  });

  it('state the cause only -- the digest owns the "already saved / later build / unverified" consequence', () => {
    for (const note of publishNotes) {
      expect(note).not.toMatch(/already saved to the sheet|can publish it|needs verification/i);
    }
  });
});
