import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildContext } from '../../src/core/context.js';
import { codeConsoleLogCheck } from '../../src/checks/code/consoleLog.js';
import { codeDuplicateFilesCheck } from '../../src/checks/code/duplicateFiles.js';
import { codeEmptyFilesCheck } from '../../src/checks/code/emptyFiles.js';
import { codeLargeFilesCheck } from '../../src/checks/code/largeFiles.js';
import { codeTodoCheck } from '../../src/checks/code/todo.js';
import { cleanupDir, makeTempDir } from '../helpers.js';

async function makeProject(files: Record<string, string>): Promise<string> {
  const dir = await makeTempDir();
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(dir, rel);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return dir;
}

describe('code.console-log', () => {
  it('warns when console.log is present in source files', async () => {
    const dir = await makeProject({
      'src/index.js': "console.log('hello');\nconst x = 1;\n",
    });
    try {
      const context = await buildContext(dir);
      const result = await codeConsoleLogCheck.run(context);
      expect(result.status).toBe('warning');
      expect(result.message).toContain('console.log');
      expect(result.file).toBe('src/index.js');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('detects debugger statements', async () => {
    const dir = await makeProject({ 'src/a.ts': 'function f() {\n  debugger;\n}\n' });
    try {
      const context = await buildContext(dir);
      const result = await codeConsoleLogCheck.run(context);
      expect(result.status).toBe('warning');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('passes on clean source', async () => {
    const dir = await makeProject({ 'src/a.ts': 'export const x = 1;\n' });
    try {
      const context = await buildContext(dir);
      expect((await codeConsoleLogCheck.run(context)).status).toBe('pass');
    } finally {
      await cleanupDir(dir);
    }
  });
});

describe('code.todo', () => {
  it('warns when TODO markers are present', async () => {
    const dir = await makeProject({ 'src/a.ts': '// TODO: handle edge case\nconst x = 1;\n' });
    try {
      const context = await buildContext(dir);
      const result = await codeTodoCheck.run(context);
      expect(result.status).toBe('warning');
      expect(result.message).toContain('TODO');
    } finally {
      await cleanupDir(dir);
    }
  });
});

describe('code.large-files', () => {
  it('flags files over 500 lines', async () => {
    const content = Array.from({ length: 520 }, (_, i) => `const v${i} = ${i};`).join('\n');
    const dir = await makeProject({ 'src/big.ts': `${content}\n` });
    try {
      const context = await buildContext(dir);
      const result = await codeLargeFilesCheck.run(context);
      expect(result.status).toBe('warning');
      expect(result.message).toContain('500 lines');
      expect(result.details).toContain('521 lines');
    } finally {
      await cleanupDir(dir);
    }
  });
});

describe('code.empty-files', () => {
  it('flags empty source files', async () => {
    const dir = await makeProject({ 'src/empty.js': '' });
    try {
      const context = await buildContext(dir);
      const result = await codeEmptyFilesCheck.run(context);
      expect(result.status).toBe('warning');
      expect(result.message).toContain('empty');
    } finally {
      await cleanupDir(dir);
    }
  });
});

describe('code.duplicate-files', () => {
  it('flags identical files', async () => {
    const dir = await makeProject({
      'src/a.js': 'export const value = 42;\n',
      'src/b.js': 'export const value = 42;\n',
    });
    try {
      const context = await buildContext(dir);
      const result = await codeDuplicateFilesCheck.run(context);
      expect(result.status).toBe('warning');
      expect(result.message).toContain('Duplicate');
      expect(result.details).toContain('a.js');
      expect(result.details).toContain('b.js');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('passes when files differ', async () => {
    const dir = await makeProject({
      'src/a.js': 'export const value = 1;\n',
      'src/b.js': 'export const value = 2;\n',
    });
    try {
      const context = await buildContext(dir);
      expect((await codeDuplicateFilesCheck.run(context)).status).toBe('pass');
    } finally {
      await cleanupDir(dir);
    }
  });
});
