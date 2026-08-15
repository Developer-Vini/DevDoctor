import type { Check } from '../types/check.js';
import { configurationPackageJsonCheck } from '../checks/configuration/packageJson.js';
import { codeConsoleLogCheck } from '../checks/code/consoleLog.js';
import { codeDuplicateFilesCheck } from '../checks/code/duplicateFiles.js';
import { codeEmptyFilesCheck } from '../checks/code/emptyFiles.js';
import { codeLargeFilesCheck } from '../checks/code/largeFiles.js';
import { codeTodoCheck } from '../checks/code/todo.js';
import { dependencyDuplicatesCheck } from '../checks/dependencies/duplicates.js';
import { dependencyLockfileCheck } from '../checks/dependencies/lockfile.js';
import { dependencyUnusedCheck } from '../checks/dependencies/unused.js';
import { dependencyVulnerabilitiesCheck } from '../checks/dependencies/vulnerabilities.js';
import { documentationReadmeCheck } from '../checks/documentation/readme.js';
import { gitGitignoreCheck } from '../checks/git/gitignore.js';
import { gitRepositoryCheck } from '../checks/git/repository.js';
import { projectDetectionCheck } from '../checks/project/detection.js';
import { projectPackageManagerCheck } from '../checks/project/packageManager.js';
import { securityEnvCheck } from '../checks/security/env.js';
import { securitySecretsCheck } from '../checks/security/secrets.js';

const registry: Check[] = [];
let defaultChecksRegistered = false;

export function registerCheck(check: Check): void {
  if (registry.some((existing) => existing.id === check.id)) {
    throw new Error(`Check "${check.id}" is already registered`);
  }
  registry.push(check);
}

export function getChecks(): readonly Check[] {
  return registry;
}

export function getCheckById(id: string): Check | undefined {
  return registry.find((check) => check.id === id);
}

/** Registers the built-in checks. Safe to call more than once. */
export function registerDefaultChecks(): void {
  if (defaultChecksRegistered) return;
  defaultChecksRegistered = true;
  registerCheck(projectDetectionCheck);
  registerCheck(projectPackageManagerCheck);
  registerCheck(gitRepositoryCheck);
  registerCheck(gitGitignoreCheck);
  registerCheck(securityEnvCheck);
  registerCheck(securitySecretsCheck);
  registerCheck(dependencyLockfileCheck);
  registerCheck(dependencyDuplicatesCheck);
  registerCheck(dependencyUnusedCheck);
  registerCheck(dependencyVulnerabilitiesCheck);
  registerCheck(documentationReadmeCheck);
  registerCheck(configurationPackageJsonCheck);
  registerCheck(codeConsoleLogCheck);
  registerCheck(codeTodoCheck);
  registerCheck(codeLargeFilesCheck);
  registerCheck(codeEmptyFilesCheck);
  registerCheck(codeDuplicateFilesCheck);
}

/** Test helper: clears the registry so tests can register their own checks. */
export function resetRegistry(): void {
  registry.length = 0;
  defaultChecksRegistered = false;
}
