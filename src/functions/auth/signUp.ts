import 'reflect-metadata';

import { z } from 'zod/mini';

import { SignUpUseCase } from '@application/usecases/auth/SignUpUseCase';
import { Saga } from '@application/utils/Saga';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { created } from '@http/response';
import { DynamoUnitOfWork } from '@infra/database/unitOfWork/DynamoUnitOfWork';
import { CognitoAuthGateway } from '@infra/gateways/CognitoAuthGateway';
import { config, docClient } from '@infra/setup';

import type { APIGatewayProxyEventV2 } from 'aws-lambda';

const schema = z.object({
  name: z.string().check(z.minLength(2)),
  email: z.email(),
  password: z.string().check(z.minLength(8)),
});

export const handler = createLambdaFunction(async (event: APIGatewayProxyEventV2) => {
  const { name, email, password } = schema.parse(JSON.parse(event.body ?? '{}'));

  const result = await new SignUpUseCase(
    new Saga(),
    new DynamoUnitOfWork(docClient, config),
    new CognitoAuthGateway(config),
  ).execute({ name, email, password });

  return created(result);
});
