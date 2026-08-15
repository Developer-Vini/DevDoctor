#!/usr/bin/env node
import { Command } from 'commander';
import { registerDefaultChecks } from '../core/registry.js';
import { renderError } from '../reporters/terminal.js';
import { VERSION } from '../version.js';
import type { CheckCategory } from '../types/check.js';
import { runAuditCommand } from './commands/audit.js';
import { disableColor } from './ui/colors.js';

registerDefaultChecks();

const program = new Command();

program
  .name('dev-doctor')
  .description('Run one command. Know the health of your project.')
  .version(VERSION)
  .option('--quiet', 'only print issues; no colors or spinners')
  .option('--no-color', 'disable colored output')
  .option('--no-spinner', 'disable the loading spinner')
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
    process.exitCode = await runAuditCommand(process.cwd(), {
      detailed: true,
      quiet: Boolean(global.quiet),
      categories,
      network: Boolean(commandOptions.security),
      debug: Boolean(global.debug),
      spinnerEnabled: Boolean(global.spinner) && !global.quiet && process.stdout.isTTY === true,
    });
  });

program.action(async () => {
  const global = program.opts();
  if (global.color === false) disableColor();
  process.exitCode = await runAuditCommand(process.cwd(), {
    detailed: false,
    quiet: Boolean(global.quiet),
    debug: Boolean(global.debug),
    spinnerEnabled: Boolean(global.spinner) && !global.quiet && process.stdout.isTTY === true,
  });
});

program.parseAsync(process.argv).catch((error: unknown) => {
  process.stderr.write(`${renderError(error, true)}\n`);
  process.exitCode = 2;
});
