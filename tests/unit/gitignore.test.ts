import { describe, expect, it } from 'vitest';
import { parseGitignore } from '../../src/core/gitignore.js';

describe('parseGitignore', () => {
  it('ignores node_modules at any depth', () => {
    const matcher = parseGitignore('node_modules/\n');
    expect(matcher.isIgnored('node_modules', true)).toBe(true);
    expect(matcher.isIgnored('node_modules/pkg/index.js', false)).toBe(true);
    expect(matcher.isIgnored('src/node_modules/x.js', false)).toBe(true);
    expect(matcher.isIgnored('src/index.js', false)).toBe(false);
  });

  it('matches plain file patterns at any depth', () => {
    const matcher = parseGitignore('*.log\n');
    expect(matcher.isIgnored('debug.log', false)).toBe(true);
    expect(matcher.isIgnored('logs/out.log', false)).toBe(true);
    expect(matcher.isIgnored('src/main.ts', false)).toBe(false);
  });

  it('anchors root-only patterns with a leading slash', () => {
    const matcher = parseGitignore('/build/\n');
    expect(matcher.isIgnored('build', true)).toBe(true);
    expect(matcher.isIgnored('build/x.js', false)).toBe(true);
    expect(matcher.isIgnored('src/build', true)).toBe(false);
  });

  it('supports double-star globs', () => {
    const matcher = parseGitignore('**/temp\n');
    expect(matcher.isIgnored('temp', false)).toBe(true);
    expect(matcher.isIgnored('a/b/temp', false)).toBe(true);
  });

  it('supports negation, with the last matching rule winning', () => {
    const matcher = parseGitignore('*.log\n!important.log\n');
    expect(matcher.isIgnored('important.log', false)).toBe(false);
    expect(matcher.isIgnored('other.log', false)).toBe(true);
  });

  it('handles comments and blank lines', () => {
    const matcher = parseGitignore('# comment\n\n.env\n');
    expect(matcher.isIgnored('.env', false)).toBe(true);
    expect(matcher.isIgnored('x.ts', false)).toBe(false);
  });

  it('ignores everything inside a directory-only pattern', () => {
    const matcher = parseGitignore('dist/\n');
    expect(matcher.isIgnored('dist', true)).toBe(true);
    expect(matcher.isIgnored('dist/assets/app.js', false)).toBe(true);
  });
});
