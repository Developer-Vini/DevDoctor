import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function detectGitExecutable(): Promise<boolean> {
  try {
    await execFileAsync('git', ['--version'], { timeout: 5000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

export async function isGitRepository(dir: string): Promise<boolean> {
  try {
    const gitPath = await stat(path.join(dir, '.git'));
    // .git can be a directory (normal repo) or a file (worktree/submodule).
    return gitPath.isDirectory() || gitPath.isFile();
  } catch {
    return false;
  }
}

/** Returns files tracked by Git (relative POSIX paths), or [] on any failure. */
export async function listTrackedFiles(dir: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync('git', ['ls-files', '-z'], {
      cwd: dir,
      timeout: 10_000,
      windowsHide: true,
    });
    return stdout.split('\0').filter((file) => file.length > 0);
  } catch {
    return [];
  }
}

export function isTracked(trackedFiles: string[], relativePath: string): boolean {
  return trackedFiles.includes(relativePath);
}
