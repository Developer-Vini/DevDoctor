import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseGitignore } from '../../core/gitignore.js';
import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = { id: 'git.gitignore', name: '.gitignore', category: 'git' as const };

const REQUIRED_PATHS: ReadonlyArray<{ path: string; isDirectory: boolean }> = [
  { path: 'node_modules', isDirectory: true },
  { path: '.env', isDirectory: false },
];

export const gitGitignoreCheck: Check = {
  ...meta,
  description: 'Checks that a .gitignore exists and covers common artifacts and secrets.',
  async run(context) {
    if (!context.files.includes('.gitignore')) {
      return makeResult(meta, {
        status: 'warning',
        severity: 'medium',
        message: 'Missing .gitignore',
        details: 'A .gitignore prevents committing node_modules, build artifacts and secrets.',
        fixable: true,
        scoreImpact: 5,
      });
    }

    let content: string;
    try {
      content = await readFile(path.join(context.projectPath, '.gitignore'), 'utf8');
    } catch {
      return makeResult(meta, {
        status: 'error',
        severity: 'medium',
        message: 'Unable to read .gitignore',
        fixable: true,
        scoreImpact: 5,
      });
    }

    const matcher = parseGitignore(content);
    const uncovered = REQUIRED_PATHS.filter(
      ({ path: p, isDirectory }) => !matcher.isIgnored(p, isDirectory),
    );
    if (uncovered.length > 0) {
      const names = uncovered.map(({ path: p }) => p).join(', ');
      return makeResult(meta, {
        status: 'warning',
        severity: 'medium',
        message: `.gitignore does not cover: ${names}`,
        details: 'Add these entries to .gitignore to avoid committing build artifacts and secrets.',
        fixable: true,
        scoreImpact: 5,
      });
    }
    return makeResult(meta, { message: 'Valid .gitignore' });
  },
};
