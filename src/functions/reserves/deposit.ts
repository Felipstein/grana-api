import 'reflect-metadata';

import { z } from 'zod/mini';

import { DepositInReserveUseCase } from '@application/usecases/reserves/DepositInReserveUseCase';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { created } from '@http/response';
import { DynamoUnitOfWork } from '@infra/database/unitOfWork/DynamoUnitOfWork';
import { config, docClient } from '@infra/setup';

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const schema = z.object({
  value: z.number().check(z.minimum(0.01)),
  date: z.string().check(z.minLength(1)),
  observations: z.optional(z.nullable(z.string())),
});

export const handler = createLambdaFunction(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const accountId = event.requestContext.authorizer.jwt.claims['accountId'] as string;
    const reserveId = event.pathParameters?.['id'] ?? '';
    const { value, date, observations = null } = schema.parse(JSON.parse(event.body ?? '{}'));

    const result = await new DepositInReserveUseCase(
      new DynamoUnitOfWork(docClient, config),
    ).execute({
      accountId,
      reserveId,
      value,
      date: new Date(date),
      observations,
    });

    return created(result);
  },
);
