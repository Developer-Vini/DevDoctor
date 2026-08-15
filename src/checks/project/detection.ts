import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = { id: 'project.detection', name: 'Project detection', category: 'project' as const };

const TYPE_LABELS: Record<string, string> = {
  node: 'Node.js',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
};

export const projectDetectionCheck: Check = {
  ...meta,
  description: 'Detects the project type (Node.js, TypeScript or JavaScript).',
  async run(context) {
    if (context.projectType === 'unknown') {
      return makeResult(meta, {
        status: 'error',
        severity: 'high',
        message: 'Project type could not be detected',
        details: 'No package.json, tsconfig.json or JavaScript/TypeScript source files were found.',
        fixable: false,
        scoreImpact: 10,
      });
    }
    const label = TYPE_LABELS[context.projectType] ?? context.projectType;
    return makeResult(meta, { message: `Project detected: ${label}` });
  },
};
