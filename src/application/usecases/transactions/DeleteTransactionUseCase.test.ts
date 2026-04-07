import { describe, expect, it } from 'vitest';

import { InMemoryUnitOfWork } from '@application/_test/inMemory';
import { Transaction } from '@application/entities/Transaction';
import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { IDService } from '@application/services/IDService';

import { DeleteTransactionUseCase } from './DeleteTransactionUseCase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validAccountId = IDService.generate();

const makeUseCase = () => {
  const uow = new InMemoryUnitOfWork();
  const useCase = new DeleteTransactionUseCase(uow);
  return { uow, useCase };
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
    date: new Date('2026-04-07'),
    categoryId: IDService.generate(),
    observations: null,
    recurrence: null,
    ...overrides,
  });
  await uow.transactionRepository.create(transaction);
  return transaction;
};

const seedParentWithChildren = async (uow: InMemoryUnitOfWork, childCount = 2) => {
  const parent = await seedTransaction(uow);
  const children = await Promise.all(
    Array.from({ length: childCount }, (_, i) =>
      seedTransaction(uow, {
        parentId: parent.id,
        date: new Date(`2026-0${i + 5}-07`),
      }),
    ),
  );
  return { parent, children };
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DeleteTransactionUseCase', () => {
  describe('authorization', () => {
    it('should throw ResourceNotFoundError when transaction does not exist', async () => {
      const { useCase } = makeUseCase();

      await expect(
        useCase.execute({
          transactionId: IDService.generate(),
          accountId: validAccountId,
          deleteAllRecurrences: false,
        }),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('should throw ResourceNotFoundError when transaction belongs to a different account', async () => {
      const { uow, useCase } = makeUseCase();
      const transaction = await seedTransaction(uow);

      await expect(
        useCase.execute({
          transactionId: transaction.id,
          accountId: IDService.generate(),
          deleteAllRecurrences: false,
        }),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('single deletion (deleteAllRecurrences: false)', () => {
    it('should delete the transaction', async () => {
      const { uow, useCase } = makeUseCase();
      const transaction = await seedTransaction(uow);

      await useCase.execute({
        transactionId: transaction.id,
        accountId: validAccountId,
        deleteAllRecurrences: false,
      });

      expect(uow.transactionRepository.items).toHaveLength(0);
    });

    it('should not delete children when deleteAllRecurrences is false', async () => {
      const { uow, useCase } = makeUseCase();
      const { parent } = await seedParentWithChildren(uow);

      await useCase.execute({
        transactionId: parent.id,
        accountId: validAccountId,
        deleteAllRecurrences: false,
      });

      expect(uow.transactionRepository.items).toHaveLength(2);
    });
  });

  describe('cascade deletion (deleteAllRecurrences: true)', () => {
    it('should delete the parent transaction', async () => {
      const { uow, useCase } = makeUseCase();
      const { parent } = await seedParentWithChildren(uow);

      await useCase.execute({
        transactionId: parent.id,
        accountId: validAccountId,
        deleteAllRecurrences: true,
      });

      expect(uow.transactionRepository.items.find((t) => t.id === parent.id)).toBeUndefined();
    });

    it('should delete all children', async () => {
      const { uow, useCase } = makeUseCase();
      const { parent } = await seedParentWithChildren(uow, 3);

      await useCase.execute({
        transactionId: parent.id,
        accountId: validAccountId,
        deleteAllRecurrences: true,
      });

      expect(uow.transactionRepository.items).toHaveLength(0);
    });

    it('should succeed with deleteAllRecurrences true even when transaction has no children', async () => {
      const { uow, useCase } = makeUseCase();
      const transaction = await seedTransaction(uow);

      await useCase.execute({
        transactionId: transaction.id,
        accountId: validAccountId,
        deleteAllRecurrences: true,
      });

      expect(uow.transactionRepository.items).toHaveLength(0);
    });
  });
});
