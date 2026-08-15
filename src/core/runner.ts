import { getChecks } from './registry.js';
import { computeScores } from './score.js';
import { VERSION } from '../version.js';
import type { AuditOptions, Check, CheckResult } from '../types/check.js';
import type { ProjectContext, RuleLevel } from '../types/project.js';
import type { AuditReport } from '../types/report.js';

const CATEGORY_ORDER: readonly string[] = [
  'security',
  'code',
  'dependencies',
  'git',
  'documentation',
  'configuration',
  'project',
];

const SEVERITY_WEIGHT: Record<CheckResult['severity'], number> = {
  info: 1,
  low: 2,
  medium: 3,
  high: 4,
  critical: 5,
};

const DEFAULT_CONCURRENCY = 8;

/**
 * Runs every registered check against the context and returns a normalized,
 * sorted report with a deterministic score. A check that throws is converted
 * into an error result instead of crashing the whole audit.
 */
export async function runAudit(
  context: ProjectContext,
  options: AuditOptions = {},
): Promise<AuditReport> {
  const network = options.network ?? false;
  const checks = getChecks().filter((check) => {
    const categoryOk =
      options.categories === undefined || options.categories.includes(check.category);
    // Network checks are always excluded unless the run opts into network,
    // even when a category filter would otherwise include them.
    const networkCheck = check.requiresNetwork === true;
    if (networkCheck && !network) return false;
    if (!categoryOk && !(network && networkCheck)) return false;
    if (options.rules?.[check.id] === 'off') return false;
    return true;
  });

  const rawResults = await runChecks(context, checks, options.concurrency ?? DEFAULT_CONCURRENCY);
  const results = rawResults
    .map((result) => applyRuleLevel(result, options.rules?.[result.id]))
    .sort(compareResults);

  const { categories, overall } = computeScores(results);

  const errors = results.filter((result) => result.status === 'error').length;
  const warnings = results.filter((result) => result.status === 'warning').length;
  const info = results.filter(
    (result) => result.status === 'pass' && result.severity === 'info',
  ).length;

  return {
    version: VERSION,
    project: {
      path: context.projectPath,
      name: context.projectName,
      type: context.projectType,
      packageManager: context.packageManager,
      nodeVersion: context.nodeVersion,
      isGitRepository: context.isGitRepository,
    },
    results,
    score: overall,
    categories,
    issues: { total: errors + warnings, errors, warnings, info },
  };
}

async function runChecks(
  context: ProjectContext,
  checks: readonly Check[],
  concurrency: number,
): Promise<CheckResult[]> {
  const results = new Array<CheckResult>(checks.length);
  let next = 0;

  const workerCount = Math.max(1, Math.min(concurrency, checks.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (next < checks.length) {
      const index = next;
      next += 1;
      const check = checks[index];
      if (check === undefined) break;
      try {
        results[index] = await check.run(context);
      } catch (error) {
        results[index] = {
          id: check.id,
          name: check.name,
          category: check.category,
          status: 'error',
          severity: 'high',
          message: `Check "${check.id}" crashed`,
          details: error instanceof Error ? error.message : String(error),
          fixable: false,
          scoreImpact: 0,
        };
      }
    }
  });

  await Promise.all(workers);
  return results;
}

function applyRuleLevel(result: CheckResult, rule: RuleLevel | undefined): CheckResult {
  if (rule === 'error' && result.status === 'warning') {
    return { ...result, status: 'error' };
  }
  if (rule === 'warning' && result.status === 'error') {
    return { ...result, status: 'warning' };
  }
  return result;
}

function compareResults(a: CheckResult, b: CheckResult): number {
  const categoryDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
  if (categoryDiff !== 0) return categoryDiff;

  const severityDiff = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
  if (severityDiff !== 0) return severityDiff;

  return a.id.localeCompare(b.id);
}
