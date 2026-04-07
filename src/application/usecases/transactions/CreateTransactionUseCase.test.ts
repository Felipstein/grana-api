import { describe, expect, it, vi } from 'vitest';

import { Category } from '@application/entities/Category';
import { Transaction } from '@application/entities/Transaction';
import { IDService } from '@application/services/IDService';

import { InMemoryUnitOfWork } from '@application/_test/inMemory';

import { CreateTransactionUseCase } from './CreateTransactionUseCase';

import type { ResolveCategoryService } from '@application/services/ResolveCategoryService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validAccountId = IDService.generate();

const makeResolvedCategory = (accountId = validAccountId) =>
  Category.create({ accountId, name: 'Alimentação' });

const makeUseCase = (resolvedCategory?: Category) => {
  const uow = new InMemoryUnitOfWork();
  const category = resolvedCategory ?? makeResolvedCategory();
  const resolveCategoryService = {
    resolve: vi.fn().mockResolvedValue(category),
  } as unknown as ResolveCategoryService;
  const useCase = new CreateTransactionUseCase(uow, resolveCategoryService);
  return { uow, useCase, resolveCategoryService, category };
};

const validInput = {
  accountId: validAccountId,
  type: Transaction.Type.EXPENSE,
  value: 100,
  description: 'Mercado',
  date: new Date('2025-01-15'),
  category: 'Alimentação',
  observations: null,
  recurrence: null,
} satisfies Parameters<CreateTransactionUseCase['execute']>[0];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CreateTransactionUseCase', () => {
  describe('category resolution', () => {
    it('should call resolveCategoryService with the provided category and accountId', async () => {
      const { useCase, resolveCategoryService } = makeUseCase();

      await useCase.execute(validInput);

      expect(resolveCategoryService.resolve).toHaveBeenCalledWith({
        categoryIdOrName: 'Alimentação',
        accountId: validAccountId,
      });
    });

    it('should persist the transaction with the resolved categoryId', async () => {
      const { uow, useCase, category } = makeUseCase();

      await useCase.execute(validInput);

      expect(uow.transactionRepository.items[0].categoryId).toBe(category.id);
    });
  });

  describe('once (no recurrence)', () => {
    it('should create a single transaction and return its id', async () => {
      const { uow, useCase } = makeUseCase();

      const { transactionId } = await useCase.execute(validInput);

      expect(uow.transactionRepository.items).toHaveLength(1);
      expect(uow.transactionRepository.items[0].id).toBe(transactionId);
    });

    it('should persist the transaction with the correct data', async () => {
      const { uow, useCase } = makeUseCase();

      await useCase.execute(validInput);

      const saved = uow.transactionRepository.items[0];
      expect(saved.type).toBe(validInput.type);
      expect(saved.value).toBe(validInput.value);
      expect(saved.description).toBe(validInput.description);
      expect(saved.parentId).toBeNull();
      expect(saved.reserveId).toBeNull();
    });

    it('should persist reserveId when transaction is linked to a reserve', async () => {
      const { uow, useCase } = makeUseCase();
      const reserveId = IDService.generate();

      await useCase.execute({ ...validInput, reserveId });

      expect(uow.transactionRepository.items[0].reserveId).toBe(reserveId);
    });
  });

  describe('recurring', () => {
    const recurringInput = {
      ...validInput,
      recurrence: { type: Transaction.RecurrenceType.RECURRING },
    } satisfies Parameters<CreateTransactionUseCase['execute']>[0];

    it('should create 13 transactions (parent + 12 months ahead)', async () => {
      const { uow, useCase } = makeUseCase();

      await useCase.execute(recurringInput);

      expect(uow.transactionRepository.items).toHaveLength(13);
    });

    it('should link all children to the parent via parentId', async () => {
      const { uow, useCase } = makeUseCase();

      const { transactionId } = await useCase.execute(recurringInput);

      const children = uow.transactionRepository.items.slice(1);
      expect(children.every((t) => t.parentId === transactionId)).toBe(true);
    });

    it('should set recurrence type RECURRING on all children', async () => {
      const { uow, useCase } = makeUseCase();

      await useCase.execute(recurringInput);

      const children = uow.transactionRepository.items.slice(1);
      expect(
        children.every((t) => t.recurrence?.type === Transaction.RecurrenceType.RECURRING),
      ).toBe(true);
    });

    it('each child should have a unique date offset by month', async () => {
      const { uow, useCase } = makeUseCase();

      await useCase.execute(recurringInput);

      const dates = uow.transactionRepository.items.slice(1).map((t) => t.date.getMonth());
      const uniqueMonths = new Set(dates);
      expect(uniqueMonths.size).toBe(12);
    });
  });

  describe('installment', () => {
    const installmentInput = {
      ...validInput,
      recurrence: {
        type: Transaction.RecurrenceType.INSTALLMENT,
        totalInstallments: 6,
        currentInstallment: 1,
      },
    } satisfies Parameters<CreateTransactionUseCase['execute']>[0];

    it('should create 7 transactions (parent + 6 installments)', async () => {
      const { uow, useCase } = makeUseCase();

      await useCase.execute(installmentInput);

      expect(uow.transactionRepository.items).toHaveLength(7);
    });

    it('should link all installments to the parent via parentId', async () => {
      const { uow, useCase } = makeUseCase();

      const { transactionId } = await useCase.execute(installmentInput);

      const children = uow.transactionRepository.items.slice(1);
      expect(children.every((t) => t.parentId === transactionId)).toBe(true);
    });

    it('should set correct currentInstallment on each child', async () => {
      const { uow, useCase } = makeUseCase();

      await useCase.execute(installmentInput);

      const children = uow.transactionRepository.items.slice(1);
      children.forEach((t, i) => {
        const recurrence = t.recurrence as { currentInstallment: number };
        expect(recurrence.currentInstallment).toBe(i + 1);
      });
    });

    it('should respect totalInstallments on all children', async () => {
      const { uow, useCase } = makeUseCase();

      await useCase.execute(installmentInput);

      const children = uow.transactionRepository.items.slice(1);
      expect(
        children.every((t) => {
          const r = t.recurrence as { totalInstallments: number };
          return r.totalInstallments === 6;
        }),
      ).toBe(true);
    });

    it('should create only remaining installments when starting mid-series', async () => {
      const { uow, useCase } = makeUseCase();

      await useCase.execute({
        ...installmentInput,
        recurrence: {
          type: Transaction.RecurrenceType.INSTALLMENT,
          totalInstallments: 6,
          currentInstallment: 4,
        },
      });

      // parent + installments 4, 5, 6 = 4 transactions
      expect(uow.transactionRepository.items).toHaveLength(4);
    });
  });
});
