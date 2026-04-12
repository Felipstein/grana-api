import 'reflect-metadata';

import { z } from 'zod/mini';

import { GetDashboardQuery } from '@application/queries/GetDashboardQuery';
import { TransactionSummaryService } from '@application/services/TransactionSummaryService';
import { Period } from '@application/valueObjects/Period';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { ok } from '@http/response';
import { CategoryLoader } from '@infra/database/services/CategoryLoader';
import { PaginationService } from '@infra/database/services/PaginationService';
import { config, docClient } from '@infra/setup';

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const schema = z.object({
  period: z.string().check(z.minLength(1)),
  cursor: z.optional(z.string()),
});

export const handler = createLambdaFunction(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const accountId = event.requestContext.authorizer.jwt.claims['accountId'] as string;
    const q = schema.parse(event.queryStringParameters ?? {});

    const result = await new GetDashboardQuery(
      docClient,
      config,
      new CategoryLoader(docClient, config),
      new TransactionSummaryService(),
      new PaginationService(),
    ).execute({
      accountId,
      period: new Period(q.period as Period.AsString),
      startSignature: q.cursor,
    });

    return ok(result);
  },
);
