import chalk from 'chalk';

export const colors = {
  brand: chalk.bold,
  success: chalk.green,
  warn: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  dim: chalk.gray,
  bold: chalk.bold,
};

export function disableColor(): void {
  chalk.level = 0;
}
