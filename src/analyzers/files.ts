import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_MAX_BYTES = 512_000;

// Cache of (root -> (relPath -> content promise)) so parallel checks that
// read the same files do not hit the disk repeatedly.
const caches = new Map<string, Map<string, Promise<string | null>>>();

export const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

export function isSourceFile(relPath: string): boolean {
  return SOURCE_EXTENSIONS.has(path.extname(relPath).toLowerCase());
}

export function isTextFile(relPath: string): boolean {
  const ext = path.extname(relPath).toLowerCase();
  return (
    SOURCE_EXTENSIONS.has(ext) ||
    ['.json', '.md', '.yaml', '.yml', '.txt', '.html', '.css'].includes(ext) ||
    path.basename(relPath).startsWith('.env')
  );
}

/**
 * Reads a file as UTF-8 text, returning null when it is unreadable or larger
 * than `maxBytes` (defensive: never load huge files into memory).
 * Results are cached per project root.
 */
export async function readTextFile(
  root: string,
  relPath: string,
  maxBytes = DEFAULT_MAX_BYTES,
): Promise<string | null> {
  let cache = caches.get(root);
  if (cache === undefined) {
    cache = new Map();
    caches.set(root, cache);
  }
  let pending = cache.get(relPath);
  if (pending === undefined) {
    pending = readFileWithinLimit(path.join(root, relPath), maxBytes);
    cache.set(relPath, pending);
  }
  return pending;
}

async function readFileWithinLimit(filePath: string, maxBytes: number): Promise<string | null> {
  try {
    const info = await stat(filePath);
    if (info.size > maxBytes) return null;
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

export function countLines(content: string): number {
  if (content === '') return 0;
  let lines = 1;
  for (const char of content) {
    if (char === '\n') lines += 1;
  }
  return lines;
}
