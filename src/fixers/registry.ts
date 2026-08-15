import type { Fixer } from '../types/fixer.js';
import { documentationFixer } from './documentation.js';
import { envExampleFixer } from './envExample.js';
import { gitignoreFixer } from './gitignore.js';

const registry: Fixer[] = [];
let defaultFixersRegistered = false;

export function registerFixer(fixer: Fixer): void {
  if (registry.some((existing) => existing.checkId === fixer.checkId)) {
    throw new Error(`Fixer for check "${fixer.checkId}" is already registered`);
  }
  registry.push(fixer);
}

export function getFixers(): readonly Fixer[] {
  return registry;
}

export function getFixerForCheck(checkId: string): Fixer | undefined {
  return registry.find((fixer) => fixer.checkId === checkId);
}

/** Registers the built-in safe fixers. Safe to call more than once. */
export function registerDefaultFixers(): void {
  if (defaultFixersRegistered) return;
  defaultFixersRegistered = true;
  registerFixer(gitignoreFixer);
  registerFixer(envExampleFixer);
  registerFixer(documentationFixer);
}

/** Test helper: clears the registry. */
export function resetFixers(): void {
  registry.length = 0;
  defaultFixersRegistered = false;
}
