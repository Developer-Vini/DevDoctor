import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildContext } from '../../src/core/context.js';
import { dependencyDuplicatesCheck } from '../../src/checks/dependencies/duplicates.js';
import { dependencyUnusedCheck } from '../../src/checks/dependencies/unused.js';
import { cleanupDir, makeTempDir } from '../helpers.js';

const PACKAGE_JSON = (deps: Record<string, string>, devDeps: Record<string, string> = {}): string =>
  JSON.stringify(
    {
      name: 'fixture',
      version: '1.0.0',
      dependencies: deps,
      devDependencies: devDeps,
    },
    null,
    2,
  );

describe('dependencies.duplicates', () => {
  it('flags packages listed in both dependencies and devDependencies', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(
        path.join(dir, 'package.json'),
        PACKAGE_JSON({ chalk: '^5.0.0' }, { chalk: '^5.0.0' }),
      );
      const context = await buildContext(dir);
      const result = await dependencyDuplicatesCheck.run(context);
      expect(result.status).toBe('warning');
      expect(result.message).toContain('chalk');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('passes when there are no duplicates', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(
        path.join(dir, 'package.json'),
        PACKAGE_JSON({ chalk: '^5.0.0' }, { vitest: '^3.0.0' }),
      );
      const context = await buildContext(dir);
      const result = await dependencyDuplicatesCheck.run(context);
      expect(result.status).toBe('pass');
    } finally {
      await cleanupDir(dir);
    }
  });
});

describe('dependencies.unused', () => {
  it('flags a dependency that is never imported', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'package.json'), PACKAGE_JSON({ lodash: '^4.0.0' }));
      await mkdir(path.join(dir, 'src'), { recursive: true });
      await writeFile(path.join(dir, 'src', 'index.js'), "import chalk from 'chalk';\n");
      const context = await buildContext(dir);
      const result = await dependencyUnusedCheck.run(context);
      expect(result.status).toBe('warning');
      expect(result.message).toContain('lodash');
      expect(result.message).not.toContain('chalk');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('handles scoped and subpath imports', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(
        path.join(dir, 'package.json'),
        PACKAGE_JSON({ '@scope/pkg': '^1.0.0', lodash: '^4.0.0' }),
      );
      await mkdir(path.join(dir, 'src'), { recursive: true });
      await writeFile(
        path.join(dir, 'src', 'index.js'),
        "import { x } from '@scope/pkg';\nconst fp = require('lodash/fp');\n",
      );
      const context = await buildContext(dir);
      const result = await dependencyUnusedCheck.run(context);
      expect(result.status).toBe('pass');
    } finally {
      await cleanupDir(dir);
    }
  });
});
