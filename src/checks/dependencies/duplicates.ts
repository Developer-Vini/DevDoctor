import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = {
  id: 'dependencies.duplicates',
  name: 'Duplicate dependencies',
  category: 'dependencies' as const,
};

export const dependencyDuplicatesCheck: Check = {
  ...meta,
  description: 'Detects packages listed more than once in package.json.',
  async run(context) {
    const pkg = context.packageJson;
    if (pkg === null) {
      return makeResult(meta, { message: 'No package.json found' });
    }

    const runtime = new Set(Object.keys(pkg.dependencies ?? {}));
    const duplicated = Object.keys(pkg.devDependencies ?? {}).filter((name) => runtime.has(name));

    if (duplicated.length > 0) {
      return makeResult(meta, {
        status: 'warning',
        severity: 'low',
        message: `Packages listed in both dependencies and devDependencies: ${duplicated.join(', ')}`,
        details: 'Move each package to a single section to keep dependency lists unambiguous.',
        file: 'package.json',
        fixable: false,
        scoreImpact: 3,
      });
    }
    return makeResult(meta, { message: 'No duplicated dependencies', file: 'package.json' });
  },
};
