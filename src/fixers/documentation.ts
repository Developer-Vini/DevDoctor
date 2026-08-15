import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { README_NAMES } from '../checks/documentation/readme.js';
import type { Fixer } from '../types/fixer.js';

export const documentationFixer: Fixer = {
  checkId: 'documentation.readme',
  description: 'Creates a basic README.md when none exists (never overwrites).',
  async run(context, dryRun) {
    const existing = README_NAMES.find((name) => context.files.includes(name));
    if (existing !== undefined) {
      return {
        checkId: 'documentation.readme',
        applied: false,
        operations: [],
        message: `${existing} already exists`,
      };
    }

    const content = [
      `# ${context.projectName}`,
      '',
      '> Add a short description of your project here.',
      '',
      '## Installation',
      '',
      '```bash',
      'npm install',
      '```',
      '',
      '## Usage',
      '',
      '```bash',
      'npm start',
      '```',
      '',
    ].join('\n');

    if (!dryRun) {
      await writeFile(path.join(context.projectPath, 'README.md'), content, 'utf8');
    }
    return {
      checkId: 'documentation.readme',
      applied: true,
      operations: [{ file: 'README.md', action: 'create' }],
      message: 'Created basic README.md',
    };
  },
};
