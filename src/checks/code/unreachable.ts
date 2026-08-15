import { analyzeSource, scriptKindFor } from '../../analyzers/ast.js';
import { isSourceFile, readTextFile } from '../../analyzers/files.js';
import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = { id: 'code.unreachable', name: 'Unreachable code', category: 'code' as const };

export const codeUnreachableCheck: Check = {
  ...meta,
  description: 'Detects statements that are obviously unreachable (after return/throw).',
  async run(context) {
    const found: Array<{ file: string; line: number }> = [];
    for (const file of context.files.filter(isSourceFile)) {
      const content = await readTextFile(context.projectPath, file);
      if (content === null) continue;
      found.push(...analyzeSource(content, file, scriptKindFor(file)).unreachable);
    }

    if (found.length === 0) {
      return makeResult(meta, { message: 'No unreachable code found' });
    }
    const shown = found
      .slice(0, 3)
      .map((item) => `${item.file}:${item.line}`)
      .join('\n');
    return makeResult(meta, {
      status: 'warning',
      severity: 'medium',
      message: `${found.length} unreachable statement${found.length === 1 ? '' : 's'} found`,
      details: `${shown}\n\nStatements after return/throw are never executed.`,
      file: found[0]?.file,
      fixable: false,
      scoreImpact: 3,
    });
  },
};
