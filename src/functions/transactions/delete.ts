import 'reflect-metadata';

import { DeleteTransactionUseCase } from '@application/usecases/transactions/DeleteTransactionUseCase';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { noContent } from '@http/response';
import { DynamoUnitOfWork } from '@infra/database/unitOfWork/DynamoUnitOfWork';
import { config, docClient } from '@infra/setup';

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

export const handler = createLambdaFunction(async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const accountId = event.requestContext.authorizer.jwt.claims['accountId'] as string;
  const transactionId = event.pathParameters?.['id'] ?? '';
  const deleteAllRecurrences = event.queryStringParameters?.['deleteAllRecurrences'] === 'true';

  await new DeleteTransactionUseCase(new DynamoUnitOfWork(docClient, config)).execute({
    accountId,
    transactionId,
    deleteAllRecurrences,
  });

  return noContent();
});
