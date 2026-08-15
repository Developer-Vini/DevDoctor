import type { AuditReport } from '../types/report.js';
import type { CheckStatus, Severity } from '../types/check.js';

export const JSON_SCHEMA_VERSION = '1.0';

export interface JsonIssue {
  id: string;
  name: string;
  category: string;
  status: CheckStatus;
  severity: Severity;
  message: string;
  details: string | null;
  file: string | null;
  line: number | null;
  fixable: boolean;
}

export interface JsonReport {
  version: string;
  project: {
    name: string;
    type: string;
    packageManager: string;
    path: string;
  };
  score: number | null;
  categories: Record<string, number>;
  issues: JsonIssue[];
}

/**
 * Stable JSON structure for tooling. Note: check `details` only ever contains
 * masked secret values — the checks never produce raw secrets.
 */
export function renderJsonReport(report: AuditReport): string {
  const categories: Record<string, number> = {};
  for (const [category, score] of Object.entries(report.categories)) {
    if (score !== undefined) categories[category] = score;
  }

  const issues: JsonIssue[] = report.results
    .filter((result) => result.status !== 'pass')
    .map((result) => ({
      id: result.id,
      name: result.name,
      category: result.category,
      status: result.status,
      severity: result.severity,
      message: result.message,
      details: result.details ?? null,
      file: result.file ?? null,
      line: result.line ?? null,
      fixable: result.fixable,
    }));

  const out: JsonReport = {
    version: JSON_SCHEMA_VERSION,
    project: {
      name: report.project.name,
      type: report.project.type,
      packageManager: report.project.packageManager,
      path: report.project.path,
    },
    score: report.score,
    categories,
    issues,
  };
  return JSON.stringify(out, null, 2);
}
