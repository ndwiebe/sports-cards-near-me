import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The monthly ratings workflow has to carry every file scripts/refresh-ratings.py
// writes through two hand-maintained lists (the artifact `path:` and the PR
// `add-paths:`), plus the Summarise step's counts. The 2026-08-28 run lost a
// new output exactly because one list was not updated. This test pins the
// producer's constants to all three consumers.
//
// Both files are read as text. The workflow is sliced on step boundaries
// (every step starts with a 6-space "- ") rather than parsed, because no YAML
// parser is a declared dependency and the two block scalars under test are
// plain indented lists. Step *names* are prose and get renamed (the artifact
// step was, in PR #21), so nothing below keys on one: steps are found by the
// `uses:` action id or by the env var they write.
const read = (p: string): string => readFileSync(new URL(p, import.meta.url), 'utf8');
const workflow = read('../../.github/workflows/ratings-refresh.yml');
const producer = read('../../scripts/refresh-ratings.py');

/** Every `NAME = ROOT / 'docs/research/...'` the producer declares. STORES (an input under src/data) is excluded by the prefix. */
const producerOutputs = [...producer.matchAll(/^[A-Z_]+ = ROOT \/ '(docs\/research\/[^']+)'$/gm)].flatMap((m) => (m[1] === undefined ? [] : [m[1]]));
const producerCsvs = producerOutputs.filter((p) => p.endsWith('.csv'));

const steps = workflow.split(/\n(?= {6}- )/);

/** The one step whose text matches `marker` (an action id or a distinctive line), with a message that names what went missing. */
function step(marker: RegExp, what: string): string {
  const hits = steps.filter((s) => marker.test(s));
  expect(hits, `expected exactly one ${what} step in ratings-refresh.yml`).toHaveLength(1);
  return hits[0] ?? '';
}

/** Entries of a `key: |` block scalar inside a step: the consecutive 12-space-indented lines right after it. A commented-out entry ("# docs/...") does not count. */
function blockList(stepText: string, key: string): string[] {
  const m = stepText.match(new RegExp(`^ {10}${key}: \\|\\n((?: {12}\\S[^\\n]*\\n?)+)`, 'm'));
  expect(m, `expected a \`${key}: |\` block in the step`).not.toBeNull();
  return (m?.[1] ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

describe('monthly ratings refresh: producer outputs reach the artifact, the review PR and the summary', () => {
  it('reads the producer outputs (four today: three CSVs and the proposal JSON)', () => {
    expect(producerOutputs).toContain('docs/research/ratings-refresh-payload.json');
    expect(producerCsvs.length).toBeGreaterThanOrEqual(3);
  });

  it('lists every producer output in the artifact path: block', () => {
    const paths = blockList(step(/^ {8}uses: actions\/upload-artifact@/m, 'upload-artifact'), 'path');
    for (const out of producerOutputs) expect(paths, `artifact path: should list ${out}`).toContain(out);
  });

  it('lists every producer output in the PR add-paths: block (a mention in the PR body does not count)', () => {
    const paths = blockList(step(/^ {8}uses: peter-evans\/create-pull-request@/m, 'create-pull-request'), 'add-paths');
    for (const out of producerOutputs) expect(paths, `add-paths: should list ${out}`).toContain(out);
  });

  it('counts every CSV output in the step summary', () => {
    const summarise = step(/GITHUB_STEP_SUMMARY/, 'Summarise');
    for (const csv of producerCsvs) expect(summarise, `Summarise should count ${csv}`).toContain(`wc -l < ${csv}`);
  });

  it('uploads the artifact even when the scan fails (if: always() on the upload step)', () => {
    // Anywhere inside the step, so inserting another key between `if:` and `uses:` is fine.
    expect(step(/^ {8}uses: actions\/upload-artifact@/m, 'upload-artifact')).toMatch(/^ {8}if: always\(\)$/m);
  });
});
