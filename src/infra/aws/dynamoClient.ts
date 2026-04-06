import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { env } from '@config/env';

export const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    endpoint: env.LOCAL_ENDPOINT_URL,
  }),
);
