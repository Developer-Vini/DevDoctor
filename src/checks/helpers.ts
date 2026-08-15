import type { CheckResult } from '../types/check.js';

/**
 * Builds a CheckResult for a check, defaulting status/severity to a passing,
 * informational result. Overrides are spread last.
 */
export function makeResult(
  meta: Pick<CheckResult, 'id' | 'name' | 'category'>,
  partial: Partial<CheckResult> & { message: string },
): CheckResult {
  return {
    ...meta,
    status: 'pass',
    severity: 'info',
    fixable: false,
    scoreImpact: 0,
    ...partial,
  };
}
