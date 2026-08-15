import { scanForSecrets } from '../../analyzers/secrets.js';
import { isTextFile } from '../../analyzers/files.js';
import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const MAX_REPORTED_MATCHES = 4;

const meta = { id: 'security.secrets', name: 'Secrets', category: 'security' as const };

export const securitySecretsCheck: Check = {
  ...meta,
  description: 'Scans source files for hardcoded secrets and API keys.',
  async run(context) {
    const candidates = context.files.filter(isTextFile);
    const matches = await scanForSecrets(context.projectPath, candidates);
    if (matches.length === 0) {
      return makeResult(meta, { message: 'No secrets found' });
    }

    const shown = matches.slice(0, MAX_REPORTED_MATCHES);
    const details = shown
      .map((match) => `${match.file}:${match.line} ${match.maskedValue} (${match.kind})`)
      .join('\n');
    const file = matches[0]?.file;

    return makeResult(meta, {
      status: 'error',
      severity: matches.some((m) => m.kind === 'Private key') ? 'critical' : 'high',
      message: `Possible secret${matches.length === 1 ? '' : 's'} detected (${matches.length} match${matches.length === 1 ? '' : 'es'})`,
      details: `${details}\n\nValues are masked. Rotate any real secret and never commit it.`,
      file,
      fixable: false,
      scoreImpact: 15,
    });
  },
};
