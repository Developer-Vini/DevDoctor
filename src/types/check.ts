import type { ProjectContext, RuleLevel } from './project.js';

export type CheckCategory =
  'security' | 'code' | 'dependencies' | 'git' | 'documentation' | 'configuration' | 'project';

export type CheckStatus = 'pass' | 'warning' | 'error';
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface CheckResult {
  id: string;
  name: string;
  category: CheckCategory;
  status: CheckStatus;
  severity: Severity;
  message: string;
  details?: string;
  file?: string;
  line?: number;
  /** Whether DevDoctor can safely fix this issue (see the `fix` command). */
  fixable: boolean;
  /** How many points (0-100) this issue costs when failing. */
  scoreImpact: number;
}

export interface CheckRunOptions {
  /** Whether network access is allowed for this run. */
  network?: boolean;
}

export interface Check {
  id: string;
  name: string;
  description: string;
  category: CheckCategory;
  run(context: ProjectContext, options?: CheckRunOptions): Promise<CheckResult>;
  /** When true, this check only runs when the run opts into network access. */
  requiresNetwork?: boolean;
}

export interface AuditOptions {
  /** Only run checks in these categories. */
  categories?: CheckCategory[];
  /** Per-check rule overrides (e.g. from configuration). */
  rules?: Record<string, RuleLevel>;
  /** Max number of checks running in parallel. */
  concurrency?: number;
  /** Allow checks that need network access (e.g. dependency audits). */
  network?: boolean;
}
