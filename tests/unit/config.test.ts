import { describe, expect, it, vi } from 'vitest';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from '../../src/core/config.js';
import { cleanupDir, makeTempDir } from '../helpers.js';

describe('loadConfig', () => {
  it('returns empty defaults when no config file exists', async () => {
    const dir = await makeTempDir();
    try {
      expect(await loadConfig(dir)).toEqual({});
    } finally {
      await cleanupDir(dir);
    }
  });

  it('loads .devdoctorrc.json', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(
        path.join(dir, '.devdoctorrc.json'),
        JSON.stringify({
          exclude: ['generated', 'legacy'],
          rules: { 'security.env': 'error', 'code.console-log': 'warning' },
          minScore: 70,
        }),
      );
      const config = await loadConfig(dir);
      expect(config.exclude).toEqual(['generated', 'legacy']);
      expect(config.rules?.['security.env']).toBe('error');
      expect(config.minScore).toBe(70);
    } finally {
      await cleanupDir(dir);
    }
  });

  it('falls back to defaults with a warning for invalid JSON', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, '.devdoctorrc.json'), '{ not json\n');
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const config = await loadConfig(dir);
      expect(config).toEqual({});
      expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid configuration'));
      writeSpy.mockRestore();
    } finally {
      await cleanupDir(dir);
    }
  });

  it('loads devdoctor.config.ts as an ESM module', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'package.json'), '{"name":"cfg","type":"module"}\n');
      await writeFile(
        path.join(dir, 'devdoctor.config.ts'),
        'export default { exclude: ["generated"], rules: { "git.gitignore": "error" }, minScore: 80 };\n',
      );
      const config = await loadConfig(dir);
      expect(config.exclude).toEqual(['generated']);
      expect(config.rules?.['git.gitignore']).toBe('error');
      expect(config.minScore).toBe(80);
    } finally {
      await cleanupDir(dir);
    }
  });

  it('prefers .devdoctorrc.json over devdoctor.config.ts', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'package.json'), '{"name":"cfg","type":"module"}\n');
      await writeFile(path.join(dir, '.devdoctorrc.json'), '{"minScore": 10}\n');
      await writeFile(path.join(dir, 'devdoctor.config.ts'), 'export default { minScore: 90 };\n');
      const config = await loadConfig(dir);
      expect(config.minScore).toBe(10);
    } finally {
      await cleanupDir(dir);
    }
  });
});
