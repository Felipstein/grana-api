import { z } from 'zod/mini';

import { Transaction } from '@application/entities/Transaction';
import { validateSchemaInDomain } from '@application/utils/validateSchemaInDomain';

import { DynamoItem } from './core/DynamoItem';

const periodSchema = z.pipe(
  z.union([z.date(), z.string()]),
  z.transform((value, ctx) => {
    const date = typeof value === 'string' ? new Date(value) : value;

    if (isNaN(date as unknown as number)) {
      ctx.issues.push({
        code: 'invalid_type',
        expected: 'date',
        input: value,
        path: ['transactionItem', 'period'],
      });
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    return `${year}-${month}`;
  }),
);

export class TransactionItem extends DynamoItem<
  TransactionItem.Keys,
  TransactionItem.Attributes,
  'Transaction'
> {
  static readonly type = 'Transaction';

  constructor(attrs: TransactionItem.Attributes) {
    super(TransactionItem.type, attrs, {
      PK: TransactionItem.getPK(attrs.accountId),
      SK: TransactionItem.getSK(attrs.date, attrs.id),
      GSI1PK: TransactionItem.getGSI1PK(attrs.id),
      GSI1SK: TransactionItem.getGSI1SK(attrs.id),
      GSI2PK: attrs.parentId ? TransactionItem.getGSI2PK(attrs.parentId) : undefined,
      GSI2SK: attrs.parentId ? TransactionItem.getGSI1SK(attrs.id) : undefined,
    });
  }

  static getPK(accountId: string): TransactionItem.Keys['PK'] {
    return `ACCOUNT#${accountId}`;
  }

  static getSK(periodOrDate: Date | string, transactionId: string): TransactionItem.Keys['SK'] {
    const period = validateSchemaInDomain(periodSchema, periodOrDate) as TransactionItem.Period;

    return `TRANSACTION#${period}#${transactionId}`;
  }

  static getGSI1PK(transactionId: string): TransactionItem.Keys['GSI1PK'] {
    return `TRANSACTION#${transactionId}`;
  }

  static getGSI1SK(transactionId: string): TransactionItem.Keys['GSI1SK'] {
    return `TRANSACTION#${transactionId}`;
  }

  static getGSI2PK(parentTransactionId: string): TransactionItem.Keys['GSI2PK'] {
    return `PARENT#${parentTransactionId}`;
  }

  static getGSI2SK(transactionId: string): TransactionItem.Keys['GSI2SK'] {
    return `TRANSACTION#${transactionId}`;
  }

  static toEntity(transactionItem: TransactionItem.Type) {
    let recurrence: Transaction['recurrence'];

    switch (transactionItem.recurrenceType) {
      case Transaction.RecurrenceType.INSTALLMENT:
        recurrence = {
          type: Transaction.RecurrenceType.INSTALLMENT,
          totalInstallments: transactionItem.totalInstallments!,
          currentInstallment: transactionItem.currentInstallment!,
        };
        break;
      case Transaction.RecurrenceType.RECURRING:
        recurrence = {
          type: Transaction.RecurrenceType.RECURRING,
        };
        break;
      default:
        recurrence = null;
    }

    return new Transaction(transactionItem.id, {
      accountId: transactionItem.accountId,
      parentId: transactionItem.parentId,
      type: transactionItem.type,
      value: transactionItem.value,
      description: transactionItem.description,
      date: transactionItem.date,
      categoryId: transactionItem.categoryId,
      observations: transactionItem.observations,
      reserveId: transactionItem.reserveId,
      recurrence,
    });
  }

  static fromEntity(transaction: Transaction) {
    return new TransactionItem({
      id: transaction.id,
      accountId: transaction.accountId,
      parentId: transaction.parentId,
      type: transaction.type,
      value: transaction.value,
      description: transaction.description,
      date: transaction.date.toISOString(),
      categoryId: transaction.categoryId,
      observations: transaction.observations,
      reserveId: transaction.reserveId,
      recurrenceType: transaction.recurrence?.type ?? null,
      totalInstallments: transaction.recurrence?.totalInstallments ?? null,
      currentInstallment: transaction.recurrence?.currentInstallment ?? null,
    });
  }
}

export namespace TransactionItem {
  export type Period = `${string}-${string}`;

  export type Keys = {
    PK: `ACCOUNT#${string}`;
    SK: `TRANSACTION#${Period}#${string}`;
    GSI1PK: `TRANSACTION#${string}`;
    GSI1SK: `TRANSACTION#${string}`;
    GSI2PK?: `PARENT#${string}`;
    GSI2SK?: `TRANSACTION#${string}`;
  };

  export type Attributes = {
    id: string;
    accountId: string;
    parentId: string | null;
    type: Transaction.Type;
    value: number;
    description: string;
    date: string;
    categoryId: string;
    observations: string | null;
    reserveId: string | null;
    recurrenceType: Transaction.RecurrenceType | null;
    totalInstallments: number | null;
    currentInstallment: number | null;
  };

  export type Type = DynamoItem.Type<Keys, Attributes, 'Transaction'>;
}
