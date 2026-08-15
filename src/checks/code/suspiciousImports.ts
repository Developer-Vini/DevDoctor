import { analyzeSource, scriptKindFor, type SuspiciousCode } from '../../analyzers/ast.js';
import { isSourceFile, readTextFile } from '../../analyzers/files.js';
import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const KIND_LABELS: Record<SuspiciousCode['kind'], string> = {
  eval: 'eval()',
  'new Function': 'new Function()',
  'dynamic import': 'dynamic import() with non-literal argument',
};

const meta = {
  id: 'code.suspicious-imports',
  name: 'Suspicious dynamic code',
  category: 'code' as const,
};

export const codeSuspiciousImportsCheck: Check = {
  ...meta,
  description: 'Detects dynamic code execution: eval(), new Function() and non-literal import().',
  async run(context) {
    const found: SuspiciousCode[] = [];
    for (const file of context.files.filter(isSourceFile)) {
      const content = await readTextFile(context.projectPath, file);
      if (content === null) continue;
      found.push(...analyzeSource(content, file, scriptKindFor(file)).suspicious);
    }

    if (found.length === 0) {
      return makeResult(meta, { message: 'No suspicious dynamic code found' });
    }
    const shown = found
      .slice(0, 3)
      .map((item) => `${item.file}:${item.line} ${KIND_LABELS[item.kind]}`)
      .join('\n');
    return makeResult(meta, {
      status: 'warning',
      severity: 'low',
      message: `${found.length} suspicious dynamic code usage${found.length === 1 ? '' : 's'} found`,
      details: `${shown}\n\neval() and new Function() can execute arbitrary code — avoid them where possible.`,
      file: found[0]?.file,
      fixable: false,
      scoreImpact: 2,
    });
  },
};
