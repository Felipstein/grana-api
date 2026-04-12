import 'reflect-metadata';

import { ListCategoriesQuery } from '@application/queries/ListCategoriesQuery';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { ok } from '@http/response';
import { config, docClient } from '@infra/setup';

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

export const handler = createLambdaFunction(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const accountId = event.requestContext.authorizer.jwt.claims['accountId'] as string;

    const result = await new ListCategoriesQuery(docClient, config).execute({
      accountId,
    });

    return ok(result);
  },
);
