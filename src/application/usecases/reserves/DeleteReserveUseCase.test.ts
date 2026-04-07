import { describe, expect, it } from 'vitest';

import { InMemoryUnitOfWork } from '@application/_test/inMemory';
import { Reserve } from '@application/entities/Reserve';
import { Transaction } from '@application/entities/Transaction';
import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { IDService } from '@application/services/IDService';

import { DeleteReserveUseCase } from './DeleteReserveUseCase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validAccountId = IDService.generate();

const makeUseCase = () => {
  const uow = new InMemoryUnitOfWork();
  const useCase = new DeleteReserveUseCase(uow);
  return { uow, useCase };
};

const seedReserve = async (uow: InMemoryUnitOfWork, overrides?: Partial<Reserve.CreateParams>) => {
  const reserve = Reserve.create({
    accountId: validAccountId,
    name: 'Reserva de Emergência',
    platform: 'Nubank',
    value: 1000,
    categoryId: IDService.generate(),
    ...overrides,
  });
  await uow.reserveRepository.create(reserve);
  return reserve;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DeleteReserveUseCase', () => {
  describe('authorization', () => {
    it('should throw ResourceNotFoundError when reserve does not exist', async () => {
      const { useCase } = makeUseCase();

      await expect(
        useCase.execute({ reserveId: IDService.generate(), accountId: validAccountId }),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('should throw ResourceNotFoundError when reserve belongs to a different account', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow);

      await expect(
        useCase.execute({ reserveId: reserve.id, accountId: IDService.generate() }),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('reserve deletion', () => {
    it('should remove the reserve from the repository', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow);

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId });

      expect(uow.reserveRepository.items).toHaveLength(0);
    });
  });

  describe('transaction creation when value > 0', () => {
    it('should create an INCOME transaction', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow, { value: 1000 });

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId });

      expect(uow.transactionRepository.items).toHaveLength(1);
      expect(uow.transactionRepository.items[0].type).toBe(Transaction.Type.INCOME);
    });

    it('should set the reserve value as the transaction value', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow, { value: 2500 });

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId });

      expect(uow.transactionRepository.items[0].value).toBe(2500);
    });

    it('should link the transaction to the account and reserve', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow);

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId });

      const tx = uow.transactionRepository.items[0];
      expect(tx.accountId).toBe(validAccountId);
      expect(tx.reserveId).toBe(reserve.id);
    });

    it('should use the reserve categoryId on the transaction', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow);

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId });

      expect(uow.transactionRepository.items[0].categoryId).toBe(reserve.categoryId);
    });

    it('should return the id of the created transaction', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow);

      const { transactionIdCreated } = await useCase.execute({
        reserveId: reserve.id,
        accountId: validAccountId,
      });

      expect(uow.transactionRepository.items[0].id).toBe(transactionIdCreated);
    });
  });

  describe('when reserve value is 0', () => {
    it('should not create a transaction', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow, { value: 0 });

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId });

      expect(uow.transactionRepository.items).toHaveLength(0);
    });

    it('should still delete the reserve', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow, { value: 0 });

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId });

      expect(uow.reserveRepository.items).toHaveLength(0);
    });
  });
});
