import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Fixer } from '../types/fixer.js';

const ENV_FILES = ['.env', '.env.local', '.env.production', '.env.development'] as const;

export const envExampleFixer: Fixer = {
  checkId: 'security.env',
  description: 'Creates a .env.example with the keys of existing .env files (values stripped).',
  async run(context, dryRun) {
    if (context.files.includes('.env.example')) {
      return {
        checkId: 'security.env',
        applied: false,
        operations: [],
        message: '.env.example already exists',
      };
    }
    const envFile = ENV_FILES.find((file) => context.files.includes(file));
    if (envFile === undefined) {
      return {
        checkId: 'security.env',
        applied: false,
        operations: [],
        message: 'No .env files found',
      };
    }

    let content: string;
    try {
      content = await readFile(path.join(context.projectPath, envFile), 'utf8');
    } catch {
      return {
        checkId: 'security.env',
        applied: false,
        operations: [],
        message: `Unable to read ${envFile}`,
      };
    }

    const template = buildTemplate(content);
    if (!dryRun) {
      await writeFile(path.join(context.projectPath, '.env.example'), template, 'utf8');
    }
    return {
      checkId: 'security.env',
      applied: true,
      operations: [{ file: '.env.example', action: 'create' }],
      message: 'Created .env.example with keys only (no values)',
    };
  },
};

/** Keeps comments and keys; every value is stripped so no secret is written. */
function buildTemplate(content: string): string {
  const lines: string[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      lines.push(line);
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) {
      lines.push(line);
      continue;
    }
    const key = line.slice(0, eq).trim();
    if (key === '') continue;
    lines.push(`${key}=`);
  }
  return `${lines.join('\n')}\n`;
}
