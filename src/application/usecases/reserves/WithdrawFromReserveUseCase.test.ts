import { describe, expect, it } from 'vitest';

import { Reserve } from '@application/entities/Reserve';
import { Transaction } from '@application/entities/Transaction';
import { DomainError } from '@application/errors/DomainError';
import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { IDService } from '@application/services/IDService';

import { InMemoryUnitOfWork } from '@application/_test/inMemory';

import { WithdrawFromReserveUseCase } from './WithdrawFromReserveUseCase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validAccountId = IDService.generate();

const makeUseCase = () => {
  const uow = new InMemoryUnitOfWork();
  const useCase = new WithdrawFromReserveUseCase(uow);
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

describe('WithdrawFromReserveUseCase', () => {
  describe('authorization', () => {
    it('should throw ResourceNotFoundError when reserve does not exist', async () => {
      const { useCase } = makeUseCase();

      await expect(
        useCase.execute({ reserveId: IDService.generate(), accountId: validAccountId, value: 500, date: new Date(), observations: null }),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('should throw ResourceNotFoundError when reserve belongs to a different account', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow);

      await expect(
        useCase.execute({ reserveId: reserve.id, accountId: IDService.generate(), value: 500, date: new Date(), observations: null }),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('reserve update', () => {
    it('should decrease reserve value by the withdrawn amount', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow, { value: 1000 });

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId, value: 400, date: new Date('2026-04-06'), observations: null });

      expect(uow.reserveRepository.items[0].value).toBe(600);
    });

    it('should save the reserve after updating the value', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow, { value: 1000 });

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId, value: 200, date: new Date('2026-04-06'), observations: null });

      expect(uow.reserveRepository.items[0].value).toBe(800);
    });

    it('should throw DomainError when withdrawing more than the reserve balance', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow, { value: 500 });

      await expect(
        useCase.execute({ reserveId: reserve.id, accountId: validAccountId, value: 501, date: new Date(), observations: null }),
      ).rejects.toThrow(DomainError);
    });

    it('should not create a transaction when withdrawal fails due to insufficient balance', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow, { value: 500 });

      await expect(
        useCase.execute({ reserveId: reserve.id, accountId: validAccountId, value: 600, date: new Date(), observations: null }),
      ).rejects.toThrow();

      expect(uow.transactionRepository.items).toHaveLength(0);
    });
  });

  describe('transaction creation', () => {
    it('should create an INCOME transaction', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow);

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId, value: 500, date: new Date('2026-04-06'), observations: null });

      expect(uow.transactionRepository.items).toHaveLength(1);
      expect(uow.transactionRepository.items[0].type).toBe(Transaction.Type.INCOME);
    });

    it('should link the transaction to the reserve via reserveId', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow);

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId, value: 500, date: new Date('2026-04-06'), observations: null });

      expect(uow.transactionRepository.items[0].reserveId).toBe(reserve.id);
    });

    it('should set the correct value, date and accountId on the transaction', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow);
      const date = new Date('2026-04-06');

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId, value: 300, date, observations: null });

      const tx = uow.transactionRepository.items[0];
      expect(tx.value).toBe(300);
      expect(tx.date).toStrictEqual(date);
      expect(tx.accountId).toBe(validAccountId);
    });

    it('should set observations on the transaction when provided', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow);

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId, value: 500, date: new Date('2026-04-06'), observations: 'Emergência médica' });

      expect(uow.transactionRepository.items[0].observations).toBe('Emergência médica');
    });

    it('should use the reserve categoryId on the transaction', async () => {
      const { uow, useCase } = makeUseCase();
      const reserve = await seedReserve(uow);

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId, value: 500, date: new Date('2026-04-06'), observations: null });

      expect(uow.transactionRepository.items[0].categoryId).toBe(reserve.categoryId);
    });
  });
});
