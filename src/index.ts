export { VERSION } from './version.js';
export type {
  AuditOptions,
  Check,
  CheckCategory,
  CheckResult,
  CheckStatus,
  Severity,
} from './types/check.js';
export type {
  DevDoctorConfig,
  PackageJson,
  PackageManager,
  ProjectContext,
  ProjectType,
  RuleLevel,
} from './types/project.js';
export type { AuditReport } from './types/report.js';
export { buildContext } from './core/context.js';
export { DevDoctorError, toErrorMessage } from './core/errors.js';
export { parseGitignore } from './core/gitignore.js';
export { computeScores } from './core/score.js';
export { maskSecret, scanForSecrets } from './analyzers/secrets.js';
export {
  getCheckById,
  getChecks,
  registerCheck,
  registerDefaultChecks,
  resetRegistry,
} from './core/registry.js';
export { runAudit } from './core/runner.js';
export { scanProject } from './core/scanner.js';
