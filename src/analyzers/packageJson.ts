import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { PackageJson } from '../types/project.js';

export interface PackageJsonReadResult {
  data: PackageJson | null;
  /** Error message when the file exists but could not be parsed. */
  error: string | null;
}

export async function readPackageJson(projectPath: string): Promise<PackageJsonReadResult> {
  const filePath = path.join(projectPath, 'package.json');
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch {
    return { data: null, error: null };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { data: null, error: 'package.json is not a JSON object' };
    }
    return { data: parsed as PackageJson, error: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { data: null, error: reason };
  }
}
