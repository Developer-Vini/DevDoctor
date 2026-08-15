import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const ENV_FILES = ['.env', '.env.local', '.env.production', '.env.development'] as const;

const meta = { id: 'security.env', name: '.env protection', category: 'security' as const };

export const securityEnvCheck: Check = {
  ...meta,
  description: 'Checks whether sensitive .env files are present and tracked by Git.',
  async run(context) {
    const present = ENV_FILES.filter((file) => context.files.includes(file));
    if (present.length === 0) {
      return makeResult(meta, { message: 'No .env files found' });
    }

    const tracked = present.filter((file) => context.trackedFiles.includes(file));
    if (tracked.length > 0) {
      const names = tracked.join(', ');
      return makeResult(meta, {
        status: 'error',
        severity: 'critical',
        message:
          tracked.length === 1 ? `${names} is tracked by Git` : `${names} are tracked by Git`,
        details:
          'Sensitive files should never be committed. Add them to .gitignore and remove them from the repository history.',
        file: tracked[0],
        fixable: true,
        scoreImpact: 10,
      });
    }

    return makeResult(meta, {
      message: `${present.join(', ')} present but not tracked by Git`,
    });
  },
};
