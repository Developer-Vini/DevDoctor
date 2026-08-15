import { describe, expect, it } from 'vitest';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildContext } from '../../src/core/context.js';
import { configurationPackageJsonCheck } from '../../src/checks/configuration/packageJson.js';
import { dependencyLockfileCheck } from '../../src/checks/dependencies/lockfile.js';
import { documentationReadmeCheck } from '../../src/checks/documentation/readme.js';
import { gitGitignoreCheck } from '../../src/checks/git/gitignore.js';
import { gitRepositoryCheck } from '../../src/checks/git/repository.js';
import { projectDetectionCheck } from '../../src/checks/project/detection.js';
import { projectPackageManagerCheck } from '../../src/checks/project/packageManager.js';
import { securityEnvCheck } from '../../src/checks/security/env.js';
import { cleanupDir, copyFixture, gitAvailable, initGitRepo, makeTempDir } from '../helpers.js';

const FIXTURES = path.join(process.cwd(), 'tests', 'fixtures');

describe('FASE 1 checks', () => {
  it('project.detection passes for a known project and errors for an empty dir', async () => {
    const known = await buildContext(path.join(FIXTURES, 'missing-docs-project'));
    expect((await projectDetectionCheck.run(known)).status).toBe('pass');

    const unknown = await buildContext(path.join(FIXTURES, 'broken-project'));
    const result = await projectDetectionCheck.run(unknown);
    expect(result.status).toBe('error');
    expect(result.severity).toBe('high');
  });

  it('project.package-manager reports unknown when there is no lockfile', async () => {
    const context = await buildContext(path.join(FIXTURES, 'missing-docs-project'));
    const result = await projectPackageManagerCheck.run(context);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('could not be detected');
  });

  it('git.repository warns when the project is not a git repository', async () => {
    const context = await buildContext(path.join(FIXTURES, 'missing-docs-project'));
    const result = await gitRepositoryCheck.run(context);
    expect(result.status).toBe('warning');
    expect(result.message).toBe('Not a Git repository');
  });

  it('git.gitignore warns when .gitignore is missing', async () => {
    const context = await buildContext(path.join(FIXTURES, 'insecure-node-project'));
    const result = await gitGitignoreCheck.run(context);
    expect(result.status).toBe('warning');
    expect(result.message).toBe('Missing .gitignore');
    expect(result.fixable).toBe(true);
  });

  it('git.gitignore warns when node_modules is not covered', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, '.gitignore'), '.env\n');
      const context = await buildContext(dir);
      const result = await gitGitignoreCheck.run(context);
      expect(result.status).toBe('warning');
      expect(result.message).toContain('node_modules');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('documentation.readme errors when README is missing', async () => {
    const context = await buildContext(path.join(FIXTURES, 'missing-docs-project'));
    const result = await documentationReadmeCheck.run(context);
    expect(result.status).toBe('error');
    expect(result.message).toBe('README missing');
  });

  it('documentation.readme warns when README lacks sections', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'README.md'), '# My Project\n\nSome words.\n');
      const context = await buildContext(dir);
      const result = await documentationReadmeCheck.run(context);
      expect(result.status).toBe('warning');
      expect(result.message).toContain('installation');
      expect(result.message).toContain('usage');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('documentation.readme passes when README is complete', async () => {
    const context = await buildContext(path.join(FIXTURES, 'healthy-node-project'));
    const result = await documentationReadmeCheck.run(context);
    expect(result.status).toBe('pass');
  });

  it('dependencies.lockfile warns when no lockfile exists', async () => {
    const context = await buildContext(path.join(FIXTURES, 'missing-docs-project'));
    const result = await dependencyLockfileCheck.run(context);
    expect(result.status).toBe('warning');
    expect(result.message).toBe('No lockfile found');
  });

  it('dependencies.lockfile passes when a lockfile exists', async () => {
    const context = await buildContext(path.join(FIXTURES, 'healthy-node-project'));
    const result = await dependencyLockfileCheck.run(context);
    expect(result.status).toBe('pass');
    expect(result.message).toContain('package-lock.json');
  });

  it('configuration.package-json reports invalid JSON as an error', async () => {
    const dir = await makeTempDir();
    try {
      await writeFile(path.join(dir, 'package.json'), '{ nope\n');
      const context = await buildContext(dir);
      const result = await configurationPackageJsonCheck.run(context);
      expect(result.status).toBe('error');
      expect(result.message).toBe('Unable to read package.json');
      expect(result.details).not.toBeNull();
    } finally {
      await cleanupDir(dir);
    }
  });

  it('configuration.package-json warns about missing scripts', async () => {
    const context = await buildContext(path.join(FIXTURES, 'missing-docs-project'));
    const result = await configurationPackageJsonCheck.run(context);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('no scripts defined');
  });
});

describe('security.env with Git', () => {
  const maybe = gitAvailable() ? it : it.skip;

  maybe('errors when .env is tracked by Git', async () => {
    const dir = await copyFixture('insecure-node-project');
    try {
      initGitRepo(dir);
      const context = await buildContext(dir);
      const result = await securityEnvCheck.run(context);
      expect(result.status).toBe('error');
      expect(result.severity).toBe('critical');
      expect(result.message).toContain('.env is tracked by Git');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('passes when .env exists but is not tracked', async () => {
    const context = await buildContext(path.join(FIXTURES, 'insecure-node-project'));
    const result = await securityEnvCheck.run(context);
    expect(result.status).toBe('pass');
    expect(result.message).toContain('not tracked by Git');
  });
});
