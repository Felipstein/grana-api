import chalk from 'chalk';

if (!process.env.LOCAL_ENDPOINT_URL) {
  console.error(chalk.red(`env ${chalk.bold('LOCAL_ENDPOINT_URL')} not loaded.`));
  process.exit(1);
}

console.info(chalk.white.dim(`Using local ENDPOINT: ${process.env.LOCAL_ENDPOINT_URL}`));

export const config = {
  endpoint: process.env.LOCAL_ENDPOINT_URL!,
};
