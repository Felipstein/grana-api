import 'reflect-metadata';

import { z } from 'zod/mini';

import { Transaction } from '@application/entities/Transaction';
import { ResolveCategoryService } from '@application/services/ResolveCategoryService';
import { CreateTransactionUseCase } from '@application/usecases/transactions/CreateTransactionUseCase';
import { createLambdaFunction } from '@http/createLambdaFunction';
import { created } from '@http/response';
import { DynamoCategoryRepository } from '@infra/database/repositories/DynamoCategoryRepository';
import { DynamoUnitOfWork } from '@infra/database/unitOfWork/DynamoUnitOfWork';
import { config, docClient } from '@infra/setup';

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const schema = z.object({
  type: z.enum(Transaction.Type),
  value: z.number().check(z.minimum(0.01)),
  description: z.string().check(z.minLength(2)),
  date: z.string().check(z.minLength(1)),
  category: z.string().check(z.minLength(1)),
  observations: z.optional(z.nullable(z.string())),
  reserveId: z.optional(z.nullable(z.string())),
  recurrence: z.optional(
    z.nullable(
      z.looseObject({
        type: z.string(),
        totalInstallments: z.optional(z.number()),
        currentInstallment: z.optional(z.number()),
      }),
    ),
  ),
});

export const handler = createLambdaFunction(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const accountId = event.requestContext.authorizer.jwt.claims['accountId'] as string;
    const body = schema.parse(JSON.parse(event.body ?? '{}'));

    const result = await new CreateTransactionUseCase(
      new DynamoUnitOfWork(docClient, config),
      new ResolveCategoryService(new DynamoCategoryRepository(docClient, config)),
    ).execute({
      accountId,
      type: body.type,
      value: body.value,
      description: body.description,
      date: body.date,
      category: body.category,
      observations: body.observations ?? null,
      reserveId: body.reserveId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recurrence: (body.recurrence ?? null) as any,
    });

    return created(result);
  },
);
