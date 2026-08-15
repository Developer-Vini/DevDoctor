# Changelog

All notable changes to DevDoctor are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and
this project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-08-15

### Added

- Phase 2: deterministic 0-100 scoring system (`computeScores`) with
  per-category and overall scores shown in the reports.
- `security.secrets` check: detects hardcoded API keys, tokens, passwords and
  private keys. Values are always masked — never printed, never written to
  reports.
- Dependency checks: `dependencies.duplicates` (same package in
  dependencies and devDependencies) and `dependencies.unused` (best-effort,
  based on import/require usage).
- `dependencies.vulnerabilities` check: runs `npm audit`/`yarn audit`/
  `pnpm audit`/`bun audit` — only when the user opts into network access
  (`dev-doctor audit --security`).
- Code quality checks: `code.console-log`, `code.todo`, `code.large-files`,
  `code.empty-files`, `code.duplicate-files`.
- Version bumped to 0.2.0.

## [0.1.0] - 2026-08-15

### Added

- Working `dev-doctor` CLI (Phase 1): default summary audit and `dev-doctor audit`.
- Project detection (Node.js, TypeScript, JavaScript) and package manager
  detection (npm, yarn, pnpm, bun) from lockfiles.
- ProjectContext with a safe directory scanner that respects `.gitignore`,
  skips symlinks and default-ignored directories.
- Initial checks: `project.detection`, `project.package-manager`,
  `git.repository`, `git.gitignore`, `security.env`,
  `dependencies.lockfile`, `documentation.readme`, `configuration.package-json`.
- Central check registry and parallel runner with rule overrides and
  crash-safe execution.
- Terminal reporter (summary and detailed) and `--quiet` machine output.
- Flags: `--quiet`, `--no-color`, `--no-spinner`, `--verbose`, `--debug`.
- Vitest test suite: unit tests (scanner, gitignore, context, checks, runner)
  and integration tests that spawn the built CLI against fixtures.
