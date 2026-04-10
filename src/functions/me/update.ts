import 'reflect-metadata';

import { z } from 'zod/mini';

import { UpdateAccountUseCase } from '@application/usecases/accounts/UpdateAccountUseCase';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { noContent } from '@http/response';
import { DynamoAccountRepository } from '@infra/database/repositories/DynamoAccountRepository';
import { config, docClient } from '@infra/setup';

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const schema = z.object({
  name: z.optional(z.string().check(z.minLength(2))),
});

export const handler = createLambdaFunction(async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const accountId = event.requestContext.authorizer.jwt.claims['accountId'] as string;
  const { name } = schema.parse(JSON.parse(event.body ?? '{}'));

  await new UpdateAccountUseCase(new DynamoAccountRepository(docClient, config)).execute({ accountId, data: { name } });

  return noContent();
});
