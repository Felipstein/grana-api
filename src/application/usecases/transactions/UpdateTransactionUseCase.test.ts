import { describe, expect, it, vi } from 'vitest';

import { InMemoryUnitOfWork } from '@application/_test/inMemory';
import { Category } from '@application/entities/Category';
import { Transaction } from '@application/entities/Transaction';
import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { IDService } from '@application/services/IDService';

import { UpdateTransactionUseCase } from './UpdateTransactionUseCase';

import type { ResolveCategoryService } from '@application/services/ResolveCategoryService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validAccountId = IDService.generate();

const makeUseCase = () => {
  const uow = new InMemoryUnitOfWork();
  const resolveCategoryService = {
    resolve: vi.fn(),
  } as unknown as ResolveCategoryService;
  const useCase = new UpdateTransactionUseCase(uow, resolveCategoryService);
  return { uow, useCase, resolveCategoryService };
};

const seedTransaction = async (
  uow: InMemoryUnitOfWork,
  overrides?: Partial<Transaction.CreateParams>,
) => {
  const transaction = Transaction.create({
    accountId: validAccountId,
    type: Transaction.Type.EXPENSE,
    value: 100,
    description: 'Mercado',
    date: new Date('2025-01-15'),
    categoryId: IDService.generate(),
    observations: null,
    recurrence: null,
    ...overrides,
  });
  await uow.transactionRepository.create(transaction);
  return transaction;
};

const baseInput = (
  transactionId: string,
  data: Parameters<UpdateTransactionUseCase['execute']>[0]['data'] = {},
) => ({
  transactionId,
  accountId: validAccountId,
  data,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UpdateTransactionUseCase', () => {
  describe('authorization', () => {
    it('should throw ResourceNotFoundError when transaction does not exist', async () => {
      const { useCase } = makeUseCase();

      await expect(useCase.execute(baseInput(IDService.generate()))).rejects.toThrow(
        ResourceNotFoundError,
      );
    });

    it('should throw ResourceNotFoundError when transaction belongs to a different account', async () => {
      const { uow, useCase } = makeUseCase();
      const transaction = await seedTransaction(uow);

      await expect(
        useCase.execute({
          transactionId: transaction.id,
          accountId: IDService.generate(),
          data: {},
        }),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('field updates', () => {
    it('should update type when provided', async () => {
      const { uow, useCase } = makeUseCase();
      const transaction = await seedTransaction(uow, { type: Transaction.Type.EXPENSE });

      await useCase.execute(baseInput(transaction.id, { type: Transaction.Type.INCOME }));

      expect(uow.transactionRepository.items[0].type).toBe(Transaction.Type.INCOME);
    });

    it('should update value when provided', async () => {
      const { uow, useCase } = makeUseCase();
      const transaction = await seedTransaction(uow);

      await useCase.execute(baseInput(transaction.id, { value: 250 }));

      expect(uow.transactionRepository.items[0].value).toBe(250);
    });

    it('should update description when provided', async () => {
      const { uow, useCase } = makeUseCase();
      const transaction = await seedTransaction(uow);

      await useCase.execute(baseInput(transaction.id, { description: 'Padaria' }));

      expect(uow.transactionRepository.items[0].description).toBe('Padaria');
    });

    it('should update date when provided', async () => {
      const { uow, useCase } = makeUseCase();
      const transaction = await seedTransaction(uow);
      const newDate = new Date('2025-06-20');

      await useCase.execute(baseInput(transaction.id, { date: newDate }));

      expect(uow.transactionRepository.items[0].date).toStrictEqual(newDate);
    });

    it('should update observations when provided', async () => {
      const { uow, useCase } = makeUseCase();
      const transaction = await seedTransaction(uow);

      await useCase.execute(baseInput(transaction.id, { observations: 'Pago no débito' }));

      expect(uow.transactionRepository.items[0].observations).toBe('Pago no débito');
    });

    it('should clear observations when null is provided', async () => {
      const { uow, useCase } = makeUseCase();
      const transaction = await seedTransaction(uow, { observations: 'Pago no débito' });

      await useCase.execute(baseInput(transaction.id, { observations: null }));

      expect(uow.transactionRepository.items[0].observations).toBeNull();
    });

    it('should not change fields that were not provided', async () => {
      const { uow, useCase } = makeUseCase();
      const transaction = await seedTransaction(uow);

      await useCase.execute(baseInput(transaction.id, { value: 999 }));

      const saved = uow.transactionRepository.items[0];
      expect(saved.description).toBe('Mercado');
      expect(saved.type).toBe(Transaction.Type.EXPENSE);
    });
  });

  describe('category resolution', () => {
    it('should resolve category and update categoryId when category is provided', async () => {
      const { uow, useCase, resolveCategoryService } = makeUseCase();
      const transaction = await seedTransaction(uow);
      const newCategory = Category.create({ accountId: validAccountId, name: 'Lazer' });

      vi.mocked(resolveCategoryService.resolve).mockResolvedValueOnce(newCategory);

      await useCase.execute(baseInput(transaction.id, { category: 'Lazer' }));

      expect(resolveCategoryService.resolve).toHaveBeenCalledWith({
        accountId: validAccountId,
        categoryIdOrName: 'Lazer',
      });
      expect(uow.transactionRepository.items[0].categoryId).toBe(newCategory.id);
    });

    it('should not call resolveCategoryService when category is not provided', async () => {
      const { uow, useCase, resolveCategoryService } = makeUseCase();
      const transaction = await seedTransaction(uow);

      await useCase.execute(baseInput(transaction.id, { value: 50 }));

      expect(resolveCategoryService.resolve).not.toHaveBeenCalled();
    });
  });

  describe('updateAllRecurrences', () => {
    const seedParentWithChildren = async (uow: InMemoryUnitOfWork) => {
      const parent = await seedTransaction(uow);

      const child1 = await seedTransaction(uow, {
        parentId: parent.id,
        date: new Date('2025-02-15'),
      });
      const child2 = await seedTransaction(uow, {
        parentId: parent.id,
        date: new Date('2025-03-15'),
      });

      return { parent, children: [child1, child2] };
    };

    it('should update parent and all children when updateAllRecurrences is true', async () => {
      const { uow, useCase } = makeUseCase();
      const { parent } = await seedParentWithChildren(uow);

      await useCase.execute(baseInput(parent.id, { value: 500, updateAllRecurrences: true }));

      expect(uow.transactionRepository.items.every((t) => t.value === 500)).toBe(true);
    });

    it('should update all 3 transactions (parent + 2 children)', async () => {
      const { uow, useCase } = makeUseCase();
      const { parent } = await seedParentWithChildren(uow);

      await useCase.execute(
        baseInput(parent.id, { description: 'Netflix', updateAllRecurrences: true }),
      );

      expect(uow.transactionRepository.items.every((t) => t.description === 'Netflix')).toBe(true);
    });

    it('should update only the parent when updateAllRecurrences is false', async () => {
      const { uow, useCase } = makeUseCase();
      const { parent, children } = await seedParentWithChildren(uow);
      const originalChildValue = children[0].value;

      await useCase.execute(baseInput(parent.id, { value: 500, updateAllRecurrences: false }));

      expect(uow.transactionRepository.items[0].value).toBe(500);
      expect(uow.transactionRepository.items[1].value).toBe(originalChildValue);
      expect(uow.transactionRepository.items[2].value).toBe(originalChildValue);
    });

    it('should update only the parent when updateAllRecurrences is not provided', async () => {
      const { uow, useCase } = makeUseCase();
      const { parent, children } = await seedParentWithChildren(uow);
      const originalChildValue = children[0].value;

      await useCase.execute(baseInput(parent.id, { value: 500 }));

      expect(uow.transactionRepository.items[0].value).toBe(500);
      expect(uow.transactionRepository.items[1].value).toBe(originalChildValue);
    });

    it('should succeed with updateAllRecurrences true even when transaction has no children', async () => {
      const { uow, useCase } = makeUseCase();
      const transaction = await seedTransaction(uow);

      await expect(
        useCase.execute(baseInput(transaction.id, { value: 500, updateAllRecurrences: true })),
      ).resolves.not.toThrow();

      expect(uow.transactionRepository.items[0].value).toBe(500);
    });
  });

  describe('persistence', () => {
    it('should call save (not create) to persist updates', async () => {
      const { uow, useCase } = makeUseCase();
      const transaction = await seedTransaction(uow);

      await useCase.execute(baseInput(transaction.id, { value: 200 }));

      // repo still has 1 item (save replaced it, create would add another)
      expect(uow.transactionRepository.items).toHaveLength(1);
    });
  });
});
