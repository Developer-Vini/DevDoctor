import { isSourceFile, readTextFile } from '../../analyzers/files.js';
import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = { id: 'code.console-log', name: 'console.log / debugger', category: 'code' as const };

const DEBUG_PATTERN = /\bconsole\.(log|debug|info)\s*\(|\bdebugger\b/g;

export const codeConsoleLogCheck: Check = {
  ...meta,
  description: 'Detects console.log/debugger statements left in source files.',
  async run(context) {
    const hits: Array<{ file: string; count: number }> = [];
    for (const file of context.files.filter(isSourceFile)) {
      const content = await readTextFile(context.projectPath, file);
      if (content === null) continue;
      const count = [...content.matchAll(DEBUG_PATTERN)].length;
      if (count > 0) hits.push({ file, count });
    }

    if (hits.length === 0) {
      return makeResult(meta, { message: 'No console.log or debugger statements' });
    }

    const total = hits.reduce((sum, hit) => sum + hit.count, 0);
    const listed = hits
      .slice(0, 3)
      .map((hit) => `${hit.file} (${hit.count})`)
      .join(', ');
    return makeResult(meta, {
      status: 'warning',
      severity: 'low',
      message: `console.log/debugger detected (${total} in ${hits.length} file${hits.length === 1 ? '' : 's'})`,
      details: listed,
      file: hits[0]?.file,
      fixable: false,
      scoreImpact: 2,
    });
  },
};
