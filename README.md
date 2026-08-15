# 🩺 DevDoctor

> Run one command. Know the health of your project.

DevDoctor is an open source CLI that analyzes a local software project and
reports on its quality, security, configuration, Git health, documentation and
dependencies. It assigns a health score, and — when it is safe — can fix some
problems automatically.

It works **100% offline**: every analysis is deterministic and no AI service is
required.

![Terminal output placeholder](docs/screenshot.png)

> Screenshot/GIF coming soon. Run `dev-doctor` in any project to see it live.

---

## Features

- Automatic project detection (Node.js, TypeScript, JavaScript)
- Package manager detection (npm, yarn, pnpm, bun) from lockfiles
- Independent, extensible checks (each check is a small isolated module)
- Severity classification (`info` → `critical`)
- Deterministic 0–100 health score
- Beautiful terminal report, JSON and Markdown output
- Safe auto-fixes with `--dry-run` preview
- CI mode with proper exit codes and `--min-score`
- No AI required — 100% offline for all deterministic analysis
- Extensible architecture ready for future plugins and an optional AI layer

## Installation

```bash
npm install -g devdoctor
```

or run it on the spot with:

```bash
npx devdoctor
```

## Usage

Run the default audit from the root of any supported project:

```bash
dev-doctor
```

Example output:

```text
🩺 DevDoctor v0.2.0

Analyzing /home/me/my-project...

  ✓ Project detected: Node.js
  ✓ Package manager: npm
  ✓ Git repository detected

Security
  ✓ .env protection
  ✓ Secrets

Dependencies
  ✓ Lockfile detected: package-lock.json

Git
  ✓ .gitignore
  ✓ Repository healthy

Documentation
  ❌ README

Configuration
  ✓ package.json

Code Quality
  ✓ console.log / debugger
  ✓ TODO / FIXME

────────────────────────────────────

Health Score: 92/100

1 issue found
1 medium

Run:

  dev-doctor audit
  dev-doctor fix --dry-run
  dev-doctor report --format json
```

### Commands

| Command                               | Description                                |
| ------------------------------------- | ------------------------------------------ |
| `dev-doctor`                          | Default summary audit                      |
| `dev-doctor audit`                    | Detailed audit                             |
| `dev-doctor audit --security`         | Only security checks (incl. network audit) |
| `dev-doctor fix`                      | Apply safe fixes (`--dry-run`, `--check`)  |
| `dev-doctor report --format json`     | JSON report (stable schema, no secrets)    |
| `dev-doctor report --format markdown` | Markdown report                            |
| `dev-doctor explain <check-id>`       | Explain a check                            |
| `dev-doctor --version`                | Print version                              |
| `dev-doctor --help`                   | Print help                                 |

### Safe fixes

`dev-doctor fix` only applies safe, non-destructive fixes: it creates a
`.gitignore` (or adds missing entries, keeping a `.devdoctor.bak` backup),
creates a `.env.example` from the keys of existing `.env` files (values are
never written) and creates a basic `README.md` when none exists.

```bash
dev-doctor fix --dry-run              # preview what would change
dev-doctor fix --check security.env   # fix a specific check
dev-doctor fix                        # apply safe fixes
```

### Flags

| Flag              | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `--quiet`         | Only print issues; no colors or spinners              |
| `--no-color`      | Disable colored output                                |
| `--no-spinner`    | Disable the loading spinner                           |
| `--verbose`       | Verbose logging                                       |
| `--debug`         | Debug output with stack traces                        |
| `--ci`            | CI mode (no animations, machine-friendly, exit codes) |
| `--min-score <n>` | Fail CI when the score is below `n`                   |

## Checks

Checks are independent modules registered in a central registry. The core
never knows the internals of a check.

| Check ID                       | Category      | What it detects                                       |
| ------------------------------ | ------------- | ----------------------------------------------------- |
| `project.detection`            | Project       | Unrecognized project type                             |
| `project.package-manager`      | Project       | Missing/undetectable package manager                  |
| `git.repository`               | Git           | Missing Git repo or Git executable                    |
| `git.gitignore`                | Git           | Missing `.gitignore` or uncovered artifacts           |     | `security.env` | Security | `.env` files tracked by Git |
| `security.secrets`             | Security      | Possible hardcoded secrets (always masked)            |
| `dependencies.lockfile`        | Dependencies  | Missing lockfile                                      |
| `dependencies.duplicates`      | Dependencies  | Same package in deps and devDeps                      |
| `dependencies.unused`          | Dependencies  | Runtime deps never imported (best-effort)             |
| `dependencies.vulnerabilities` | Security      | Known vulnerabilities (`npm audit` — network, opt-in) |
| `documentation.readme`         | Documentation | Missing README or missing sections                    |
| `configuration.package-json`   | Configuration | Invalid or incomplete `package.json`                  |
| `code.console-log`             | Code Quality  | `console.log` / `debugger` leftovers                  |
| `code.todo`                    | Code Quality  | `TODO` / `FIXME` markers                              |
| `code.large-files`             | Code Quality  | Source files over 500 lines                           |
| `code.empty-files`             | Code Quality  | Empty source files                                    |
| `code.duplicate-files`         | Code Quality  | Files with identical content                          |

> Checks marked _(network, opt-in)_ only run when you ask for them
> (`dev-doctor audit --security`). Everything else works 100% offline.

## Score

DevDoctor computes a deterministic 0–100 health score across categories:

```text
Security          85/100
Code Quality      72/100
Dependencies      91/100
Git               100/100
Documentation     60/100
Configuration     80/100
Project Health    75/100

────────────────────────

Overall Score      79/100
```

The score is derived only from check results — no AI involved.

## Configuration

Optional configuration via `devdoctor.config.ts` or `.devdoctorrc.json`:

```json
{
  "exclude": ["generated", "legacy"],
  "rules": {
    "security.env": "error",
    "code.console-log": "warning"
  },
  "minScore": 70
}
```

No configuration is required — sensible defaults work immediately.

## CI/CD

```bash
dev-doctor --ci --min-score 80
```

| Exit code | Meaning                                       |
| --------- | --------------------------------------------- |
| `0`       | Success                                       |
| `1`       | Problems found (or score below `--min-score`) |
| `2`       | Internal error                                |

## Architecture

```text
src/
├── cli/            Commander CLI, commands, spinner and colors
├── core/           Scanner, context, registry, runner, gitignore, errors
├── checks/         Independent checks by category
├── fixers/         Safe auto-fixes
├── analyzers/      filesystem, package.json, Git, secrets
├── reporters/      terminal, JSON, Markdown
└── types/          Shared types (check, project, report)
```

The core exposes a small API (`buildContext`, `runAudit`, `registerCheck`) so
plugins like `@devdoctor/check-react` or `@devdoctor/check-python` can be added
later without touching the core.

## Development

```bash
git clone <repository>
cd devdoctor
npm install
npm run build
npm test
npm link
```

Then try it on any project:

```bash
cd ~/meu-projeto
dev-doctor
```

### Scripts

| Script              | Description                           |
| ------------------- | ------------------------------------- |
| `npm run build`     | Compile TypeScript to `dist/`         |
| `npm test`          | Build and run the test suite (Vitest) |
| `npm run lint`      | ESLint                                |
| `npm run format`    | Prettier (write)                      |
| `npm run typecheck` | `tsc --noEmit`                        |

## Roadmap

- [x] Phase 1 — CLI, core, context, check system, terminal reporter
- [x] Phase 2 — dependency checks, secret detection, code checks, score
- [x] Phase 3 — safe fixes (`fix`), `--dry-run`, JSON and Markdown reports
- [x] Phase 4 — CI mode, configuration file support
- [ ] Phase 5 — AST analysis
- [ ] Optional AI layer for explanations and suggestions

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
