import { isSourceFile, readTextFile } from '../../analyzers/files.js';
import { makeResult } from '../helpers.js';
import type { Check } from '../../types/check.js';

const meta = {
  id: 'dependencies.unused',
  name: 'Unused dependencies',
  category: 'dependencies' as const,
};

const IMPORT_PATTERN =
  /(?:import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\))/g;

export const dependencyUnusedCheck: Check = {
  ...meta,
  description: 'Best-effort detection of runtime dependencies never imported in source files.',
  async run(context) {
    const pkg = context.packageJson;
    if (pkg === null) return makeResult(meta, { message: 'No package.json found' });

    const dependencies = Object.keys(pkg.dependencies ?? {});
    if (dependencies.length === 0) {
      return makeResult(meta, { message: 'No runtime dependencies to verify' });
    }

    const sourceFiles = context.files.filter(isSourceFile);
    if (sourceFiles.length === 0) {
      return makeResult(meta, { message: 'No source files to verify dependency usage' });
    }

    const imported = await findImportedPackages(context.projectPath, sourceFiles);
    const unused = dependencies.filter((name) => !isImported(name, imported));

    if (unused.length > 0) {
      return makeResult(meta, {
        status: 'warning',
        severity: 'low',
        message: `Possibly unused dependencies: ${unused.join(', ')}`,
        details:
          'These packages are declared in dependencies but never imported in source files. Verify before removing.',
        file: 'package.json',
        fixable: false,
        scoreImpact: 2,
      });
    }
    return makeResult(meta, {
      message: 'All dependencies appear to be used',
      file: 'package.json',
    });
  },
};

async function findImportedPackages(root: string, files: string[]): Promise<Set<string>> {
  const imported = new Set<string>();
  for (const file of files) {
    const content = await readTextFile(root, file);
    if (content === null) continue;
    for (const match of content.matchAll(IMPORT_PATTERN)) {
      const specifier = (match[1] ?? match[2] ?? '').trim();
      const name = extractPackageName(specifier);
      if (name !== null) imported.add(name);
    }
  }
  return imported;
}

function extractPackageName(specifier: string): string | null {
  if (
    specifier === '' ||
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('node:')
  ) {
    return null;
  }
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) {
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : (parts[0] ?? null);
  }
  return parts[0] ?? null;
}

function isImported(dependency: string, imported: Set<string>): boolean {
  if (imported.has(dependency)) return true;
  for (const name of imported) {
    if (name.startsWith(`${dependency}/`)) return true;
  }
  return false;
}
