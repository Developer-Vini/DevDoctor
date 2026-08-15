import { describe, expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildContext } from '../../src/core/context.js';
import { documentationFixer } from '../../src/fixers/documentation.js';
import { envExampleFixer } from '../../src/fixers/envExample.js';
import { gitignoreFixer } from '../../src/fixers/gitignore.js';
import { cleanupDir, makeTempDir } from '../helpers.js';

describe('gitignoreFixer', () => {
  it('creates a .gitignore covering node_modules and .env', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'package.json'), '{}\n');
      const context = await buildContext(dir);
      const result = await gitignoreFixer.run(context, false);
      expect(result.applied).toBe(true);
      expect(result.operations).toEqual([{ file: '.gitignore', action: 'create' }]);

      const content = await readFile(path.join(dir, '.gitignore'), 'utf8');
      expect(content).toContain('node_modules');
      expect(content).toContain('.env');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('does not write anything in dry-run mode', async () => {
    const dir = await makeTempDir();
    try {
      const context = await buildContext(dir);
      const result = await gitignoreFixer.run(context, true);
      expect(result.applied).toBe(true);
      await expect(readFile(path.join(dir, '.gitignore'), 'utf8')).rejects.toThrow();
    } finally {
      await cleanupDir(dir);
    }
  });

  it('appends missing entries with a backup when .gitignore exists', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, '.gitignore'), 'node_modules/\n');
      const context = await buildContext(dir);
      const result = await gitignoreFixer.run(context, false);
      expect(result.applied).toBe(true);
      expect(result.operations.map((op) => op.action)).toEqual(['backup', 'append']);

      const content = await readFile(path.join(dir, '.gitignore'), 'utf8');
      expect(content).toContain('.env');
      // Backup preserves the original.
      const backup = await readFile(path.join(dir, '.gitignore.devdoctor.bak'), 'utf8');
      expect(backup).toBe('node_modules/\n');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('reports not applied when everything is already covered', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, '.gitignore'), 'node_modules/\n.env\n');
      const context = await buildContext(dir);
      const result = await gitignoreFixer.run(context, false);
      expect(result.applied).toBe(false);
    } finally {
      await cleanupDir(dir);
    }
  });
});

describe('envExampleFixer', () => {
  it('creates .env.example with keys only (no values)', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, '.env'), 'SECRET_KEY=super-secret-value-123\nPORT=3000\n');
      const context = await buildContext(dir);
      const result = await envExampleFixer.run(context, false);
      expect(result.applied).toBe(true);

      const template = await readFile(path.join(dir, '.env.example'), 'utf8');
      expect(template).toContain('SECRET_KEY=');
      expect(template).toContain('PORT=');
      expect(template).not.toContain('super-secret-value-123');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('does nothing when .env.example already exists', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, '.env'), 'A=1\n');
      await writeFile(path.join(dir, '.env.example'), 'A=\n');
      const context = await buildContext(dir);
      const result = await envExampleFixer.run(context, false);
      expect(result.applied).toBe(false);
    } finally {
      await cleanupDir(dir);
    }
  });
});

describe('documentationFixer', () => {
  it('creates a basic README.md when missing', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'package.json'), '{}\n');
      const context = await buildContext(dir);
      const result = await documentationFixer.run(context, false);
      expect(result.applied).toBe(true);

      const readme = await readFile(path.join(dir, 'README.md'), 'utf8');
      expect(readme).toContain('## Installation');
      expect(readme).toContain('## Usage');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('never overwrites an existing README', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'README.md'), '# Custom README\n');
      const context = await buildContext(dir);
      const result = await documentationFixer.run(context, false);
      expect(result.applied).toBe(false);
      expect(await readFile(path.join(dir, 'README.md'), 'utf8')).toBe('# Custom README\n');
    } finally {
      await cleanupDir(dir);
    }
  });
});
