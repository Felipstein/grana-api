import chalk from 'chalk';

import type { ResourceType } from './Resource';

const COLORS = [
  chalk.gray,
  chalk.yellow,
  chalk.yellowBright,
  chalk.blue,
  chalk.blueBright,
  chalk.green,
  chalk.greenBright,
  chalk.cyan,
  chalk.cyanBright,
  chalk.magenta,
  chalk.magentaBright,
  chalk.white,
  chalk.whiteBright,
];

export class Logger {
  constructor(
    private readonly resourceName: string,
    private readonly resourceType: ResourceType,
    private readonly color = COLORS[Math.floor(Math.random() * COLORS.length)],
  ) {}

  info(...messages: unknown[]) {
    console.info(this.getPrefix(), ...messages);
  }

  error(message: string, error?: unknown) {
    console.error(this.getPrefix(true), chalk.red(message), error);
  }

  private getPrefix(error = false) {
    const color = error ? chalk.redBright.bold : this.color;

    return color(`[${this.resourceName} - ${chalk.italic(this.resourceType)}]`);
  }
}
