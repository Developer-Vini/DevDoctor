import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildContext } from '../../src/core/context.js';
import { codeLargeFunctionsCheck } from '../../src/checks/code/largeFunctions.js';
import { codeSuspiciousImportsCheck } from '../../src/checks/code/suspiciousImports.js';
import { codeUnreachableCheck } from '../../src/checks/code/unreachable.js';
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

describe('code.large-functions', () => {
  it('flags a large TypeScript function', async () => {
    const statements = Array.from({ length: 60 }, (_, i) => `    const v${i} = ${i};`).join('\n');
    const dir = await makeProject({
      'src/big.ts': `export function big(): void {\n${statements}\n}\n`,
    });
    try {
      const context = await buildContext(dir);
      const result = await codeLargeFunctionsCheck.run(context);
      expect(result.status).toBe('warning');
      expect(result.message).toContain('large function');
      expect(result.details).toContain('src/big.ts:1');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('passes on well-sized functions', async () => {
    const dir = await makeProject({
      'src/a.ts': 'export function f(): number {\n  return 1;\n}\n',
    });
    try {
      const context = await buildContext(dir);
      expect((await codeLargeFunctionsCheck.run(context)).status).toBe('pass');
    } finally {
      await cleanupDir(dir);
    }
  });
});

describe('code.unreachable', () => {
  it('flags code after a return statement', async () => {
    const dir = await makeProject({
      'src/a.js': 'function f() {\n  return 1;\n  console.log("never");\n}\n',
    });
    try {
      const context = await buildContext(dir);
      const result = await codeUnreachableCheck.run(context);
      expect(result.status).toBe('warning');
      expect(result.severity).toBe('medium');
      expect(result.message).toContain('unreachable');
    } finally {
      await cleanupDir(dir);
    }
  });
});

describe('code.suspicious-imports', () => {
  it('flags eval usage', async () => {
    const dir = await makeProject({ 'src/a.js': 'const result = eval("1+1");\n' });
    try {
      const context = await buildContext(dir);
      const result = await codeSuspiciousImportsCheck.run(context);
      expect(result.status).toBe('warning');
      expect(result.details).toContain('eval()');
    } finally {
      await cleanupDir(dir);
    }
  });

  it('passes on static imports', async () => {
    const dir = await makeProject({ 'src/a.js': "import x from 'chalk';\nexport default x;\n" });
    try {
      const context = await buildContext(dir);
      expect((await codeSuspiciousImportsCheck.run(context)).status).toBe('pass');
    } finally {
      await cleanupDir(dir);
    }
  });
});
