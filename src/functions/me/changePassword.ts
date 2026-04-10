import 'reflect-metadata';

import { z } from 'zod/mini';

import { ChangePasswordUseCase } from '@application/usecases/accounts/ChangePasswordUseCase';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { noContent } from '@http/response';
import { CognitoAuthGateway } from '@infra/gateways/CognitoAuthGateway';
import { config } from '@infra/setup';

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const schema = z.object({
  oldPassword: z.string().check(z.minLength(1)),
  newPassword: z.string().check(z.minLength(8)),
});

export const handler = createLambdaFunction(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const accessToken = event.headers['authorization']?.replace('Bearer ', '') ?? '';
    const { oldPassword, newPassword } = schema.parse(JSON.parse(event.body ?? '{}'));

    await new ChangePasswordUseCase(new CognitoAuthGateway(config)).execute({
      accessToken,
      oldPassword,
      newPassword,
    });

    return noContent();
  },
);
