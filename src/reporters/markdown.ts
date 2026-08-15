import type { AuditReport } from '../types/report.js';
import type { CheckResult } from '../types/check.js';
import { CATEGORY_LABELS, CATEGORY_ORDER } from './terminal.js';

export function renderMarkdownReport(report: AuditReport): string {
  const lines: string[] = [];
  lines.push('# DevDoctor Report');
  lines.push('');
  lines.push(
    `**Project:** \`${report.project.name}\` (${report.project.type}) · **Package manager:** ${report.project.packageManager}`,
  );
  lines.push('');
  lines.push(`**Health Score:** ${report.score ?? 'n/a'}/100`);
  lines.push('');
  lines.push('## Categories');
  lines.push('');
  lines.push('| Category | Score |');
  lines.push('| --- | --- |');
  for (const category of CATEGORY_ORDER) {
    const score = report.categories[category];
    if (score === undefined) continue;
    lines.push(`| ${CATEGORY_LABELS[category]} | ${score}/100 |`);
  }
  lines.push('');

  const issues = report.results.filter((result) => result.status !== 'pass');
  lines.push(`## Issues (${report.issues.total})`);
  lines.push('');
  if (issues.length === 0) {
    lines.push('No issues found. 🎉');
  } else {
    for (const issue of issues) {
      lines.push(`### ${statusMarker(issue)} ${issue.name} (\`${issue.id}\`) — ${issue.severity}`);
      lines.push('');
      lines.push(issue.message);
      if (issue.details) {
        lines.push('');
        lines.push('```');
        lines.push(issue.details);
        lines.push('```');
      }
      const meta: string[] = [];
      if (issue.file) meta.push(`File: \`${issue.file}\``);
      if (issue.line !== undefined) meta.push(`Line: ${issue.line}`);
      meta.push(`Fixable: ${issue.fixable ? 'yes' : 'no'}`);
      lines.push('');
      lines.push(meta.join(' · '));
      lines.push('');
    }
  }
  return lines.join('\n');
}

function statusMarker(result: CheckResult): string {
  if (result.status === 'error') return '❌';
  if (result.status === 'warning') return '⚠️';
  return 'ℹ️';
}
