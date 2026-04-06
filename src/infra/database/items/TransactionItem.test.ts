import { describe, expect, it } from 'vitest';

import { Transaction } from '@application/entities/Transaction';
import { IDService } from '@application/services/IDService';

import { TransactionItem } from './TransactionItem';

const makeTransaction = (overrides?: Partial<Parameters<typeof Transaction.create>[0]>) =>
  Transaction.create({
    accountId: IDService.generate(),
    type: Transaction.Type.EXPENSE,
    value: 150,
    description: 'Mercado',
    date: new Date('2025-03-15'),
    categoryId: IDService.generate(),
    observations: null,
    recurrence: null,
    ...overrides,
  });

// ─── getPK ───────────────────────────────────────────────────────────────────

describe('TransactionItem.getPK', () => {
  it('should return ACCOUNT#<accountId>', () => {
    const id = IDService.generate();
    expect(TransactionItem.getPK(id)).toBe(`ACCOUNT#${id}`);
  });
});

// ─── getSK ───────────────────────────────────────────────────────────────────

describe('TransactionItem.getSK', () => {
  it('should return TRANSACTION#<YYYY-MM>#<id> from a Date object', () => {
    const txId = IDService.generate();
    const sk = TransactionItem.getSK(new Date('2025-03-15'), txId);
    expect(sk).toBe(`TRANSACTION#2025-03#${txId}`);
  });

  it('should return TRANSACTION#<YYYY-MM>#<id> from an ISO date string', () => {
    const txId = IDService.generate();
    const sk = TransactionItem.getSK('2025-03-15', txId);
    expect(sk).toBe(`TRANSACTION#2025-03#${txId}`);
  });

  it('should pad single-digit month with zero', () => {
    const txId = IDService.generate();
    const sk = TransactionItem.getSK(new Date('2025-01-05'), txId);
    expect(sk).toContain('TRANSACTION#2025-01#');
  });

  it('should handle december correctly', () => {
    const txId = IDService.generate();
    const sk = TransactionItem.getSK(new Date('2025-12-31'), txId);
    expect(sk).toBe(`TRANSACTION#2025-12#${txId}`);
  });
});

// ─── fromEntity ──────────────────────────────────────────────────────────────

describe('TransactionItem.fromEntity', () => {
  it('should map all base fields from the entity', () => {
    const transaction = makeTransaction();
    const item = TransactionItem.fromEntity(transaction).toItem();

    expect(item.id).toBe(transaction.id);
    expect(item.accountId).toBe(transaction.accountId);
    expect(item.type).toBe(Transaction.Type.EXPENSE);
    expect(item.value).toBe(150);
    expect(item.description).toBe('Mercado');
    expect(item.categoryId).toBe(transaction.categoryId);
    expect(item.observations).toBeNull();
    expect(item.entityType).toBe(TransactionItem.type);
  });

  it('should set PK as ACCOUNT#<accountId>', () => {
    const transaction = makeTransaction();
    const item = TransactionItem.fromEntity(transaction).toItem();
    expect(item.PK).toBe(`ACCOUNT#${transaction.accountId}`);
  });

  it('should set SK as TRANSACTION#<YYYY-MM>#<id>', () => {
    const transaction = makeTransaction();
    const item = TransactionItem.fromEntity(transaction).toItem();
    expect(item.SK).toBe(`TRANSACTION#2025-03#${transaction.id}`);
  });

  it('should store parentId as null when not provided', () => {
    const item = TransactionItem.fromEntity(makeTransaction()).toItem();
    expect(item.parentId).toBeNull();
  });

  it('should store parentId when provided', () => {
    const parentId = IDService.generate();
    const item = TransactionItem.fromEntity(makeTransaction({ parentId })).toItem();
    expect(item.parentId).toBe(parentId);
  });

  it('should store reserveId as null when not provided', () => {
    const item = TransactionItem.fromEntity(makeTransaction()).toItem();
    expect(item.reserveId).toBeNull();
  });

  it('should store reserveId when transaction is linked to a reserve', () => {
    const reserveId = IDService.generate();
    const item = TransactionItem.fromEntity(makeTransaction({ reserveId })).toItem();
    expect(item.reserveId).toBe(reserveId);
  });

  describe('recurrence flattening', () => {
    it('should set all recurrence fields to null when recurrence is null', () => {
      const item = TransactionItem.fromEntity(makeTransaction({ recurrence: null })).toItem();

      expect(item.recurrenceType).toBeNull();
      expect(item.totalInstallments).toBeNull();
      expect(item.currentInstallment).toBeNull();
    });

    it('should flatten RECURRING recurrence correctly', () => {
      const item = TransactionItem.fromEntity(
        makeTransaction({ recurrence: { type: Transaction.RecurrenceType.RECURRING } }),
      ).toItem();

      expect(item.recurrenceType).toBe(Transaction.RecurrenceType.RECURRING);
      expect(item.totalInstallments).toBeNull();
      expect(item.currentInstallment).toBeNull();
    });

    it('should flatten INSTALLMENT recurrence correctly', () => {
      const item = TransactionItem.fromEntity(
        makeTransaction({
          recurrence: {
            type: Transaction.RecurrenceType.INSTALLMENT,
            totalInstallments: 12,
            currentInstallment: 3,
          },
        }),
      ).toItem();

      expect(item.recurrenceType).toBe(Transaction.RecurrenceType.INSTALLMENT);
      expect(item.totalInstallments).toBe(12);
      expect(item.currentInstallment).toBe(3);
    });
  });
});
