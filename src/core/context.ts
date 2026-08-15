import path from 'node:path';
import { detectGitExecutable, isGitRepository, listTrackedFiles } from '../analyzers/git.js';
import { readPackageJson } from '../analyzers/packageJson.js';
import { scanProject } from './scanner.js';
import type {
  DevDoctorConfig,
  PackageJson,
  PackageManager,
  ProjectContext,
  ProjectType,
} from '../types/project.js';

const LOCKFILES: readonly string[] = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lock',
  'bun.lockb',
];

/**
 * Builds a ProjectContext for the given directory. Never throws for ordinary
 * project problems: detection failures are captured in the context fields so
 * checks can report them.
 */
export async function buildContext(
  projectPath: string,
  config: DevDoctorConfig = {},
): Promise<ProjectContext> {
  const root = path.resolve(projectPath);
  const scan = await scanProject(root, { exclude: config.exclude });
  const files = [...scan.files].sort();

  const packageJsonResult = await readPackageJson(root);
  const packageJson = packageJsonResult.data;

  const lockfiles = files.filter((file) => LOCKFILES.includes(file));
  const packageManager = detectPackageManager(lockfiles);
  const projectType = detectProjectType(packageJson, files);

  const gitExecutable = await detectGitExecutable();
  const isRepository = await isGitRepository(root);
  const trackedFiles = isRepository ? await listTrackedFiles(root) : [];

  const projectName = packageJson?.name ?? path.basename(root);

  return {
    projectPath: root,
    projectName,
    projectType,
    packageManager,
    nodeVersion: process.version,
    packageJson,
    packageJsonError: packageJsonResult.error,
    isGitRepository: isRepository,
    gitExecutable,
    trackedFiles,
    files,
    directories: scan.directories,
    lockfiles,
    config,
  };
}

function detectPackageManager(lockfiles: string[]): PackageManager {
  if (lockfiles.includes('bun.lock') || lockfiles.includes('bun.lockb')) return 'bun';
  if (lockfiles.includes('pnpm-lock.yaml')) return 'pnpm';
  if (lockfiles.includes('yarn.lock')) return 'yarn';
  if (lockfiles.includes('package-lock.json')) return 'npm';
  return 'unknown';
}

function detectProjectType(packageJson: PackageJson | null, files: string[]): ProjectType {
  if (packageJson !== null) {
    const allDeps: Record<string, string> = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    const hasTsconfig = files.includes('tsconfig.json');
    if (hasTsconfig || 'typescript' in allDeps) return 'typescript';
    return 'node';
  }

  let hasTypeScript = false;
  let hasJavaScript = false;
  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.tsx')) hasTypeScript = true;
    if (
      file.endsWith('.js') ||
      file.endsWith('.jsx') ||
      file.endsWith('.mjs') ||
      file.endsWith('.cjs')
    ) {
      hasJavaScript = true;
    }
  }
  if (hasTypeScript) return 'typescript';
  if (hasJavaScript) return 'javascript';
  return 'unknown';
}
