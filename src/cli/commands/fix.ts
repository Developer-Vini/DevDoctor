import { buildContext } from '../../core/context.js';
import { runAudit } from '../../core/runner.js';
import { getFixers } from '../../fixers/registry.js';
import { renderError } from '../../reporters/terminal.js';
import type { FixResult } from '../../types/fixer.js';
import { colors } from '../ui/colors.js';
import { createSpinner } from '../ui/spinner.js';

export interface FixCommandOptions {
  dryRun?: boolean;
  checkId?: string;
  quiet?: boolean;
  debug?: boolean;
  spinnerEnabled?: boolean;
}

/**
 * Applies safe fixes for failing fixable checks. Always returns 0 on success;
 * 2 on internal error. Never modifies files in --dry-run mode.
 */
export async function runFixCommand(
  projectPath: string,
  options: FixCommandOptions,
): Promise<number> {
  const spinner = createSpinner(options.spinnerEnabled ?? false);
  spinner.start('Analyzing issues...');
  try {
    const context = await buildContext(projectPath);
    const report = await runAudit(context);
    await spinner.stop();

    const fixers = getFixers().filter((fixer) => {
      if (options.checkId !== undefined && fixer.checkId !== options.checkId) return false;
      return report.results.some(
        (result) => result.id === fixer.checkId && result.status !== 'pass',
      );
    });

    if (fixers.length === 0) {
      const message =
        options.checkId !== undefined
          ? `No fixable issue found for check "${options.checkId}".`
          : 'Nothing to fix. All fixable checks are healthy.';
      process.stdout.write(`${message}\n`);
      return 0;
    }

    const results: FixResult[] = [];
    for (const fixer of fixers) {
      results.push(await fixer.run(context, options.dryRun ?? false));
    }
    const applied = results.filter((result) => result.applied);
    if (applied.length === 0) {
      process.stdout.write('Nothing to fix. All fixable checks are healthy.\n');
      return 0;
    }

    if (options.dryRun ?? false) {
      const files = uniqueFiles(applied);
      const lines = ['Would modify:', ''];
      for (const file of files) lines.push(file);
      lines.push('');
      lines.push('No files were changed.');
      process.stdout.write(`${lines.join('\n')}\n`);
    } else {
      const lines = [`Fixed ${applied.length} issue${applied.length === 1 ? '' : 's'}:`, ''];
      for (const result of applied) {
        for (const operation of result.operations) {
          if (operation.action === 'backup') continue;
          lines.push(`  ${colors.success('✓')} ${operation.file} (${operation.action})`);
        }
      }
      process.stdout.write(`${lines.join('\n')}\n`);
    }
    return 0;
  } catch (error) {
    await spinner.stop();
    process.stderr.write(`${renderError(error, options.debug ?? false)}\n`);
    return 2;
  }
}

function uniqueFiles(results: FixResult[]): string[] {
  const files = new Set<string>();
  for (const result of results) {
    for (const operation of result.operations) {
      files.add(operation.file);
    }
  }
  return [...files].sort();
}
