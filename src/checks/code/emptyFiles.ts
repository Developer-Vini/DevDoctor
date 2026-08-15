import { isSourceFile, readTextFile } from '../../analyzers/files.js';
import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = { id: 'code.empty-files', name: 'Empty files', category: 'code' as const };

export const codeEmptyFilesCheck: Check = {
  ...meta,
  description: 'Detects empty source files.',
  async run(context) {
    const empty: string[] = [];
    for (const file of context.files.filter(isSourceFile)) {
      // readTextFile returns null for unreadable/large files, '' for empty ones.
      const content = await readTextFile(context.projectPath, file);
      if (content === '') empty.push(file);
    }

    if (empty.length === 0) {
      return makeResult(meta, { message: 'No empty source files' });
    }
    return makeResult(meta, {
      status: 'warning',
      severity: 'low',
      message: `${empty.length} empty source file${empty.length === 1 ? '' : 's'}`,
      details: empty.slice(0, 3).join(', '),
      file: empty[0],
      fixable: false,
      scoreImpact: 1,
    });
  },
};
