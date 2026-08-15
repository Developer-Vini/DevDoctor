import { buildContext } from '../../core/context.js';
import { runAudit } from '../../core/runner.js';
import { renderError, renderQuietReport, renderReport } from '../../reporters/terminal.js';
import type { CheckCategory } from '../../types/check.js';
import { createSpinner } from '../ui/spinner.js';

export interface AuditCommandOptions {
  detailed?: boolean;
  quiet?: boolean;
  categories?: CheckCategory[];
  network?: boolean;
  debug?: boolean;
  spinnerEnabled?: boolean;
}

/**
 * Runs the audit and prints the report. Returns the process exit code:
 * 0 = no issues, 1 = issues found, 2 = internal error.
 */
export async function runAuditCommand(
  projectPath: string,
  options: AuditCommandOptions,
): Promise<number> {
  const spinner = createSpinner(options.spinnerEnabled ?? false);
  spinner.start('Analyzing project...');
  try {
    const context = await buildContext(projectPath);
    const report = await runAudit(context, {
      categories: options.categories,
      network: options.network ?? false,
    });
    await spinner.stop();

    const output = options.quiet
      ? renderQuietReport(report)
      : renderReport(report, { detailed: options.detailed ?? false });
    process.stdout.write(`${output}\n`);
    return report.issues.total > 0 ? 1 : 0;
  } catch (error) {
    await spinner.stop();
    process.stderr.write(`${renderError(error, options.debug ?? false)}\n`);
    return 2;
  }
}
