import { beforeAll, describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildContext } from '../../src/core/context.js';
import { runAudit } from '../../src/core/runner.js';
import { registerDefaultChecks, resetRegistry } from '../../src/core/registry.js';
import { renderJsonReport } from '../../src/reporters/json.js';
import { renderMarkdownReport } from '../../src/reporters/markdown.js';
import { cleanupDir, makeTempDir } from '../helpers.js';

beforeAll(() => {
  resetRegistry();
  registerDefaultChecks();
});

describe('JSON reporter', () => {
  it('produces a stable structure with score, categories and issues', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'package.json'), '{"name":"demo","version":"1.0.0"}\n');
      await mkdir(path.join(dir, 'src'), { recursive: true });
      await writeFile(path.join(dir, 'src', 'index.js'), "console.log('x');\n");
      const context = await buildContext(dir);
      const report = await runAudit(context);
      const json = JSON.parse(renderJsonReport(report)) as {
        version: string;
        project: { name: string; type: string };
        score: number;
        categories: Record<string, number>;
        issues: Array<{ id: string; severity: string; details: string | null }>;
      };

      expect(json.version).toBe('1.0');
      expect(json.project.name).toBe('demo');
      expect(json.score).toBeGreaterThan(0);
      expect(json.categories.security).toBeGreaterThanOrEqual(0);
      expect(json.issues.length).toBeGreaterThan(0);
      expect(json.issues.some((issue) => issue.id === 'code.console-log')).toBe(true);
    } finally {
      await cleanupDir(dir);
    }
  });

  it('never includes raw secret values', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(
        path.join(dir, 'config.ts'),
        "const API_KEY = 'sk_live_abcd1234abcd1234abcd1234';\n",
      );
      await writeFile(path.join(dir, 'package.json'), '{"name":"demo","version":"1.0.0"}\n');
      const context = await buildContext(dir);
      const report = await runAudit(context);
      const jsonText = renderJsonReport(report);
      expect(jsonText).not.toContain('sk_live_abcd1234abcd1234abcd1234');
      expect(jsonText).toContain('***');
    } finally {
      await cleanupDir(dir);
    }
  });
});

describe('Markdown reporter', () => {
  it('renders a report with headers, score and issues', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'package.json'), '{"name":"demo","version":"1.0.0"}\n');
      const context = await buildContext(dir);
      const report = await runAudit(context);
      const markdown = renderMarkdownReport(report);

      expect(markdown).toContain('# DevDoctor Report');
      expect(markdown).toContain('Health Score');
      expect(markdown).toContain('## Categories');
      expect(markdown).toContain('## Issues (');
      expect(markdown).toContain('`git.gitignore`');
    } finally {
      await cleanupDir(dir);
    }
  });
});
