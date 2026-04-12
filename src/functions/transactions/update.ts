import 'reflect-metadata';

import { z } from 'zod/mini';

import { Transaction } from '@application/entities/Transaction';
import { ResolveCategoryService } from '@application/services/ResolveCategoryService';
import { UpdateTransactionUseCase } from '@application/usecases/transactions/UpdateTransactionUseCase';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { noContent } from '@http/response';
import { DynamoCategoryRepository } from '@infra/database/repositories/DynamoCategoryRepository';
import { DynamoUnitOfWork } from '@infra/database/unitOfWork/DynamoUnitOfWork';
import { config, docClient } from '@infra/setup';

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const schema = z.object({
  type: z.optional(z.enum(Transaction.Type)),
  value: z.optional(z.number().check(z.minimum(0.01))),
  description: z.optional(z.string().check(z.minLength(2))),
  date: z.optional(z.string()),
  category: z.optional(z.string().check(z.minLength(1))),
  observations: z.optional(z.nullable(z.string())),
  updateAllRecurrences: z.optional(z.boolean()),
});

export const handler = createLambdaFunction(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const accountId = event.requestContext.authorizer.jwt.claims['accountId'] as string;
    const transactionId = event.pathParameters?.['id'] ?? '';
    const body = schema.parse(JSON.parse(event.body ?? '{}'));

    await new UpdateTransactionUseCase(
      new DynamoUnitOfWork(docClient, config),
      new ResolveCategoryService(new DynamoCategoryRepository(docClient, config)),
    ).execute({
      accountId,
      transactionId,
      data: {
        type: body.type,
        value: body.value,
        description: body.description,
        date: body.date ? new Date(body.date) : undefined,
        category: body.category,
        observations: body.observations,
        updateAllRecurrences: body.updateAllRecurrences,
      },
    });

    return noContent();
  },
);
