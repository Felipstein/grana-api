import { describe, expect, it } from 'vitest';

import { InMemoryUnitOfWork } from '@application/_test/inMemory';
import { IDService } from '@application/services/IDService';

import { CreateReserveUseCase } from './CreateReserveUseCase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validInput = {
  accountId: IDService.generate(),
  name: 'Reserva de Emergência',
  platform: 'Nubank',
  value: 1500,
};

const makeUseCase = () => {
  const uow = new InMemoryUnitOfWork();
  const useCase = new CreateReserveUseCase(uow);
  return { uow, useCase };
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CreateReserveUseCase', () => {
  it('should create a reserve and return its id', async () => {
    const { uow, useCase } = makeUseCase();

    const { reserveId } = await useCase.execute(validInput);

    expect(uow.reserveRepository.items).toHaveLength(1);
    expect(uow.reserveRepository.items[0].id).toBe(reserveId);
  });

  it('should persist the reserve with the correct data', async () => {
    const { uow, useCase } = makeUseCase();

    await useCase.execute(validInput);

    const saved = uow.reserveRepository.items[0];
    expect(saved.accountId).toBe(validInput.accountId);
    expect(saved.name).toBe(validInput.name);
    expect(saved.platform).toBe(validInput.platform);
    expect(saved.value).toBe(validInput.value);
  });

  it('should create a category with the reserve name', async () => {
    const { uow, useCase } = makeUseCase();

    await useCase.execute(validInput);

    expect(uow.categoryRepository.items).toHaveLength(1);
    expect(uow.categoryRepository.items[0].name).toBe(validInput.name);
    expect(uow.categoryRepository.items[0].accountId).toBe(validInput.accountId);
  });

  it('should link the reserve to its category', async () => {
    const { uow, useCase } = makeUseCase();

    await useCase.execute(validInput);

    const reserve = uow.reserveRepository.items[0];
    const category = uow.categoryRepository.items[0];
    expect(reserve.categoryId).toBe(category.id);
  });

  it('should generate a unique id on each execution', async () => {
    const { useCase } = makeUseCase();

    const first = await useCase.execute(validInput);
    const second = await useCase.execute(validInput);

    expect(first.reserveId).not.toBe(second.reserveId);
  });
});
