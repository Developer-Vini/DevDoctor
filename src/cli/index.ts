#!/usr/bin/env node
import { Command } from 'commander';
import { registerDefaultFixers } from '../fixers/registry.js';
import { registerDefaultChecks } from '../core/registry.js';
import { renderError } from '../reporters/terminal.js';
import { VERSION } from '../version.js';
import type { CheckCategory } from '../types/check.js';
import { runAuditCommand } from './commands/audit.js';
import { runExplainCommand } from './commands/explain.js';
import { runFixCommand } from './commands/fix.js';
import { runReportCommand } from './commands/report.js';
import { disableColor } from './ui/colors.js';

registerDefaultChecks();
registerDefaultFixers();

const program = new Command();

program
  .name('dev-doctor')
  .description('Run one command. Know the health of your project.')
  .version(VERSION)
  .option('--quiet', 'only print issues; no colors or spinners')
  .option('--no-color', 'disable colored output')
  .option('--no-spinner', 'disable the loading spinner')
  .option('--ci', 'CI mode: no animations, readable output, exit codes')
  .option('--min-score <n>', 'fail in CI mode when the score is below n')
  .option('--verbose', 'enable verbose logging')
  .option('--debug', 'enable debug output including stack traces');

program
  .command('audit')
  .description('Run a detailed audit of the project')
  .option('--security', 'only run security checks')
  .action(async (commandOptions: { security?: boolean }) => {
    const global = program.opts();
    if (global.color === false) disableColor();
    const categories: CheckCategory[] | undefined = commandOptions.security
      ? ['security']
      : undefined;
    const minScore = parseMinScore(global.minScore);
    if (minScore === 'invalid') return;
    process.exitCode = await runAuditCommand(process.cwd(), {
      detailed: true,
      quiet: Boolean(global.quiet),
      categories,
      network: Boolean(commandOptions.security),
      ci: Boolean(global.ci),
      minScore,
      verbose: Boolean(global.verbose),
      debug: Boolean(global.debug),
      spinnerEnabled:
        Boolean(global.spinner) && !global.quiet && !global.ci && process.stdout.isTTY === true,
    });
  });

program
  .command('fix')
  .description('Apply safe fixes for detected issues')
  .option('--dry-run', 'Show what would be modified without changing files')
  .option('--check <id>', 'Only fix the given check')
  .action(async (commandOptions: { dryRun?: boolean; check?: string }) => {
    const global = program.opts();
    if (global.color === false) disableColor();
    process.exitCode = await runFixCommand(process.cwd(), {
      dryRun: Boolean(commandOptions.dryRun),
      checkId: commandOptions.check,
      quiet: Boolean(global.quiet),
      debug: Boolean(global.debug),
      spinnerEnabled: Boolean(global.spinner) && !global.quiet && process.stdout.isTTY === true,
    });
  });

program
  .command('report')
  .description('Generate a report (JSON or Markdown)')
  .option('--format <format>', 'Output format: json or markdown', 'markdown')
  .action(async (commandOptions: { format?: string }) => {
    const global = program.opts();
    if (global.color === false) disableColor();
    const format = commandOptions.format ?? 'markdown';
    if (format !== 'json' && format !== 'markdown') {
      process.stderr.write(`Unsupported format: ${format} (use json or markdown).\n`);
      process.exitCode = 2;
      return;
    }
    process.exitCode = await runReportCommand(process.cwd(), {
      format,
      debug: Boolean(global.debug),
      spinnerEnabled: Boolean(global.spinner) && !global.quiet && process.stdout.isTTY === true,
    });
  });

program
  .command('explain <check-id>')
  .description('Explain a check')
  .action(async (checkId: string) => {
    const global = program.opts();
    if (global.color === false) disableColor();
    process.exitCode = runExplainCommand(checkId);
  });

program.action(async () => {
  const global = program.opts();
  if (global.color === false) disableColor();
  const minScore = parseMinScore(global.minScore);
  if (minScore === 'invalid') return;
  process.exitCode = await runAuditCommand(process.cwd(), {
    detailed: false,
    quiet: Boolean(global.quiet),
    ci: Boolean(global.ci),
    minScore,
    verbose: Boolean(global.verbose),
    debug: Boolean(global.debug),
    spinnerEnabled:
      Boolean(global.spinner) && !global.quiet && !global.ci && process.stdout.isTTY === true,
  });
});

program.parseAsync(process.argv).catch((error: unknown) => {
  process.stderr.write(`${renderError(error, true)}\n`);
  process.exitCode = 2;
});

function parseMinScore(value: string | undefined): number | 'invalid' | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    process.stderr.write(`Invalid --min-score: ${value} (use an integer between 0 and 100).\n`);
    process.exitCode = 2;
    return 'invalid';
  }
  return parsed;
}
