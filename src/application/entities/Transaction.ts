import { z } from 'zod/mini';

import { IDService } from '@application/services/IDService';

import { Entity } from './core/Entity';

enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

enum TransactionRecurrenceType {
  RECURRING = 'RECURRING',
  INSTALLMENT = 'INSTALLMENT',
}

const attributesSchema = z.object({
  type: z.enum(TransactionType),
  value: z.number().check(z.minimum(0.01), z.maximum(1_000_000_000)),
  description: z.string().check(z.minLength(2), z.maxLength(200)),
  date: z.pipe(z.union([z.string(), z.date()]), z.coerce.date()),
  categoryId: IDService.idSchema,
  observations: z.nullable(z.string().check(z.maxLength(200))),
  recurrence: z.nullable(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal(TransactionRecurrenceType.RECURRING),
        totalInstallments: z.null(),
        currentInstallment: z.null(),
      }),
      z
        .object({
          type: z.literal(TransactionRecurrenceType.INSTALLMENT),
          totalInstallments: z.number().check(z.gte(1), z.lte(200)),
          currentInstallment: z.number().check(z.gte(1), z.lte(200)),
        })
        .check(
          z.refine((data) => data.currentInstallment <= data.totalInstallments, {
            error: 'Current installment is greater than total installments.',
            path: ['currentInstallment'],
          }),
        ),
    ]),
  ),
});

export interface Transaction extends z.infer<typeof attributesSchema> {}
export class Transaction extends Entity<typeof attributesSchema> {
  readonly id: string;

  constructor(id: string, attributes: z.input<typeof attributesSchema>) {
    super(attributesSchema, attributes);
    this.id = id;
  }

  static create(attributes: z.input<typeof attributesSchema>) {
    return new Transaction(IDService.generate(), attributes);
  }
}

export namespace Transaction {
  export import Type = TransactionType;
  export import RecurrenceType = TransactionRecurrenceType;
}
