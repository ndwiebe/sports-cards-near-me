import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/ratings-refresh.yml', 'utf8');
const producer = readFileSync('scripts/refresh-ratings.py', 'utf8');
const payload = producer.match(/^PAYLOAD = ROOT \/ '([^']+)'/m)?.[1];

describe('monthly review output transport', () => {
  it('retains the producer payload in both failure-surviving artifacts and the review PR', () => {
    expect(payload).toBeDefined();
    const artifact = workflow.split('uses: actions/upload-artifact@')[1]?.split('- name: Open a PR')[0];
    const pr = workflow.split('uses: peter-evans/create-pull-request@')[1];
    expect(artifact).toContain(`            ${payload}`);
    expect(pr).toContain(`            ${payload}`);
    expect(workflow).toMatch(/if: always\(\)\s+uses: actions\/upload-artifact/);
  });
});
