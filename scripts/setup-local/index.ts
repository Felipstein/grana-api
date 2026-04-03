/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { execSync } from 'node:child_process';

import chalk from 'chalk';

import { Logger } from './logger';
import { RESOLVERS } from './resolvers';

import type { Resource } from './Resource';
import type { ChalkInstance } from 'chalk';

console.info(chalk.white.dim('Loading serverless.yml'));

const serverless = JSON.parse(execSync('pnpm sls print --stage local --format json').toString());
const resources = (serverless.resources?.Resources ?? {}) as Record<string, Resource>;

async function setup() {
  Object.entries(resources).forEach(async ([resourceName, resource]) => {
    let color: ChalkInstance | undefined;

    if (resource.Type === 'AWS::DynamoDB::Table') color = chalk.blueBright;

    const logger = new Logger(resourceName, resource.Type, color);

    try {
      const resolve = RESOLVERS[resource.Type];
      await resolve(logger, resource);
    } catch (error) {
      logger.error((error as Error).message, error);
    }
  });
}

setup();
