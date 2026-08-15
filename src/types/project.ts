export type ProjectType = 'node' | 'javascript' | 'typescript' | 'unknown';
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';
export type RuleLevel = 'off' | 'info' | 'warning' | 'error';

export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  private?: boolean;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
}

export interface DevDoctorConfig {
  exclude?: string[];
  rules?: Record<string, RuleLevel>;
  minScore?: number;
}

export interface ProjectContext {
  /** Absolute path to the project root. */
  projectPath: string;
  projectName: string;
  projectType: ProjectType;
  packageManager: PackageManager;
  nodeVersion: string;
  packageJson: PackageJson | null;
  /** Non-null when package.json exists but could not be parsed. */
  packageJsonError: string | null;
  isGitRepository: boolean;
  gitExecutable: boolean;
  /** Files tracked by Git, relative to the project root. Empty when not a repository. */
  trackedFiles: string[];
  /** All files found by the scanner, relative to the project root (POSIX separators). */
  files: string[];
  directories: string[];
  lockfiles: string[];
  config: DevDoctorConfig;
}
