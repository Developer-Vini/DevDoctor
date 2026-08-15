import { isSourceFile, readTextFile } from '../../analyzers/files.js';
import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = { id: 'code.todo', name: 'TODO / FIXME', category: 'code' as const };

const MARKER_PATTERN = /\b(TODO|FIXME|HACK|XXX)\b/g;

export const codeTodoCheck: Check = {
  ...meta,
  description: 'Detects TODO/FIXME markers left in source files.',
  async run(context) {
    let total = 0;
    const files: string[] = [];
    for (const file of context.files.filter(isSourceFile)) {
      const content = await readTextFile(context.projectPath, file);
      if (content === null) continue;
      const count = [...content.matchAll(MARKER_PATTERN)].length;
      if (count > 0) {
        total += count;
        files.push(file);
      }
    }

    if (total === 0) {
      return makeResult(meta, { message: 'No TODO or FIXME markers' });
    }
    return makeResult(meta, {
      status: 'warning',
      severity: 'low',
      message: `TODO/FIXME markers found (${total} in ${files.length} file${files.length === 1 ? '' : 's'})`,
      details: files.slice(0, 3).join(', '),
      file: files[0],
      fixable: false,
      scoreImpact: 1,
    });
  },
};
