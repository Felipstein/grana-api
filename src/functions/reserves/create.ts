import 'reflect-metadata';

import { z } from 'zod/mini';

import { CreateReserveUseCase } from '@application/usecases/reserves/CreateReserveUseCase';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { created } from '@http/response';
import { DynamoUnitOfWork } from '@infra/database/unitOfWork/DynamoUnitOfWork';
import { config, docClient } from '@infra/setup';

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const schema = z.object({
  name: z.string().check(z.minLength(2)),
  platform: z.string().check(z.minLength(2)),
  value: z.optional(z.number().check(z.minimum(0))),
});

export const handler = createLambdaFunction(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const accountId = event.requestContext.authorizer.jwt.claims['accountId'] as string;
    const { name, platform, value = 0 } = schema.parse(JSON.parse(event.body ?? '{}'));

    const result = await new CreateReserveUseCase(new DynamoUnitOfWork(docClient, config)).execute({
      accountId,
      name,
      platform,
      value,
    });

    return created(result);
  },
);
