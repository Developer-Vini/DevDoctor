import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { scanProject } from '../../src/core/scanner.js';
import { cleanupDir, makeTempDir } from '../helpers.js';

describe('scanProject', () => {
  it('collects files and directories recursively', async () => {
    const dir = await makeTempDir();
    try {
      await mkdir(path.join(dir, 'src'), { recursive: true });
      await writeFile(path.join(dir, 'src', 'index.js'), '// code\n');
      await writeFile(path.join(dir, 'package.json'), '{}\n');

      const result = await scanProject(dir);
      expect(result.files.sort()).toEqual(['package.json', 'src/index.js']);
      expect(result.directories).toContain('src');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('skips default ignored directories', async () => {
    const dir = await makeTempDir();
    try {
      for (const ignored of ['node_modules', 'dist', 'build', 'coverage', '.git', '.cache']) {
        await mkdir(path.join(dir, ignored), { recursive: true });
        await writeFile(path.join(dir, ignored, 'file.js'), '// code\n');
      }
      await writeFile(path.join(dir, 'keep.js'), '// code\n');

      const result = await scanProject(dir);
      expect(result.files).toEqual(['keep.js']);
    } finally {
      await cleanupDir(dir);
    }
  });

  it('respects extra excludes', async () => {
    const dir = await makeTempDir();
    try {
      await mkdir(path.join(dir, 'generated'), { recursive: true });
      await writeFile(path.join(dir, 'generated', 'out.js'), '// code\n');
      await writeFile(path.join(dir, 'main.js'), '// code\n');

      const result = await scanProject(dir, { exclude: ['generated'] });
      expect(result.files).toEqual(['main.js']);
    } finally {
      await cleanupDir(dir);
    }
  });

  it('respects .gitignore patterns', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, '.gitignore'), '*.log\n/tmp/\n');
      await writeFile(path.join(dir, 'debug.log'), 'log\n');
      await mkdir(path.join(dir, 'tmp'), { recursive: true });
      await writeFile(path.join(dir, 'tmp', 'x.js'), '// code\n');
      await writeFile(path.join(dir, 'main.js'), '// code\n');

      const result = await scanProject(dir);
      expect(result.files).toEqual(['.gitignore', 'main.js']);
    } finally {
      await cleanupDir(dir);
    }
  });

  it('skips symlinks', async () => {
    const dir = await makeTempDir();
    try {
      await mkdir(path.join(dir, 'real'), { recursive: true });
      await writeFile(path.join(dir, 'real', 'file.js'), '// code\n');
      await writeFile(path.join(dir, 'plain.js'), '// code\n');
      // A dangling symlink would break naive walkers.
      try {
        const { symlink } = await import('node:fs/promises');
        await symlink(path.join(dir, 'does-not-exist'), path.join(dir, 'dangling-link'));
      } catch {
        // Symlinks unsupported on this platform — skip the assertion.
      }

      const result = await scanProject(dir);
      expect(result.files).toContain('real/file.js');
      expect(result.files).toContain('plain.js');
    } finally {
      await cleanupDir(dir);
    }
  });
});
