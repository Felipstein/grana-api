import { CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

import { dynamoClient } from '../../../src/dynamoClient';

import type { Logger } from '../logger';
import type { Resource } from '../Resource';

async function tableExists(name: string) {
  try {
    await dynamoClient.send(
      new DescribeTableCommand({
        TableName: name,
      }),
    );

    return true;
  } catch {
    return false;
  }
}

export async function resolveDynamoDB(logger: Logger, resource: Resource.DynamoDB.Table) {
  const tableName = resource.Properties.TableName!;

  if (await tableExists(tableName)) {
    logger.info(`Table ${tableName} already exists`);
    return;
  }

  await dynamoClient.send(new CreateTableCommand(resource.Properties));

  logger.info(`Table ${tableName} created`);
}
