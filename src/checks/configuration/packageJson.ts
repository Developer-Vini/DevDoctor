import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = {
  id: 'configuration.package-json',
  name: 'package.json',
  category: 'configuration' as const,
};

export const configurationPackageJsonCheck: Check = {
  ...meta,
  description: 'Checks that package.json is valid and contains useful scripts.',
  async run(context) {
    if (context.packageJson === null) {
      if (context.packageJsonError !== null) {
        return makeResult(meta, {
          status: 'error',
          severity: 'high',
          message: 'Unable to read package.json',
          details: context.packageJsonError,
          file: 'package.json',
          fixable: false,
          scoreImpact: 5,
        });
      }
      if (context.projectType === 'unknown') {
        return makeResult(meta, { message: 'No package.json found — project type unknown' });
      }
      return makeResult(meta, {
        status: 'error',
        severity: 'medium',
        message: 'package.json missing',
        details: 'A Node.js project should define its metadata and scripts in package.json.',
        file: 'package.json',
        fixable: false,
        scoreImpact: 3,
      });
    }

    const problems: string[] = [];
    const scripts = context.packageJson.scripts ?? {};
    if (Object.keys(scripts).length === 0) problems.push('no scripts defined');
    if (!context.packageJson.name) problems.push('missing name');

    if (problems.length > 0) {
      return makeResult(meta, {
        status: 'warning',
        severity: 'low',
        message: `package.json issues: ${problems.join(', ')}`,
        file: 'package.json',
        fixable: false,
        scoreImpact: 2,
      });
    }
    return makeResult(meta, { message: 'package.json looks good', file: 'package.json' });
  },
};
