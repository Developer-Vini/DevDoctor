import { createHash } from 'node:crypto';
import { isSourceFile, readTextFile } from '../../analyzers/files.js';
import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const EXCLUDED = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lock',
  'bun.lockb',
]);
const MAX_GROUPS_SHOWN = 3;

const meta = { id: 'code.duplicate-files', name: 'Duplicate files', category: 'code' as const };

export const codeDuplicateFilesCheck: Check = {
  ...meta,
  description: 'Detects source/text files with identical content.',
  async run(context) {
    const byHash = new Map<string, string[]>();
    for (const file of context.files) {
      if (EXCLUDED.has(file)) continue;
      if (!isSourceFile(file) && !file.endsWith('.md') && !file.endsWith('.json')) continue;
      const content = await readTextFile(context.projectPath, file);
      if (content === null || content === '') continue;
      const hash = createHash('sha256').update(content).digest('hex');
      const group = byHash.get(hash);
      if (group === undefined) {
        byHash.set(hash, [file]);
      } else {
        group.push(file);
      }
    }

    const duplicateGroups = [...byHash.values()].filter((group) => group.length >= 2);
    if (duplicateGroups.length === 0) {
      return makeResult(meta, { message: 'No duplicate files found' });
    }

    const shown = duplicateGroups.slice(0, MAX_GROUPS_SHOWN);
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.length, 0);
    const details = shown
      .map((group) => `${group.length} copies: ${group.slice(0, 3).join(', ')}`)
      .join('\n');
    return makeResult(meta, {
      status: 'warning',
      severity: 'low',
      message: `Duplicate files found (${totalDuplicates} files across ${duplicateGroups.length} group${duplicateGroups.length === 1 ? '' : 's'})`,
      details,
      file: shown[0]?.[0],
      fixable: false,
      scoreImpact: 3,
    });
  },
};
