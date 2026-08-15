import { beforeAll, describe, expect, it } from 'vitest';
import { buildContext } from '../../src/core/context.js';
import { registerCheck, registerDefaultChecks, resetRegistry } from '../../src/core/registry.js';
import { runAudit } from '../../src/core/runner.js';
import path from 'node:path';
import type { Check } from '../../src/types/check.js';

const FIXTURES = path.join(process.cwd(), 'tests', 'fixtures');

describe('runAudit', () => {
  beforeAll(() => {
    resetRegistry();
    registerDefaultChecks();
  });

  it('returns a report with project info and sorted results', async () => {
    const context = await buildContext(path.join(FIXTURES, 'missing-docs-project'));
    const report = await runAudit(context);

    expect(report.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(report.project.name).toBe('missing-docs-project');
    expect(report.project.type).toBe('node');
    expect(report.results.length).toBeGreaterThan(0);

    // Issues count must match the results.
    const nonPassing = report.results.filter((r) => r.status !== 'pass').length;
    expect(report.issues.total).toBe(nonPassing);
    expect(report.issues.errors).toBeGreaterThan(0); // README missing
  });

  it('filters checks by category', async () => {
    const context = await buildContext(path.join(FIXTURES, 'missing-docs-project'));
    const report = await runAudit(context, { categories: ['documentation'] });
    expect(report.results.every((r) => r.category === 'documentation')).toBe(true);
    expect(report.results).toHaveLength(1);
  });

  it('disables checks via rules', async () => {
    const context = await buildContext(path.join(FIXTURES, 'missing-docs-project'));
    const report = await runAudit(context, { rules: { 'documentation.readme': 'off' } });
    expect(report.results.some((r) => r.id === 'documentation.readme')).toBe(false);
  });

  it('upgrades warnings to errors via rules', async () => {
    const context = await buildContext(path.join(FIXTURES, 'missing-docs-project'));
    const report = await runAudit(context, { rules: { 'dependencies.lockfile': 'error' } });
    const lockfile = report.results.find((r) => r.id === 'dependencies.lockfile');
    expect(lockfile?.status).toBe('error');
  });

  it('converts a crashing check into an error result', async () => {
    resetRegistry();
    registerDefaultChecks();
    const crashingCheck: Check = {
      id: 'test.crash',
      name: 'Crashing check',
      description: 'Throws on purpose.',
      category: 'code',
      run: async () => {
        throw new Error('boom');
      },
    };
    registerCheck(crashingCheck);

    const context = await buildContext(path.join(FIXTURES, 'missing-docs-project'));
    const report = await runAudit(context);
    const crashed = report.results.find((r) => r.id === 'test.crash');
    expect(crashed?.status).toBe('error');
    expect(crashed?.message).toContain('crashed');
    expect(crashed?.details).toBe('boom');
  });
});
