import { colors } from '../cli/ui/colors.js';
import type { AuditReport } from '../types/report.js';
import type { CheckCategory, CheckStatus, Severity } from '../types/check.js';

export const CATEGORY_LABELS: Record<CheckCategory, string> = {
  security: 'Security',
  code: 'Code Quality',
  dependencies: 'Dependencies',
  git: 'Git',
  documentation: 'Documentation',
  configuration: 'Configuration',
  project: 'Project',
};

export const CATEGORY_ORDER: readonly CheckCategory[] = [
  'security',
  'code',
  'dependencies',
  'git',
  'documentation',
  'configuration',
  'project',
];

const PROJECT_TYPE_LABELS: Record<string, string> = {
  node: 'Node.js',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  unknown: 'Unknown',
};

export function renderReport(report: AuditReport, options: { detailed?: boolean } = {}): string {
  const detailed = options.detailed ?? false;
  const lines: string[] = [];

  lines.push(`${colors.brand('🩺 DevDoctor')} v${report.version}`);
  lines.push('');
  lines.push(`Analyzing ${report.project.path}...`);
  lines.push('');
  lines.push(
    `  ${statusIcon('pass')} Project detected: ${PROJECT_TYPE_LABELS[report.project.type] ?? report.project.type}`,
  );
  lines.push(`  ${statusIcon('pass')} Package manager: ${report.project.packageManager}`);
  lines.push(
    report.project.isGitRepository
      ? `  ${statusIcon('pass')} Git repository detected`
      : `  ${statusIcon('warning')} Git repository not found`,
  );
  lines.push('');

  for (const category of CATEGORY_ORDER) {
    const results = report.results.filter((result) => result.category === category);
    if (results.length === 0) continue;

    lines.push(colors.bold(CATEGORY_LABELS[category]));
    for (const result of results) {
      lines.push(`  ${statusIcon(result.status)} ${result.name}`);
      if (detailed && result.status !== 'pass') {
        lines.push(`     ${colors.dim(result.message)}`);
        if (result.details) lines.push(`     ${colors.dim(result.details)}`);
        const meta: string[] = [];
        if (result.file) meta.push(`File: ${result.file}`);
        if (result.line !== undefined) meta.push(`Line: ${result.line}`);
        meta.push(`Severity: ${result.severity}`);
        meta.push(result.fixable ? 'Fixable: yes' : 'Fixable: no');
        lines.push(`     ${colors.dim(meta.join(' · '))}`);
      }
    }
    lines.push('');
  }

  if (detailed) {
    lines.push(colors.bold('Score'));
    for (const category of CATEGORY_ORDER) {
      const score = report.categories[category];
      if (score === undefined) continue;
      lines.push(`  ${CATEGORY_LABELS[category].padEnd(18)}${score}/100`);
    }
    if (report.score !== null) {
      lines.push(`  ${'Overall'.padEnd(18)}${colors.bold(`${report.score}/100`)}`);
    }
    lines.push('');
  }

  lines.push(colors.dim('─'.repeat(36)));
  lines.push('');
  if (report.score !== null) {
    lines.push(colors.bold(`Health Score: ${report.score}/100`));
    lines.push('');
  }
  if (report.issues.total === 0) {
    lines.push(colors.success('No issues found. Project looks healthy.'));
  } else {
    lines.push(
      colors.bold(`${report.issues.total} issue${report.issues.total === 1 ? '' : 's'} found`),
    );
    const counts = severityCounts(report);
    for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
      if (counts[severity] > 0) lines.push(`${counts[severity]} ${severity}`);
    }
    lines.push('');
    lines.push('Run:');
    lines.push('');
    lines.push('  dev-doctor audit');
    lines.push('  dev-doctor fix --dry-run');
    lines.push('  dev-doctor report --format json');
  }

  return lines.join('\n');
}

/** Machine-friendly output for --quiet: one line per issue, no colors. */
export function renderQuietReport(report: AuditReport): string {
  const lines: string[] = [];
  for (const result of report.results) {
    if (result.status === 'pass') continue;
    const prefix = result.status === 'error' ? 'ERROR' : 'WARNING';
    lines.push(`${prefix} ${result.id}: ${result.message}`);
  }
  return lines.join('\n');
}

export function renderError(error: unknown, debug = false): string {
  const message = error instanceof Error ? error.message : String(error);
  const lines = [`✖ ${message}`];
  if (debug && error instanceof Error && error.stack) {
    lines.push('');
    lines.push(colors.dim(error.stack));
  }
  lines.push('');
  lines.push('DevDoctor stopped safely.');
  return lines.join('\n');
}

function statusIcon(status: CheckStatus): string {
  if (status === 'pass') return colors.success('✓');
  if (status === 'warning') return colors.warn('⚠');
  return colors.error('❌');
}

function severityCounts(report: AuditReport): Record<Severity, number> {
  const counts: Record<Severity, number> = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
  for (const result of report.results) {
    if (result.status !== 'pass') counts[result.severity] += 1;
  }
  return counts;
}
