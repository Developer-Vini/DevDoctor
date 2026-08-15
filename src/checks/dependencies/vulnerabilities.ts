import { runPackageAudit } from '../../analyzers/audit.js';
import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = {
  id: 'dependencies.vulnerabilities',
  name: 'Vulnerable dependencies',
  category: 'security' as const,
};

export const dependencyVulnerabilitiesCheck: Check = {
  ...meta,
  description: 'Runs the package manager audit for known vulnerabilities (requires network).',
  requiresNetwork: true,
  async run(context) {
    if (context.packageJson === null) {
      return makeResult(meta, { message: 'No package.json found — nothing to audit' });
    }
    const outcome = await runPackageAudit(context.projectPath, context.packageManager);
    if (!outcome.ok) {
      return makeResult(meta, {
        status: 'warning',
        severity: 'medium',
        message: 'Unable to run dependency audit',
        details: outcome.error ?? 'Unknown error',
        fixable: false,
        scoreImpact: 3,
      });
    }

    const { counts } = outcome;
    if (counts.total === 0) {
      return makeResult(meta, { message: 'No known vulnerabilities found' });
    }

    const bySeverity = [
      ['critical', counts.critical],
      ['high', counts.high],
      ['moderate', counts.moderate],
      ['low', counts.low],
    ]
      .filter(([, n]) => (n as number) > 0)
      .map(([label, n]) => `${n} ${label}`)
      .join(', ');

    return makeResult(meta, {
      status: 'error',
      severity: counts.critical > 0 ? 'critical' : counts.high > 0 ? 'high' : 'medium',
      message: `${counts.total} known vulnerabilit${counts.total === 1 ? 'y' : 'ies'} found (${bySeverity})`,
      details: 'Run the audit command of your package manager and update the affected packages.',
      fixable: false,
      scoreImpact: 15,
    });
  },
};
