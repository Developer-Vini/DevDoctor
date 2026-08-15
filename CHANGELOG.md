# Changelog

All notable changes to DevDoctor are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and
this project adheres to [Semantic Versioning](https://semver.org/).

## [0.5.0] - 2026-08-15

### Added

- Phase 5: AST analysis using the official TypeScript compiler (parses both
  `.js` and `.ts`).
- `code.large-functions`: functions with large bodies (> 50 statements or
  > 100 lines).
- `code.unreachable`: statements after `return`/`throw` that never run.
- `code.suspicious-imports`: `eval()`, `new Function()` and dynamic
  `import()` with a non-literal argument.
- `typescript` is now a runtime dependency (used for parsing).
- Version bumped to 0.5.0.

## [0.4.0] - 2026-08-15

### Added

- Phase 4: CI mode (`dev-doctor --ci`) — no animations, readable output and
  proper exit codes (0 = success, 1 = problems found, 2 = internal error).
- `--min-score <n>`: fails CI with `CI FAILED` when the score is below the
  threshold.
- Configuration via `.devdoctorrc.json` or `devdoctor.config.ts` (ESM,
  Node >= 23.6): `exclude`, `rules` (per-check levels, `off` disables) and
  `minScore`. CLI flags override config values. Invalid configs warn and fall
  back to defaults.
- `--verbose` now prints execution info (checks run, duration, score).
- Version bumped to 0.4.0.

## [0.3.0] - 2026-08-15

### Added

- Phase 3: safe fix system (`dev-doctor fix`) with `--dry-run` preview and
  `--check <id>` filtering. Fixers create a `.gitignore` (or append missing
  entries, with a backup), create a `.env.example` (keys only — real values
  are never written) and create a basic `README.md` (never overwrites).
- `dev-doctor report --format json|markdown`: stable JSON (schema `1.0`, no
  raw secrets) and Markdown reports.
- `dev-doctor explain <check-id>`: explains what a check does and whether a
  safe auto-fix exists.
- Version bumped to 0.3.0.

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
