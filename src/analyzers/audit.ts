import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { PackageManager } from '../types/project.js';

const execFileAsync = promisify(execFile);

export interface VulnerabilityCounts {
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
}

export interface AuditOutcome {
  ok: boolean;
  counts: VulnerabilityCounts;
  error?: string;
}

const ZERO_COUNTS: VulnerabilityCounts = { total: 0, critical: 0, high: 0, moderate: 0, low: 0 };

/**
 * Runs the detected package manager's audit command (`npm audit --json`,
 * `yarn audit --json`, `pnpm audit --json` or `bun audit --json`). Requires
 * network access — only run when the user explicitly asked for it.
 */
export async function runPackageAudit(
  root: string,
  packageManager: PackageManager,
): Promise<AuditOutcome> {
  const { command, args } = auditCommand(packageManager);
  if (command === null) {
    return { ok: false, counts: ZERO_COUNTS, error: 'No supported package manager detected' };
  }
  try {
    const { stdout } = await execFileAsync(command, args, {
      cwd: root,
      timeout: 60_000,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return parseAuditOutput(stdout);
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; message?: string };
    // npm/yarn exit non-zero when vulnerabilities exist but still print JSON.
    if (typeof e.stdout === 'string' && e.stdout.length > 0) {
      return parseAuditOutput(e.stdout);
    }
    return {
      ok: false,
      counts: ZERO_COUNTS,
      error: e.message ?? 'Audit command failed (offline?)',
    };
  }
}

function auditCommand(packageManager: PackageManager): { command: string | null; args: string[] } {
  switch (packageManager) {
    case 'npm':
      return { command: 'npm', args: ['audit', '--json'] };
    case 'yarn':
      return { command: 'yarn', args: ['audit', '--json'] };
    case 'pnpm':
      return { command: 'pnpm', args: ['audit', '--json'] };
    case 'bun':
      return { command: 'bun', args: ['audit', '--json'] };
    default:
      return { command: null, args: [] };
  }
}

function parseAuditOutput(stdout: string): AuditOutcome {
  // npm and pnpm emit a single JSON document.
  try {
    const json = JSON.parse(stdout) as { metadata?: { vulnerabilities?: Record<string, number> } };
    const counts = countsFrom(json.metadata?.vulnerabilities);
    if (counts !== null) return { ok: true, counts };
  } catch {
    // Not a single JSON document — keep scanning.
  }
  // yarn emits newline-delimited JSON; the summary is the last line.
  for (const line of stdout.split('\n').reverse()) {
    try {
      const obj = JSON.parse(line) as { data?: { vulnerabilities?: Record<string, number> } };
      const counts = countsFrom(obj.data?.vulnerabilities);
      if (counts !== null) return { ok: true, counts };
    } catch {
      // Not JSON — keep scanning.
    }
  }
  return { ok: false, counts: ZERO_COUNTS, error: 'Could not parse audit output' };
}

function countsFrom(
  vulnerabilities: Record<string, number> | undefined,
): VulnerabilityCounts | null {
  if (vulnerabilities === undefined) return null;
  const low = (vulnerabilities.low ?? 0) + (vulnerabilities.info ?? 0);
  const counts: VulnerabilityCounts = {
    total: vulnerabilities.total ?? 0,
    critical: vulnerabilities.critical ?? 0,
    high: vulnerabilities.high ?? 0,
    moderate: vulnerabilities.moderate ?? 0,
    low,
  };
  return counts;
}
