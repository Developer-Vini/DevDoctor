import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { analyzeSource } from '../../src/analyzers/ast.js';

function analyze(content: string): ReturnType<typeof analyzeSource> {
  return analyzeSource(content, 'test.js', ts.ScriptKind.JS);
}

describe('analyzeSource', () => {
  it('detects functions with large bodies', () => {
    const statements = Array.from({ length: 60 }, (_, i) => `  const v${i} = ${i};`).join('\n');
    const result = analyze(`function big() {\n${statements}\n}\n`);
    expect(result.largeFunctions).toHaveLength(1);
    expect(result.largeFunctions[0]?.name).toBe('big');
    expect(result.largeFunctions[0]?.statements).toBe(60);
  });

  it('does not flag small functions', () => {
    const result = analyze('function small() {\n  return 1;\n}\n');
    expect(result.largeFunctions).toHaveLength(0);
  });

  it('detects unreachable statements after return', () => {
    const result = analyze('function f() {\n  return 1;\n  console.log("never");\n}\n');
    expect(result.unreachable).toHaveLength(1);
    expect(result.unreachable[0]?.line).toBe(3);
  });

  it('detects unreachable statements after throw', () => {
    const result = analyze('function f() {\n  throw new Error("x");\n  doIt();\n}\n');
    expect(result.unreachable).toHaveLength(1);
  });

  it('detects eval and new Function usage', () => {
    const result = analyze('const a = eval("1+1");\nconst b = new Function("return 1");\n');
    expect(result.suspicious.map((s) => s.kind)).toEqual(['eval', 'new Function']);
  });

  it('detects dynamic import with a non-literal argument', () => {
    const result = analyze('const mod = await import(someVariable);\n');
    expect(result.suspicious.map((s) => s.kind)).toContain('dynamic import');
    const literal = analyze('const mod = await import("./x.js");\n');
    expect(literal.suspicious).toHaveLength(0);
  });

  it('returns no findings for clean code', () => {
    const result = analyze(
      'export const value = 1;\nexport function add(a, b) { return a + b; }\n',
    );
    expect(result.largeFunctions).toHaveLength(0);
    expect(result.unreachable).toHaveLength(0);
    expect(result.suspicious).toHaveLength(0);
  });
});
