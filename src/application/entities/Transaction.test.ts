import { describe, expect, it } from 'vitest';

import { ValueObjectError } from '@application/errors/ValueObjectError';
import { IDService } from '@application/services/IDService';

import { Transaction } from './Transaction';

const validAccountId = IDService.generate();
const validCategoryId = IDService.generate();
const validDate = new Date('2025-01-15');

const create = (overrides?: Partial<Parameters<typeof Transaction.create>[0]>) =>
  Transaction.create({
    accountId: overrides?.accountId ?? validAccountId,
    parentId: overrides?.parentId,
    type: overrides?.type ?? Transaction.Type.EXPENSE,
    value: overrides?.value ?? 100.5,
    description: overrides?.description ?? 'Mercado',
    date: overrides?.date ?? validDate,
    categoryId: overrides?.categoryId ?? validCategoryId,
    observations: overrides?.observations ?? null,
    reserveId: overrides?.reserveId,
    recurrence: overrides?.recurrence ?? null,
  });

describe('Transaction.create', () => {
  describe('happy path', () => {
    it('should create a transaction with a generated id', () => {
      const transaction = create();

      expect(transaction.id).toBeTruthy();
      expect(transaction.accountId).toBe(validAccountId);
      expect(transaction.type).toBe(Transaction.Type.EXPENSE);
      expect(transaction.value).toBe(100.5);
      expect(transaction.date).toStrictEqual(validDate);
      expect(transaction.description).toBe('Mercado');
      expect(transaction.categoryId).toBe(validCategoryId);
      expect(transaction.observations).toBeNull();
      expect(transaction.recurrence).toBeNull();
    });

    it('should generate a unique id on each call', () => {
      expect(create().id).not.toBe(create().id);
    });

    it('should accept INCOME type', () => {
      expect(create({ type: Transaction.Type.INCOME }).type).toBe(Transaction.Type.INCOME);
    });

    it('should accept observations when provided', () => {
      expect(create({ observations: 'Pago no débito' }).observations).toBe('Pago no débito');
    });

    it('should default reserveId to null', () => {
      expect(create().reserveId).toBeNull();
    });

    it('should accept a valid reserveId', () => {
      const reserveId = IDService.generate();
      expect(create({ reserveId }).reserveId).toBe(reserveId);
    });

    it('should accept a date as ISO string (coercion)', () => {
      expect(create({ date: '2025-06-15' }).date).toBeInstanceOf(Date);
    });

    it('should accept recurring recurrence', () => {
      const transaction = create({
        recurrence: {
          type: Transaction.RecurrenceType.RECURRING,
          totalInstallments: null,
          currentInstallment: null,
        },
      });

      expect(transaction.recurrence).toEqual({
        type: Transaction.RecurrenceType.RECURRING,
        totalInstallments: null,
        currentInstallment: null,
      });
    });

    it('should accept installment recurrence', () => {
      const transaction = create({
        recurrence: {
          type: Transaction.RecurrenceType.INSTALLMENT,
          totalInstallments: 12,
          currentInstallment: 3,
        },
      });

      expect(transaction.recurrence).toMatchObject({
        type: Transaction.RecurrenceType.INSTALLMENT,
        totalInstallments: 12,
        currentInstallment: 3,
      });
    });
  });

  describe('value', () => {
    it('should throw for zero', () => {
      expect(() => create({ value: 0 })).toThrow(ValueObjectError);
    });

    it('should throw for negative', () => {
      expect(() => create({ value: -1 })).toThrow(ValueObjectError);
    });

    it('should throw above 1_000_000_000', () => {
      expect(() => create({ value: 1_000_000_001 })).toThrow(ValueObjectError);
    });

    it('should accept minimum value (0.01)', () => {
      expect(() => create({ value: 0.01 })).not.toThrow();
    });
  });

  describe('description', () => {
    it('should throw for 1 character', () => {
      expect(() => create({ description: 'A' })).toThrow(ValueObjectError);
    });

    it('should throw for empty string', () => {
      expect(() => create({ description: '' })).toThrow(ValueObjectError);
    });

    it('should throw for more than 200 characters', () => {
      expect(() => create({ description: 'A'.repeat(201) })).toThrow(ValueObjectError);
    });
  });

  describe('date', () => {
    it('should throw for an invalid date string', () => {
      expect(() => create({ date: 'not-a-date' })).toThrow(ValueObjectError);
    });
  });

  describe('categoryId', () => {
    it('should throw for a non-KSUID string', () => {
      expect(() => create({ categoryId: 'invalid-id' })).toThrow(ValueObjectError);
    });

    it('should throw for empty string', () => {
      expect(() => create({ categoryId: '' })).toThrow(ValueObjectError);
    });
  });

  describe('reserveId', () => {
    it('should throw for an invalid KSUID', () => {
      expect(() => create({ reserveId: 'not-a-ksuid' })).toThrow(ValueObjectError);
    });

    it('should throw when reserveId is set together with recurrence (RECURRING)', () => {
      expect(() =>
        create({
          reserveId: IDService.generate(),
          recurrence: { type: Transaction.RecurrenceType.RECURRING },
        }),
      ).toThrow(ValueObjectError);
    });

    it('should throw when reserveId is set together with recurrence (INSTALLMENT)', () => {
      expect(() =>
        create({
          reserveId: IDService.generate(),
          recurrence: {
            type: Transaction.RecurrenceType.INSTALLMENT,
            totalInstallments: 6,
            currentInstallment: 1,
          },
        }),
      ).toThrow(ValueObjectError);
    });

    it('should allow reserveId without recurrence', () => {
      expect(() => create({ reserveId: IDService.generate(), recurrence: null })).not.toThrow();
    });
  });

  describe('observations', () => {
    it('should throw for more than 200 characters', () => {
      expect(() => create({ observations: 'A'.repeat(201) })).toThrow(ValueObjectError);
    });
  });

  describe('installment recurrence', () => {
    const installment = (total: number, current: number): Transaction['recurrence'] => ({
      type: Transaction.RecurrenceType.INSTALLMENT,
      totalInstallments: total,
      currentInstallment: current,
    });

    it('should throw when currentInstallment exceeds totalInstallments', () => {
      expect(() => create({ recurrence: installment(6, 7) })).toThrow(ValueObjectError);
    });

    it('should throw when totalInstallments is 0', () => {
      expect(() => create({ recurrence: installment(0, 1) })).toThrow(ValueObjectError);
    });

    it('should throw when totalInstallments exceeds 200', () => {
      expect(() => create({ recurrence: installment(201, 1) })).toThrow(ValueObjectError);
    });

    it('should throw when currentInstallment is 0', () => {
      expect(() => create({ recurrence: installment(6, 0) })).toThrow(ValueObjectError);
    });

    it('should accept currentInstallment equal to totalInstallments', () => {
      expect(() => create({ recurrence: installment(6, 6) })).not.toThrow();
    });
  });
});
