import { countLines, isSourceFile, readTextFile } from '../../analyzers/files.js';
import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const MAX_LINES = 500;

const meta = { id: 'code.large-files', name: 'Large files', category: 'code' as const };

export const codeLargeFilesCheck: Check = {
  ...meta,
  description: `Detects source files with more than ${MAX_LINES} lines.`,
  async run(context) {
    const hits: Array<{ file: string; lines: number }> = [];
    for (const file of context.files.filter(isSourceFile)) {
      const content = await readTextFile(context.projectPath, file);
      if (content === null) continue;
      const lines = countLines(content);
      if (lines > MAX_LINES) hits.push({ file, lines });
    }

    if (hits.length === 0) {
      return makeResult(meta, { message: `No source file exceeds ${MAX_LINES} lines` });
    }
    hits.sort((a, b) => b.lines - a.lines);
    const listed = hits
      .slice(0, 3)
      .map((hit) => `${hit.file} (${hit.lines} lines)`)
      .join(', ');
    return makeResult(meta, {
      status: 'warning',
      severity: 'low',
      message: `${hits.length} source file${hits.length === 1 ? '' : 's'} exceed${hits.length === 1 ? 's' : ''} ${MAX_LINES} lines`,
      details: listed,
      file: hits[0]?.file,
      fixable: false,
      scoreImpact: 3,
    });
  },
};
