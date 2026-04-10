import 'reflect-metadata';

import { z } from 'zod/mini';

import { UpdateReserveUseCase } from '@application/usecases/reserves/UpdateReserveUseCase';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { noContent } from '@http/response';
import { DynamoReserveRepository } from '@infra/database/repositories/DynamoReserveRepository';
import { config, docClient } from '@infra/setup';

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const schema = z.object({
  name: z.optional(z.string().check(z.minLength(2))),
  platform: z.optional(z.string().check(z.minLength(2))),
});

export const handler = createLambdaFunction(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const accountId = event.requestContext.authorizer.jwt.claims['accountId'] as string;
    const reserveId = event.pathParameters?.['id'] ?? '';
    const { name, platform } = schema.parse(JSON.parse(event.body ?? '{}'));

    await new UpdateReserveUseCase(new DynamoReserveRepository(docClient, config)).execute({
      accountId,
      reserveId,
      data: { name, platform },
    });

    return noContent();
  },
);
