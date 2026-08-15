import { readTextFile } from './files.js';

export interface SecretMatch {
  file: string;
  line: number;
  kind: string;
  /** The secret value, masked — never contains the real value. */
  maskedValue: string;
}

interface SecretPattern {
  kind: string;
  regex: RegExp;
}

const PATTERNS: SecretPattern[] = [
  { kind: 'API key', regex: /\b(?:api[_-]?key|apikey)\s*[:=]\s*["']?([A-Za-z0-9_.-]{12,})/i },
  { kind: 'Secret', regex: /\b(?:secret|client[_-]?secret)\s*[:=]\s*["']?([A-Za-z0-9_.-]{12,})/i },
  { kind: 'Password', regex: /\b(?:password|passwd|pwd)\s*[:=]\s*["']?([^\s"'`;]{8,})/i },
  {
    kind: 'Token',
    regex: /\b(?:token|access[_-]?token|auth[_-]?token)\s*[:=]\s*["']?([A-Za-z0-9_.-]{12,})/i,
  },
  { kind: 'Private key', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { kind: 'AWS access key', regex: /\b(AKIA[0-9A-Z]{16})\b/ },
  { kind: 'GitHub token', regex: /\b(gh[pousr]_[A-Za-z0-9]{20,})\b/ },
  { kind: 'Slack token', regex: /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/ },
  { kind: 'Stripe live key', regex: /\b(sk_live_[A-Za-z0-9]{16,})\b/ },
];

const ENV_FILE = /^\.env/;
const LOCKFILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lock',
  'bun.lockb',
]);
const PLACEHOLDER_EXACT =
  /^(your|example|changeme|change_me|dummy|placeholder|sample|test|foo|bar|xxxx+|true|false|null|undefined|0|1)$/i;
const PLACEHOLDER_PREFIX =
  /^(your|my|example|sample|dummy|test|placeholder|changeme|change_me|foo|bar|xxx+)[-_]/i;

/**
 * Scans the given files for possible secrets. Never returns real values:
 * every match is masked. Files that legitimately hold secrets (.env) and
 * lockfiles are skipped.
 */
export async function scanForSecrets(root: string, files: string[]): Promise<SecretMatch[]> {
  const matches: SecretMatch[] = [];
  for (const file of files) {
    if (ENV_FILE.test(file) || LOCKFILES.has(file)) continue;
    const content = await readTextFile(root, file);
    if (content === null) continue;

    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (line === undefined) continue;
      for (const pattern of PATTERNS) {
        const match = line.match(pattern.regex);
        if (match === null) continue;
        const captured = match[1];
        if (pattern.kind === 'Private key') {
          matches.push({ file, line: index + 1, kind: pattern.kind, maskedValue: '***' });
          break;
        }
        if (captured === undefined || isPlaceholder(captured)) continue;
        matches.push({
          file,
          line: index + 1,
          kind: pattern.kind,
          maskedValue: maskSecret(captured),
        });
        break;
      }
    }
  }
  return matches;
}

export function maskSecret(value: string): string {
  if (value.length <= 4) return '***';
  const head = value.slice(0, 3);
  const tail = value.slice(-2);
  const middle = '*'.repeat(Math.min(12, value.length - 5));
  return `${head}${middle}${tail}`;
}

function isPlaceholder(value: string): boolean {
  if (value.length < 8) return true;
  if (value.length > 200) return true;
  // Values referencing another variable (process.env.X, config.password) are
  // not secrets themselves.
  if (value.includes('process.env') || value.includes('.env')) return true;
  if (value.startsWith('$') || value.startsWith('${')) return true;
  if (value.includes('.')) return true;
  return PLACEHOLDER_EXACT.test(value) || PLACEHOLDER_PREFIX.test(value);
}
