import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseGitignore } from './gitignore.js';

export const DEFAULT_IGNORED_DIRECTORIES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.tmp',
  '.DS_Store',
];

export interface ScanOptions {
  /** Extra directory names to ignore (e.g. from user configuration). */
  exclude?: string[];
  /** Hard cap on the number of files collected, to protect against pathological projects. */
  maxFiles?: number;
}

export interface ScanResult {
  /** Relative POSIX paths of every regular file found. */
  files: string[];
  directories: string[];
  /** True when the file cap was reached and the scan was cut short. */
  truncated: boolean;
}

/**
 * Walks a project directory collecting files and directories.
 * Skips symlinks entirely (avoids loops and path traversal), respects a
 * .gitignore at the root when present, and silently skips unreadable entries.
 */
export async function scanProject(root: string, options: ScanOptions = {}): Promise<ScanResult> {
  const maxFiles = options.maxFiles ?? 50_000;
  const ignoredNames = new Set([...DEFAULT_IGNORED_DIRECTORIES, ...(options.exclude ?? [])]);

  let gitignoreMatcher: ReturnType<typeof parseGitignore> | null = null;
  try {
    const content = await readFile(path.join(root, '.gitignore'), 'utf8');
    gitignoreMatcher = parseGitignore(content);
  } catch {
    gitignoreMatcher = null;
  }

  const files: string[] = [];
  const directories: string[] = [];
  const pending: string[] = [''];
  let truncated = false;

  while (pending.length > 0 && !truncated) {
    const relativeDir = pending.pop();
    if (relativeDir === undefined) break;

    const absoluteDir = path.join(root, relativeDir);
    let entries;
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true });
    } catch {
      // Unreadable directory (permissions, deleted mid-scan, ...): skip it.
      continue;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) {
        truncated = true;
        break;
      }
      if (entry.isSymbolicLink()) continue;

      const relative = relativeDir === '' ? entry.name : `${relativeDir}/${entry.name}`;
      if (ignoredNames.has(entry.name)) continue;
      if (gitignoreMatcher !== null && gitignoreMatcher.isIgnored(relative, entry.isDirectory())) {
        continue;
      }

      if (entry.isDirectory()) {
        directories.push(relative);
        pending.push(relative);
      } else if (entry.isFile()) {
        files.push(relative);
      }
    }
  }

  return { files, directories, truncated };
}
