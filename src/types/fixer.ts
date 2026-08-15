import type { ProjectContext } from './project.js';

export type FixAction = 'create' | 'append' | 'backup';

export interface FixOperation {
  file: string;
  action: FixAction;
}

export interface FixResult {
  checkId: string;
  /** False when the fix does not apply to this project. */
  applied: boolean;
  operations: FixOperation[];
  message: string;
}

export interface Fixer {
  /** The check id this fixer addresses. */
  checkId: string;
  description: string;
  /**
   * Computes the planned operations and applies them unless `dryRun` is true.
   * Never deletes files, never runs project code, never installs anything.
   */
  run(context: ProjectContext, dryRun: boolean): Promise<FixResult>;
}
