import 'reflect-metadata';

import { z } from 'zod/mini';

import { Transaction } from '@application/entities/Transaction';
import { ListTransactionsQuery } from '@application/queries/ListTransactionsQuery';
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
  type: z.optional(z.enum(Transaction.Type)),
  search: z.optional(z.string()),
  minValue: z.optional(z.string()),
  maxValue: z.optional(z.string()),
  categoryIds: z.optional(z.string()),
  recurrenceType: z.optional(z.enum(Transaction.RecurrenceType)),
  hideReserveTransactions: z.optional(z.string()),
  minPeriod: z.optional(z.string()),
  maxPeriod: z.optional(z.string()),
});

export const handler = createLambdaFunction(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const accountId = event.requestContext.authorizer.jwt.claims['accountId'] as string;
    const q = schema.parse(event.queryStringParameters ?? {});

    const result = await new ListTransactionsQuery(
      docClient,
      config,
      new CategoryLoader(docClient, config),
      new TransactionSummaryService(),
      new PaginationService(),
    ).execute({
      accountId,
      period: new Period(q.period as Period.AsString),
      startSignature: q.cursor,
      filters: {
        type: q.type,
        search: q.search,
        minValue: q.minValue ? Number(q.minValue) : undefined,
        maxValue: q.maxValue ? Number(q.maxValue) : undefined,
        categoryIds: q.categoryIds ? new Set(q.categoryIds.split(',')) : undefined,
        recurrenceType: q.recurrenceType
          ? new Set([q.recurrenceType as Transaction.RecurrenceType | 'ALL'])
          : undefined,
        hideReserveTransactions: q.hideReserveTransactions === 'true',
        minPeriod: q.minPeriod ? new Period(q.minPeriod as Period.AsString) : undefined,
        maxPeriod: q.maxPeriod ? new Period(q.maxPeriod as Period.AsString) : undefined,
      },
    });

    return ok(result);
  },
);
