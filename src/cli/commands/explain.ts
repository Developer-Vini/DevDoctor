import { getCheckById } from '../../core/registry.js';
import { getFixerForCheck } from '../../fixers/registry.js';
import { CATEGORY_LABELS } from '../../reporters/terminal.js';
import { colors } from '../ui/colors.js';

/** Prints an explanation for a check. Returns 0 on success, 2 for unknown ids. */
export function runExplainCommand(checkId: string): number {
  const check = getCheckById(checkId);
  if (check === undefined) {
    process.stderr.write(
      `Unknown check: ${checkId}\n\nRun \`dev-doctor\` to see the list of checks.\n`,
    );
    return 2;
  }

  const fixer = getFixerForCheck(check.id);
  const lines = [
    colors.bold(`${check.name}`),
    colors.dim(`id: ${check.id} · category: ${CATEGORY_LABELS[check.category]}`),
    '',
    check.description,
    '',
    'What the result means:',
    '',
    `  ${colors.success('✓')} pass — no problems detected for this check.`,
    `  ${colors.warn('⚠')} warning — a potential issue was found.`,
    `  ${colors.error('❌')} error — a real problem was found.`,
    '',
    fixer !== undefined
      ? `Safe auto-fix available: run \`dev-doctor fix --check ${check.id}\`.`
      : 'No safe auto-fix is available for this check.',
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
  return 0;
}
