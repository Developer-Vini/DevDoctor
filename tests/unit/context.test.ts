import { describe, expect, it } from 'vitest';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildContext } from '../../src/core/context.js';
import { cleanupDir, copyFixture, makeTempDir } from '../helpers.js';

const FIXTURES = path.join(process.cwd(), 'tests', 'fixtures');

describe('buildContext', () => {
  it('detects a Node.js project without assuming a package manager', async () => {
    const context = await buildContext(path.join(FIXTURES, 'missing-docs-project'));
    expect(context.projectType).toBe('node');
    // No lockfile present: we must not assume npm.
    expect(context.packageManager).toBe('unknown');
    expect(context.packageJson?.name).toBe('missing-docs-project');
    expect(context.packageJsonError).toBeNull();
  });

  it('detects a TypeScript project from tsconfig.json', async () => {
    const context = await buildContext(path.join(FIXTURES, 'healthy-node-project'));
    expect(context.projectType).toBe('typescript');
    expect(context.packageManager).toBe('npm');
  });

  it('detects the package manager from other lockfiles', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'package.json'), '{}\n');

      await writeFile(path.join(dir, 'yarn.lock'), '# yarn lockfile\n');
      expect((await buildContext(dir)).packageManager).toBe('yarn');

      await writeFile(path.join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n');
      expect((await buildContext(dir)).packageManager).toBe('pnpm');

      await writeFile(path.join(dir, 'bun.lock'), '{}\n');
      expect((await buildContext(dir)).packageManager).toBe('bun');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('reports unknown for a directory that is not a project', async () => {
    const context = await buildContext(path.join(FIXTURES, 'broken-project'));
    expect(context.projectType).toBe('unknown');
    expect(context.packageManager).toBe('unknown');
    expect(context.packageJson).toBeNull();
  });

  it('captures invalid package.json without throwing', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'package.json'), '{ invalid json\n');
      const context = await buildContext(dir);
      expect(context.packageJson).toBeNull();
      expect(context.packageJsonError).not.toBeNull();
      // An unparseable package.json cannot be trusted for detection.
      expect(context.projectType).toBe('unknown');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('does not read node_modules content', async () => {
    const dir = await copyFixture('missing-docs-project');
    try {
      const nm = path.join(dir, 'node_modules', 'some-package');
      const { mkdir } = await import('node:fs/promises');
      await mkdir(nm, { recursive: true });
      await writeFile(path.join(nm, 'index.js'), '// big file\n');

      const context = await buildContext(dir);
      expect(context.files.some((file) => file.startsWith('node_modules'))).toBe(false);
    } finally {
      await cleanupDir(dir);
    }
  });
});
