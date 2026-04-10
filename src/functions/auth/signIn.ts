import 'reflect-metadata';

import { z } from 'zod/mini';

import { SignInUseCase } from '@application/usecases/auth/SignInUseCase';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { ok } from '@http/response';
import { CognitoAuthGateway } from '@infra/gateways/CognitoAuthGateway';
import { config } from '@infra/setup';

import type { APIGatewayProxyEventV2 } from 'aws-lambda';

const schema = z.object({
  email: z.email(),
  password: z.string().check(z.minLength(1)),
});

export const handler = createLambdaFunction(async (event: APIGatewayProxyEventV2) => {
  const { email, password } = schema.parse(JSON.parse(event.body ?? '{}'));

  const result = await new SignInUseCase(new CognitoAuthGateway(config)).execute({
    email,
    password,
  });

  return ok(result);
});
