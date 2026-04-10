import 'reflect-metadata';

import { DeleteReserveUseCase } from '@application/usecases/reserves/DeleteReserveUseCase';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { ok } from '@http/response';
import { DynamoUnitOfWork } from '@infra/database/unitOfWork/DynamoUnitOfWork';
import { config, docClient } from '@infra/setup';

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

export const handler = createLambdaFunction(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const accountId = event.requestContext.authorizer.jwt.claims['accountId'] as string;
    const reserveId = event.pathParameters?.['id'] ?? '';

    const result = await new DeleteReserveUseCase(new DynamoUnitOfWork(docClient, config)).execute({
      accountId,
      reserveId,
    });

    return ok(result);
  },
);
