import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

export const README_NAMES = [
  'README.md',
  'README',
  'readme.md',
  'readme',
  'README.txt',
  'README.rst',
];

const meta = { id: 'documentation.readme', name: 'README', category: 'documentation' as const };

export const documentationReadmeCheck: Check = {
  ...meta,
  description: 'Checks that a README exists and covers description, installation and usage.',
  async run(context) {
    const readme = README_NAMES.find((name) => context.files.includes(name));
    if (readme === undefined) {
      return makeResult(meta, {
        status: 'error',
        severity: 'medium',
        message: 'README missing',
        details:
          'A README is required for a public project: it explains what the project does and how to use it.',
        fixable: true,
        scoreImpact: 5,
      });
    }

    let content: string;
    try {
      content = await readFile(path.join(context.projectPath, readme), 'utf8');
    } catch {
      return makeResult(meta, {
        status: 'error',
        severity: 'medium',
        message: `Unable to read ${readme}`,
        fixable: true,
        scoreImpact: 5,
      });
    }

    const missing: string[] = [];
    if (!hasHeading(content, /installation|instalação|getting started|setup|quick start/)) {
      missing.push('installation');
    }
    if (!hasHeading(content, /usage|uso|examples|exemplos|quick start/)) {
      missing.push('usage');
    }
    const hasDescription =
      (context.packageJson?.description?.trim().length ?? 0) > 0 || content.trim().length > 80;
    if (!hasDescription) missing.push('description');

    if (missing.length > 0) {
      return makeResult(meta, {
        status: 'warning',
        severity: 'low',
        message: `README is missing: ${missing.join(', ')}`,
        details: `Consider adding ${missing.map((m) => `"${m}"`).join(', ')} sections to ${readme}.`,
        file: readme,
        fixable: true,
        scoreImpact: 3,
      });
    }
    return makeResult(meta, { message: `README present (${readme})` });
  },
};

function hasHeading(content: string, pattern: RegExp): boolean {
  return new RegExp(`\\n#{1,6}\\s*(${pattern.source})\\b`, 'i').test(`\n${content}`);
}
