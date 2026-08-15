import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DevDoctorConfig } from '../types/project.js';

/**
 * Loads user configuration from `.devdoctorrc.json` (preferred) or
 * `devdoctor.config.ts` (ESM module, needs Node type stripping, Node >= 23.6).
 * Never throws: invalid configuration only produces a warning and falls back
 * to defaults.
 */
export async function loadConfig(projectPath: string): Promise<DevDoctorConfig> {
  const jsonPath = path.join(projectPath, '.devdoctorrc.json');
  try {
    const raw = await readFile(jsonPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      warnConfig('.devdoctorrc.json', 'must be a JSON object');
      return {};
    }
    return parsed as DevDoctorConfig;
  } catch (error) {
    if (isFileMissing(error)) {
      // No JSON config — try the TypeScript config below.
    } else {
      warnConfig('.devdoctorrc.json', toReason(error));
      return {};
    }
  }

  const tsPath = path.join(projectPath, 'devdoctor.config.ts');
  try {
    const mod = (await import(pathToFileURL(tsPath).href)) as { default?: unknown };
    const config = mod.default;
    if (config === null || typeof config !== 'object' || Array.isArray(config)) {
      warnConfig('devdoctor.config.ts', 'must export a config object as default');
      return {};
    }
    return config as DevDoctorConfig;
  } catch (error) {
    if (isFileMissing(error)) {
      return {}; // No configuration file at all — defaults apply.
    }
    warnConfig(
      'devdoctor.config.ts',
      `${toReason(error)} (a .ts config needs Node >= 23.6 and a package.json with "type": "module")`,
    );
    return {};
  }
}

function isFileMissing(error: unknown): boolean {
  const code = (error as { code?: string }).code;
  return code === 'ENOENT' || code === 'ERR_MODULE_NOT_FOUND';
}

function toReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function warnConfig(file: string, reason: string): void {
  process.stderr.write(`⚠ Invalid configuration ${file}: ${reason}. Using defaults.\n`);
}
