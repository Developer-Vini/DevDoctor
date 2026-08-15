import type { CheckCategory, CheckResult } from '../types/check.js';

export interface ScoreBreakdown {
  /** Score (0-100) per category that ran at least one check. */
  categories: Partial<Record<CheckCategory, number>>;
  /** Overall score (0-100), or null when no checks ran. */
  overall: number | null;
}

/**
 * Deterministic score: every category starts at 100 and loses the
 * scoreImpact of each failing check (clamped at 0). The overall score is the
 * rounded average of the category scores. No AI, no randomness.
 */
export function computeScores(results: CheckResult[]): ScoreBreakdown {
  const byCategory = new Map<CheckCategory, CheckResult[]>();
  for (const result of results) {
    const list = byCategory.get(result.category);
    if (list === undefined) {
      byCategory.set(result.category, [result]);
    } else {
      list.push(result);
    }
  }

  const categories: Partial<Record<CheckCategory, number>> = {};
  const scores: number[] = [];
  for (const [category, categoryResults] of byCategory) {
    const loss = categoryResults
      .filter((result) => result.status !== 'pass')
      .reduce((sum, result) => sum + result.scoreImpact, 0);
    const score = Math.max(0, Math.min(100, 100 - loss));
    categories[category] = score;
    scores.push(score);
  }

  const overall =
    scores.length === 0 ? null : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  return { categories, overall };
}
