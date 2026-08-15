import { loadConfig } from '../../core/config.js';
import { buildContext } from '../../core/context.js';
import { runAudit } from '../../core/runner.js';
import { renderJsonReport } from '../../reporters/json.js';
import { renderMarkdownReport } from '../../reporters/markdown.js';
import { renderError } from '../../reporters/terminal.js';
import { createSpinner } from '../ui/spinner.js';

export type ReportFormat = 'json' | 'markdown';

export interface ReportCommandOptions {
  format: ReportFormat;
  debug?: boolean;
  spinnerEnabled?: boolean;
}

export async function runReportCommand(
  projectPath: string,
  options: ReportCommandOptions,
): Promise<number> {
  const spinner = createSpinner(options.spinnerEnabled ?? false);
  spinner.start('Analyzing project...');
  try {
    const config = await loadConfig(projectPath);
    const context = await buildContext(projectPath, config);
    const report = await runAudit(context, { rules: config.rules });
    await spinner.stop();

    const output =
      options.format === 'json' ? renderJsonReport(report) : renderMarkdownReport(report);
    process.stdout.write(`${output}\n`);
    return report.issues.total > 0 ? 1 : 0;
  } catch (error) {
    await spinner.stop();
    process.stderr.write(`${renderError(error, options.debug ?? false)}\n`);
    return 2;
  }
}
