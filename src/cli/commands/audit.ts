import { loadConfig } from '../../core/config.js';
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
  ci?: boolean;
  /** CLI-provided minimum score; overrides the one from configuration. */
  minScore?: number;
  verbose?: boolean;
  debug?: boolean;
  spinnerEnabled?: boolean;
}

/**
 * Runs the audit and prints the report. Returns the process exit code:
 * 0 = no issues, 1 = issues found (or score below --min-score in CI mode),
 * 2 = internal error.
 */
export async function runAuditCommand(
  projectPath: string,
  options: AuditCommandOptions,
): Promise<number> {
  const spinner = createSpinner(options.spinnerEnabled ?? false);
  spinner.start('Analyzing project...');
  try {
    const config = await loadConfig(projectPath);
    const context = await buildContext(projectPath, config);
    const startedAt = Date.now();
    const report = await runAudit(context, {
      categories: options.categories,
      network: options.network ?? false,
      rules: config.rules,
    });
    const elapsedMs = Date.now() - startedAt;
    await spinner.stop();

    const output = options.quiet
      ? renderQuietReport(report)
      : renderReport(report, { detailed: options.detailed ?? false });
    process.stdout.write(`${output}\n`);

    if (options.verbose) {
      process.stderr.write(
        `verbose: ran ${report.results.length} checks in ${elapsedMs}ms · score ${report.score ?? 'n/a'}/100\n`,
      );
    }

    const minScore = options.minScore ?? config.minScore;
    if (options.ci && minScore !== undefined && report.score !== null && report.score < minScore) {
      process.stdout.write(`CI FAILED\n\nScore: ${report.score}\nRequired: ${minScore}\n`);
      return 1;
    }
    return report.issues.total > 0 ? 1 : 0;
  } catch (error) {
    await spinner.stop();
    process.stderr.write(`${renderError(error, options.debug ?? false)}\n`);
    return 2;
  }
}
