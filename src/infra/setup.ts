import 'reflect-metadata';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { AppConfig } from '@config/AppConfig';
import { env } from '@config/env';

const rawClient = new DynamoDBClient({ endpoint: env.LOCAL_ENDPOINT_URL });
export const docClient = DynamoDBDocumentClient.from(rawClient);
export const config = new AppConfig();
