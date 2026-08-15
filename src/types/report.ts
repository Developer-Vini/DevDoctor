import type { CheckCategory, CheckResult } from './check.js';
import type { PackageManager, ProjectType } from './project.js';

export interface AuditReport {
  version: string;
  project: {
    path: string;
    name: string;
    type: ProjectType;
    packageManager: PackageManager;
    nodeVersion: string;
    isGitRepository: boolean;
  };
  results: CheckResult[];
  /** Overall score (0-100), or null when no checks ran. */
  score: number | null;
  /** Score (0-100) per category that ran at least one check. */
  categories: Partial<Record<CheckCategory, number>>;
  issues: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
}
