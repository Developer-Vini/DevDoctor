import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildContext } from '../../src/core/context.js';
import { maskSecret, scanForSecrets } from '../../src/analyzers/secrets.js';
import { securitySecretsCheck } from '../../src/checks/security/secrets.js';
import { cleanupDir, makeTempDir } from '../helpers.js';

describe('maskSecret', () => {
  it('masks the middle of the value keeping only a hint', () => {
    expect(maskSecret('sk_live_abc123def456')).toBe('sk_************56');
  });

  it('never returns the full value', () => {
    expect(maskSecret('ghp_abcdefghijklmnopqrstuvwxyzABCDEFGHIJ')).not.toContain(
      'ghp_abcdefghijklmnopqrstuvwxyz',
    );
  });
});

describe('scanForSecrets', () => {
  it('detects hardcoded API keys with masked values', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'config.ts'), "const API_KEY = 'sk_live_abc123def456';\n");
      const matches = await scanForSecrets(dir, ['config.ts']);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.line).toBe(1);
      expect(matches[0]?.maskedValue).not.toContain('abc123def456');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('skips .env files and lockfiles', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, '.env'), 'API_KEY=supersecretvalue123\n');
      await writeFile(path.join(dir, 'package-lock.json'), '{"lockfileVersion": 3}\n');
      const matches = await scanForSecrets(dir, ['.env', 'package-lock.json']);
      expect(matches).toHaveLength(0);
    } finally {
      await cleanupDir(dir);
    }
  });

  it('ignores placeholder values', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'a.ts'), "const API_KEY = 'your-api-key-here';\n");
      await writeFile(path.join(dir, 'b.ts'), 'const API_KEY = process.env.API_KEY;\n');
      const matches = await scanForSecrets(dir, ['a.ts', 'b.ts']);
      expect(matches).toHaveLength(0);
    } finally {
      await cleanupDir(dir);
    }
  });
});

describe('security.secrets check', () => {
  it('reports an error with line info and masked details', async () => {
    const dir = await makeTempDir();
    try {
      await mkdir(path.join(dir, 'src'), { recursive: true });
      await writeFile(
        path.join(dir, 'src', 'config.ts'),
        "const TOKEN = 'ghp_abcdefghijklmnopqrstuvwxyzABCDEFGHIJ';\n",
      );
      const context = await buildContext(dir);
      const result = await securitySecretsCheck.run(context);
      expect(result.status).toBe('error');
      expect(result.severity).toBe('high');
      expect(result.message).toContain('secret');
      expect(result.details).toContain('src/config.ts:1');
      expect(result.details).not.toContain('ghp_abcdefghijklmnopqrstuvwxyzABCDEFGHIJ');
      expect(result.details).toContain('***');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('passes when no secrets are found', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'a.ts'), 'export const x = 1;\n');
      const context = await buildContext(dir);
      const result = await securitySecretsCheck.run(context);
      expect(result.status).toBe('pass');
    } finally {
      await cleanupDir(dir);
    }
  });
});
