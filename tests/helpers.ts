import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export function makeTempDir(prefix = 'devdoctor-test-'): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function copyFixture(fixtureName: string, dest?: string): Promise<string> {
  const source = path.join(process.cwd(), 'tests', 'fixtures', fixtureName);
  const target = dest ?? (await makeTempDir());
  await cp(source, target, { recursive: true });
  return target;
}

export function gitAvailable(): boolean {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Initializes a git repository in `dir` and makes an initial commit. */
export function initGitRepo(dir: string): void {
  execFileSync('git', ['init', '-q'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'devdoctor@test.local'], {
    cwd: dir,
    stdio: 'ignore',
  });
  execFileSync('git', ['config', 'user.name', 'DevDoctor Test'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['add', '-A'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir, stdio: 'ignore' });
}

export async function cleanupDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
