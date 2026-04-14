import { z } from 'zod/mini';

import { IDService } from '@application/services/IDService';
import { validateSchemaInDomain } from '@application/utils/validateSchemaInDomain';

import { Entity } from './core/Entity';

enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

enum TransactionRecurrenceType {
  RECURRING = 'RECURRING',
  INSTALLMENT = 'INSTALLMENT',
}

const attrsSchema = z
  .object({
    accountId: IDService.idSchema,
    parentId: z.prefault(z.nullable(IDService.idSchema), null),
    type: z.enum(TransactionType),
    value: z.number().check(z.minimum(0.01), z.maximum(1_000_000_000)),
    description: z.string().check(z.minLength(2), z.maxLength(200)),
    date: z.pipe(z.union([z.string(), z.date()]), z.coerce.date()),
    categoryId: IDService.idSchema,
    observations: z.nullable(z.string().check(z.maxLength(200))),
    reserveId: z.prefault(z.nullable(IDService.idSchema), null),
    recurrence: z.nullable(
      z.discriminatedUnion('type', [
        z.object({
          type: z.literal(TransactionRecurrenceType.RECURRING),
          totalInstallments: z._default(z.nullable(z.number().check(z.gte(1), z.lte(200))), null),
          currentInstallment: z._default(z.nullable(z.number().check(z.gte(1), z.lte(200))), null),
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
  })
  .check(
    z.refine((data) => !(data.reserveId && data.recurrence), {
      path: ['recurrence'],
      error: 'The transaction cannot be recurrence if has relation with reserve.',
    }),
  );

export class Transaction extends Entity {
  readonly accountId: string;
  readonly parentId: string | null;
  private _type: TransactionType;
  private _value: number;
  private _description: string;
  private _date: Date;
  private _categoryId: string;
  private _observations: string | null;
  readonly reserveId: string | null;
  private _recurrence: z.output<typeof attrsSchema.shape.recurrence>;

  constructor(id: string, attrs: Transaction.CreateParams) {
    super(id);

    const validated = validateSchemaInDomain(attrsSchema, attrs);

    this.accountId = validated.accountId;
    this.parentId = validated.parentId;
    this._type = validated.type;
    this._value = validated.value;
    this._description = validated.description;
    this._date = validated.date;
    this._categoryId = validated.categoryId;
    this._observations = validated.observations;
    this.reserveId = validated.reserveId;
    this._recurrence = validated.recurrence;
  }

  get type() {
    return this._type;
  }

  set type(type: TransactionType) {
    this._type = validateSchemaInDomain(attrsSchema.shape.type, type);
  }

  get value() {
    return this._value;
  }

  set value(value: number) {
    this._value = validateSchemaInDomain(attrsSchema.shape.value, value);
  }

  get description() {
    return this._description;
  }

  set description(description: string) {
    this._description = validateSchemaInDomain(attrsSchema.shape.description, description);
  }

  get date(): Date {
    return this._date;
  }

  set date(date: string | Date) {
    this._date = validateSchemaInDomain(attrsSchema.shape.date, date);
  }

  get categoryId() {
    return this._categoryId;
  }

  set categoryId(categoryId: string) {
    this._categoryId = validateSchemaInDomain(attrsSchema.shape.categoryId, categoryId);
  }

  get observations() {
    return this._observations;
  }

  set observations(observations: string | null) {
    this._observations = validateSchemaInDomain(attrsSchema.shape.observations, observations);
  }

  get recurrence() {
    return this._recurrence;
  }

  set recurrence(recurrence: z.input<typeof attrsSchema.shape.recurrence>) {
    this._recurrence = validateSchemaInDomain(attrsSchema.shape.recurrence, recurrence);
  }

  static create(attrs: Transaction.CreateParams) {
    return new Transaction(IDService.generate(), attrs);
  }
}

export namespace Transaction {
  export import Type = TransactionType;
  export import RecurrenceType = TransactionRecurrenceType;

  export type CreateParams = z.input<typeof attrsSchema>;
  export type Attributes = z.output<typeof attrsSchema>;
}
