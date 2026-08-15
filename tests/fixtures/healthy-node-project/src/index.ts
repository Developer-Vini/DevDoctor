import chalk from 'chalk';

export const greeting = chalk.green('hello');

export function greet(name: string): string {
  return `${greeting}, ${name}`;
}
