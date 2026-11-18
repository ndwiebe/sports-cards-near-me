import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(new URL('../../.github/workflows/site.yml', import.meta.url), 'utf8');

describe('production deployment serialization', () => {
  it('queues overlapping releases without cancelling an active deployment', () => {
    expect(workflow).toMatch(/^concurrency:\n  group: site-production\n  cancel-in-progress: false$/m);
    expect(workflow.indexOf('concurrency:')).toBeLessThan(workflow.indexOf('\njobs:'));
  });
});
