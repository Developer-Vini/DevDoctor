# Contributing to DevDoctor

Thanks for helping make DevDoctor better! Here is how you can contribute.

## Getting started

```bash
git clone <repository>
cd devdoctor
npm install
npm run build
npm test
```

## Development workflow

1. Create a branch for your change.
2. Make the change — small, focused commits are preferred.
3. Add or update tests (Vitest). New checks must ship with tests.
4. Run the quality gates:

   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run format:check
   ```

5. Open a pull request describing the _why_ of the change.

## Adding a new check

1. Create `src/checks/<category>/<name>.ts` implementing the `Check` interface
   from `src/types/check.ts`.
2. Register it in `src/core/registry.ts` via `registerDefaultChecks()`.
3. Add unit tests using a fixture or a temporary directory.
4. Never throw from a check: report problems in the `CheckResult`.

## Principles

- **Reliability over features** — a small working feature beats a broken big one.
- **Real detection over demo** — no fake results, no `TODO: implement later`.
- **Security over aggressive automation** — never run project code, never
  auto-install dependencies, never expose secrets.
- **Extensible architecture** — the core must not know check internals.

## Reporting issues

Include the output of `dev-doctor --debug` and the project structure (without
secrets) when reporting a bug.
