import { describe, expect, it } from 'vitest';
import { computeScores } from '../../src/core/score.js';
import type { CheckResult } from '../../src/types/check.js';

function result(overrides: Partial<CheckResult> & { id: string }): CheckResult {
  return {
    name: overrides.id,
    category: 'security',
    status: 'pass',
    severity: 'info',
    message: 'ok',
    fixable: false,
    scoreImpact: 0,
    ...overrides,
  };
}

describe('computeScores', () => {
  it('returns 100 for a category with no failing checks', () => {
    const { categories, overall } = computeScores([
      result({ id: 'a', category: 'security', status: 'pass' }),
      result({ id: 'b', category: 'git', status: 'pass' }),
    ]);
    expect(categories.security).toBe(100);
    expect(categories.git).toBe(100);
    expect(overall).toBe(100);
  });

  it('subtracts scoreImpact of failing checks', () => {
    const { categories } = computeScores([
      result({ id: 'a', category: 'security', status: 'error', scoreImpact: 15 }),
      result({ id: 'b', category: 'security', status: 'warning', scoreImpact: 5 }),
    ]);
    expect(categories.security).toBe(80);
  });

  it('clamps category scores at 0', () => {
    const { categories } = computeScores([
      result({ id: 'a', category: 'security', status: 'error', scoreImpact: 60 }),
      result({ id: 'b', category: 'security', status: 'error', scoreImpact: 60 }),
    ]);
    expect(categories.security).toBe(0);
  });

  it('computes the overall as the rounded average', () => {
    const { overall } = computeScores([
      result({ id: 'a', category: 'security', status: 'pass' }),
      result({ id: 'b', category: 'git', status: 'error', scoreImpact: 10 }), // 90
      result({ id: 'c', category: 'code', status: 'warning', scoreImpact: 3 }), // 97
    ]);
    // (100 + 90 + 97) / 3 = 95.67 -> 96
    expect(overall).toBe(96);
  });

  it('returns null overall when no checks ran', () => {
    const { overall } = computeScores([]);
    expect(overall).toBeNull();
  });
});
