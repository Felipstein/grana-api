import 'reflect-metadata';

import { z } from 'zod/mini';

import { RefreshTokenUseCase } from '@application/usecases/auth/RefreshTokenUseCase';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { ok } from '@http/response';
import { CognitoAuthGateway } from '@infra/gateways/CognitoAuthGateway';
import { config } from '@infra/setup';

import type { APIGatewayProxyEventV2 } from 'aws-lambda';

const schema = z.object({
  refreshToken: z.string().check(z.minLength(1)),
});

export const handler = createLambdaFunction(async (event: APIGatewayProxyEventV2) => {
  const { refreshToken } = schema.parse(JSON.parse(event.body ?? '{}'));

  const result = await new RefreshTokenUseCase(new CognitoAuthGateway(config)).execute({
    refreshToken,
  });

  return ok(result);
});
