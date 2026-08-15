import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = {
  id: 'project.package-manager',
  name: 'Package manager',
  category: 'project' as const,
};

export const projectPackageManagerCheck: Check = {
  ...meta,
  description: 'Detects the package manager from the lockfile (npm, yarn, pnpm or bun).',
  async run(context) {
    if (context.packageManager === 'unknown') {
      return makeResult(meta, {
        status: 'warning',
        severity: 'low',
        message: 'Package manager could not be detected',
        details: 'No lockfile found (package-lock.json, yarn.lock, pnpm-lock.yaml or bun.lock).',
        fixable: false,
        scoreImpact: 3,
      });
    }
    return makeResult(meta, { message: `Package manager: ${context.packageManager}` });
  },
};
