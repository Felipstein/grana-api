import { describe, expect, it } from 'vitest';

import { Reserve } from '@application/entities/Reserve';
import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { IDService } from '@application/services/IDService';

import { InMemoryReserveRepository } from '@application/_test/inMemory';

import { UpdateReserveUseCase } from './UpdateReserveUseCase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validAccountId = IDService.generate();

const makeUseCase = () => {
  const reserveRepository = new InMemoryReserveRepository();
  const useCase = new UpdateReserveUseCase(reserveRepository);
  return { reserveRepository, useCase };
};

const seedReserve = async (repo: InMemoryReserveRepository, overrides?: Partial<Reserve.CreateParams>) => {
  const reserve = Reserve.create({
    accountId: validAccountId,
    name: 'Nubank',
    platform: 'Banco Digital',
    value: 1500,
    categoryId: IDService.generate(),
    ...overrides,
  });
  await repo.create(reserve);
  return reserve;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UpdateReserveUseCase', () => {
  describe('authorization', () => {
    it('should throw ResourceNotFoundError when reserve does not exist', async () => {
      const { useCase } = makeUseCase();

      await expect(
        useCase.execute({ reserveId: IDService.generate(), accountId: validAccountId, data: {} }),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('should throw ResourceNotFoundError when reserve belongs to a different account', async () => {
      const { reserveRepository, useCase } = makeUseCase();
      const reserve = await seedReserve(reserveRepository);

      await expect(
        useCase.execute({ reserveId: reserve.id, accountId: IDService.generate(), data: {} }),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('field updates', () => {
    it('should update name when provided', async () => {
      const { reserveRepository, useCase } = makeUseCase();
      const reserve = await seedReserve(reserveRepository);

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId, data: { name: 'Itaú' } });

      expect(reserveRepository.items[0].name).toBe('Itaú');
    });

    it('should update platform when provided', async () => {
      const { reserveRepository, useCase } = makeUseCase();
      const reserve = await seedReserve(reserveRepository);

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId, data: { platform: 'Corretora' } });

      expect(reserveRepository.items[0].platform).toBe('Corretora');
    });

    it('should not change fields that were not provided', async () => {
      const { reserveRepository, useCase } = makeUseCase();
      const reserve = await seedReserve(reserveRepository);

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId, data: { name: 'XP' } });

      expect(reserveRepository.items[0].platform).toBe('Banco Digital');
    });

    it('should save the reserve after update', async () => {
      const { reserveRepository, useCase } = makeUseCase();
      const reserve = await seedReserve(reserveRepository);

      await useCase.execute({ reserveId: reserve.id, accountId: validAccountId, data: { name: 'XP' } });

      expect(reserveRepository.items).toHaveLength(1);
      expect(reserveRepository.items[0].name).toBe('XP');
    });
  });
});
