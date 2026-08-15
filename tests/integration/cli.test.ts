import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { cleanupDir, copyFixture, gitAvailable, initGitRepo } from '../helpers.js';

const execFileAsync = promisify(execFile);
const CLI = path.join(process.cwd(), 'dist', 'cli', 'index.js');
const FIXTURES = path.join(process.cwd(), 'tests', 'fixtures');

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function runCli(args: string[], cwd: string): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [CLI, ...args], {
      cwd,
      timeout: 30_000,
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

describe('dev-doctor CLI (built)', () => {
  it('prints help', async () => {
    const { code, stdout } = await runCli(['--help'], path.join(FIXTURES, 'healthy-node-project'));
    expect(code).toBe(0);
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('audit');
  });

  it('prints the version', async () => {
    const { code, stdout } = await runCli(
      ['--version'],
      path.join(FIXTURES, 'healthy-node-project'),
    );
    expect(code).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('exits 0 on a healthy git project with no issues', async () => {
    const dir = await copyFixture('healthy-node-project');
    try {
      initGitRepo(dir);
      const { code, stdout } = await runCli([], dir);
      expect(code).toBe(0);
      expect(stdout).toContain('No issues found');
      expect(stdout).toContain('Health Score: 100/100');
      expect(stdout).toContain('Project detected: TypeScript');
    } finally {
      await cleanupDir(dir);
    }
  }, 60_000);

  it('reports issues and exits 1 on a project with missing docs', async () => {
    const dir = await copyFixture('missing-docs-project');
    try {
      const { code, stdout } = await runCli([], dir);
      expect(code).toBe(1);
      // The summary shows check names; messages appear in `audit` mode.
      expect(stdout).toContain('❌ README');
      expect(stdout).toContain('⚠ Lockfile');
      expect(stdout).toContain('issues found');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('errors on a directory that is not a project', async () => {
    const dir = await copyFixture('broken-project');
    try {
      const { code, stdout } = await runCli([], dir);
      expect(code).toBe(1);
      expect(stdout).toContain('Project detection');
      expect(stdout).toContain('issues found');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('audit prints detailed output', async () => {
    const dir = await copyFixture('missing-docs-project');
    try {
      const { code, stdout } = await runCli(['audit'], dir);
      expect(code).toBe(1);
      expect(stdout).toContain('Severity:');
      expect(stdout).toContain('Fixable:');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('audit --security only runs security checks and finds secrets', async () => {
    const dir = await copyFixture('insecure-node-project');
    try {
      const { code, stdout } = await runCli(['audit', '--security'], dir);
      expect(code).toBe(1);
      expect(stdout).toContain('.env protection');
      expect(stdout).toContain('Possible secret');
      expect(stdout).not.toContain('README');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('--quiet prints one line per issue without banners', async () => {
    const dir = await copyFixture('missing-docs-project');
    try {
      const { code, stdout } = await runCli(['--quiet'], dir);
      expect(code).toBe(1);
      expect(stdout).toContain('ERROR documentation.readme: README missing');
      expect(stdout).not.toContain('🩺');
    } finally {
      await cleanupDir(dir);
    }
  });
  it('fix --dry-run shows what would change without modifying files', async () => {
    const dir = await copyFixture('missing-docs-project');
    try {
      const { code, stdout } = await runCli(['fix', '--dry-run'], dir);
      expect(code).toBe(0);
      expect(stdout).toContain('Would modify:');
      expect(stdout).toContain('.gitignore');
      expect(stdout).toContain('README.md');
      expect(stdout).toContain('No files were changed.');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('fix creates .gitignore and README.md', async () => {
    const dir = await copyFixture('missing-docs-project');
    try {
      const { code } = await runCli(['fix'], dir);
      expect(code).toBe(0);
      const { access } = await import('node:fs/promises');
      await expect(access(path.join(dir, '.gitignore'))).resolves.toBeUndefined();
      await expect(access(path.join(dir, 'README.md'))).resolves.toBeUndefined();
    } finally {
      await cleanupDir(dir);
    }
  });

  it('report --format json emits parseable JSON without secrets', async () => {
    const dir = await copyFixture('insecure-node-project');
    try {
      const { code, stdout } = await runCli(['report', '--format', 'json'], dir);
      expect(code).toBe(1);
      const json = JSON.parse(stdout) as {
        version: string;
        project: { name: string };
        score: number;
        issues: Array<{ id: string }>;
      };
      expect(json.version).toBe('1.0');
      expect(json.project.name).toBe('insecure-node-project');
      expect(typeof json.score).toBe('number');
      expect(json.issues.length).toBeGreaterThan(0);
      expect(stdout).not.toContain('super-secret-value-123');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('report --format markdown emits a markdown report', async () => {
    const dir = await copyFixture('missing-docs-project');
    try {
      const { code, stdout } = await runCli(['report', '--format', 'markdown'], dir);
      expect(code).toBe(1);
      expect(stdout).toContain('# DevDoctor Report');
      expect(stdout).toContain('Health Score');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('explain prints the check description', async () => {
    const dir = await copyFixture('healthy-node-project');
    try {
      const { code, stdout } = await runCli(['explain', 'git.gitignore'], dir);
      expect(code).toBe(0);
      expect(stdout).toContain('git.gitignore');
      expect(stdout).toContain('Checks that a .gitignore exists');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('explain fails for unknown checks', async () => {
    const dir = await copyFixture('healthy-node-project');
    try {
      const { code, stderr } = await runCli(['explain', 'does.not.exist'], dir);
      expect(code).toBe(2);
      expect(stderr).toContain('Unknown check');
    } finally {
      await cleanupDir(dir);
    }
  });

  const maybe = gitAvailable() ? it : it.skip;

  maybe(
    'flags a tracked .env file',
    async () => {
      const dir = await copyFixture('insecure-node-project');
      try {
        initGitRepo(dir);
        const { code, stdout } = await runCli(['audit'], dir);
        expect(code).toBe(1);
        expect(stdout).toContain('.env is tracked by Git');
        expect(stdout).toContain('Severity: critical');
      } finally {
        await cleanupDir(dir);
      }
    },
    60_000,
  );
});
