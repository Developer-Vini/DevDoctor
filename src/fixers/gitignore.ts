import { appendFile, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseGitignore } from '../core/gitignore.js';
import type { Fixer } from '../types/fixer.js';

const DEFAULT_GITIGNORE = [
  'node_modules/',
  'dist/',
  'build/',
  'coverage/',
  '.env',
  '.env.*',
  '*.log',
  '.DS_Store',
  '',
].join('\n');

const REQUIRED_ENTRIES = [
  { path: 'node_modules', isDirectory: true },
  { path: '.env', isDirectory: false },
];

export const gitignoreFixer: Fixer = {
  checkId: 'git.gitignore',
  description: 'Creates a .gitignore or adds missing entries (node_modules, .env).',
  async run(context, dryRun) {
    const filePath = path.join(context.projectPath, '.gitignore');
    const backupPath = `${filePath}.devdoctor.bak`;

    let content: string | null = null;
    try {
      content = await readFile(filePath, 'utf8');
    } catch {
      content = null;
    }

    // Create from scratch.
    if (content === null) {
      if (!dryRun) {
        await writeFile(filePath, DEFAULT_GITIGNORE, 'utf8');
      }
      return {
        checkId: 'git.gitignore',
        applied: true,
        operations: [{ file: '.gitignore', action: 'create' }],
        message: 'Created .gitignore',
      };
    }

    // Append missing entries.
    const matcher = parseGitignore(content);
    const missing = REQUIRED_ENTRIES.filter(
      (entry) => !matcher.isIgnored(entry.path, entry.isDirectory),
    );
    if (missing.length === 0) {
      return {
        checkId: 'git.gitignore',
        applied: false,
        operations: [],
        message: '.gitignore already covers node_modules and .env',
      };
    }

    const additions = missing
      .map((entry) => (entry.isDirectory ? `${entry.path}/` : entry.path))
      .join('\n');
    if (!dryRun) {
      await copyFile(filePath, backupPath); // backup before modifying
      await appendFile(filePath, `\n${additions}\n`, 'utf8');
    }
    return {
      checkId: 'git.gitignore',
      applied: true,
      operations: [
        { file: '.gitignore', action: 'backup' },
        { file: '.gitignore', action: 'append' },
      ],
      message: `Added ${missing.map((e) => e.path).join(', ')} to .gitignore`,
    };
  },
};
