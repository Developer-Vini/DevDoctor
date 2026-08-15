import { analyzeSource, scriptKindFor, type LargeFunction } from '../../analyzers/ast.js';
import { isSourceFile, readTextFile } from '../../analyzers/files.js';
import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = { id: 'code.large-functions', name: 'Large functions', category: 'code' as const };

export const codeLargeFunctionsCheck: Check = {
  ...meta,
  description: 'Detects functions with very large bodies via AST analysis.',
  async run(context) {
    const found: LargeFunction[] = [];
    for (const file of context.files.filter(isSourceFile)) {
      const content = await readTextFile(context.projectPath, file);
      if (content === null) continue;
      found.push(...analyzeSource(content, file, scriptKindFor(file)).largeFunctions);
    }

    if (found.length === 0) {
      return makeResult(meta, { message: 'No large functions found' });
    }
    found.sort((a, b) => b.statements - a.statements);
    const shown = found
      .slice(0, 3)
      .map((fn) => `${fn.file}:${fn.line} ${fn.name} (${fn.statements} stmts, ${fn.lines} lines)`)
      .join('\n');
    return makeResult(meta, {
      status: 'warning',
      severity: 'low',
      message: `${found.length} large function${found.length === 1 ? '' : 's'} found`,
      details: shown,
      file: found[0]?.file,
      fixable: false,
      scoreImpact: 3,
    });
  },
};
