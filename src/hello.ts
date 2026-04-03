import { randomUUID } from 'node:crypto';

import { PutCommand } from '@aws-sdk/lib-dynamodb';

import { env } from '@config/env';

import { dynamoClient } from './dynamoClient';

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  console.log(env.MAIN_TABLE_NAME);

  const command = new PutCommand({
    TableName: env.MAIN_TABLE_NAME,
    Item: {
      id: randomUUID(),
      bombado: true,
      nome: 'Felipones',
    },
  });

  await dynamoClient.send(command);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, event }),
  };
}
