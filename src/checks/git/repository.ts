import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = { id: 'git.repository', name: 'Git repository', category: 'git' as const };

export const gitRepositoryCheck: Check = {
  ...meta,
  description: 'Checks whether the project is a Git repository and Git is available.',
  async run(context) {
    if (!context.isGitRepository) {
      return makeResult(meta, {
        status: 'warning',
        severity: 'low',
        message: 'Not a Git repository',
        details:
          'Run `git init` to enable version control. Git-based checks are limited without a repository.',
        fixable: false,
        scoreImpact: 3,
      });
    }
    if (!context.gitExecutable) {
      return makeResult(meta, {
        status: 'warning',
        severity: 'medium',
        message: 'Git executable not found',
        details: 'Git is not installed or not in PATH. Some Git checks were skipped.',
        fixable: false,
        scoreImpact: 3,
      });
    }
    return makeResult(meta, { message: 'Repository healthy' });
  },
};
