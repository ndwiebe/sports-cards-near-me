import { describe, it, expect } from 'vitest';
import { assertNoUnexpectedShrink } from '../../src/lib/dataset-guard';

describe('assertNoUnexpectedShrink', () => {
  it('does not throw when there is nothing to compare against', () => {
    expect(() => assertNoUnexpectedShrink('shows', 0, null)).not.toThrow();
    expect(() => assertNoUnexpectedShrink('shows', 5, null)).not.toThrow();
  });

  it('does not throw when the previous count was zero (legitimate empty-start state)', () => {
    expect(() => assertNoUnexpectedShrink('resellers', 0, 0)).not.toThrow();
    expect(() => assertNoUnexpectedShrink('resellers', 3, 0)).not.toThrow();
  });

  it('does not throw on growth or a small drop', () => {
    expect(() => assertNoUnexpectedShrink('shows', 215, 215)).not.toThrow();
    expect(() => assertNoUnexpectedShrink('shows', 250, 215)).not.toThrow();
    expect(() => assertNoUnexpectedShrink('shows', 130, 215)).not.toThrow(); // just above the 50% floor
  });

  it('throws on a drop past the default 50% floor', () => {
    expect(() => assertNoUnexpectedShrink('shows', 100, 215)).toThrow(/shows/);
    expect(() => assertNoUnexpectedShrink('shows', 100, 215)).toThrow(/>50% drop/);
  });

  it('respects a custom dropRatio', () => {
    // 90 is an 8% drop from 98 -- fine at the default (50%) floor, not fine at a
    // stricter 95% floor (i.e. more than a 5% drop is unexpected).
    expect(() => assertNoUnexpectedShrink('resellers', 90, 98)).not.toThrow();
    expect(() => assertNoUnexpectedShrink('resellers', 90, 98, { dropRatio: 0.95 })).toThrow();
  });

  it('includes both counts in the error message', () => {
    expect(() => assertNoUnexpectedShrink('shows', 50, 215)).toThrow('50');
    expect(() => assertNoUnexpectedShrink('shows', 50, 215)).toThrow('215');
  });
});
