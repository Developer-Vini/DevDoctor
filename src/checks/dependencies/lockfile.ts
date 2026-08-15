import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = { id: 'dependencies.lockfile', name: 'Lockfile', category: 'dependencies' as const };

export const dependencyLockfileCheck: Check = {
  ...meta,
  description: 'Checks that a lockfile exists so installs are reproducible.',
  async run(context) {
    if (context.packageJson === null) {
      return makeResult(meta, { message: 'No package.json found — nothing to lock' });
    }
    if (context.lockfiles.length === 0) {
      return makeResult(meta, {
        status: 'warning',
        severity: 'medium',
        message: 'No lockfile found',
        details:
          'Commit a lockfile (package-lock.json, yarn.lock, pnpm-lock.yaml or bun.lock) to keep installs reproducible.',
        fixable: false,
        scoreImpact: 5,
      });
    }
    return makeResult(meta, { message: `Lockfile detected: ${context.lockfiles.join(', ')}` });
  },
};
