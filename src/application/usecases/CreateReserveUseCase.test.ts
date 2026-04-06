import { describe, expect, it } from 'vitest';

import { IDService } from '@application/services/IDService';

import { CreateReserveUseCase } from './CreateReserveUseCase';

import type { Reserve } from '@application/entities/Reserve';
import type { IUnitOfWork, IUnitOfWorkContext } from '@application/interfaces/IUnitOfWork';
import type { IAccountRepository } from '@application/interfaces/repositories/AccountRepository';
import type { ICategoryRepository } from '@application/interfaces/repositories/CategoryRepository';
import type { IReserveRepository } from '@application/interfaces/repositories/ReserveRepository';
import type { ITransactionRepository } from '@application/interfaces/repositories/TransactionRepository';

// ─── In-memory implementations ───────────────────────────────────────────────

class InMemoryReserveRepository implements IReserveRepository {
  readonly items: Reserve[] = [];

  async findById(_accountId: string, reserveId: string) {
    return this.items.find((r) => r.id === reserveId) ?? null;
  }

  async create(reserve: Reserve) {
    this.items.push(reserve);
  }
}

class InMemoryUnitOfWork implements IUnitOfWork {
  readonly reserveRepository = new InMemoryReserveRepository();

  private readonly accountRepository = {} as IAccountRepository;
  private readonly transactionRepository = {} as ITransactionRepository;
  private readonly categoryRepository = {} as ICategoryRepository;

  async run<T>(work: (ctx: IUnitOfWorkContext) => Promise<T>): Promise<T> {
    return work({
      reserveRepository: this.reserveRepository,
      accountRepository: this.accountRepository,
      transactionRepository: this.transactionRepository,
      categoryRepository: this.categoryRepository,
    });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validInput: Reserve.CreateParams = {
  accountId: IDService.generate(),
  name: 'Nubank',
  platform: 'Banco Digital',
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

  it('should generate a unique id on each execution', async () => {
    const { useCase } = makeUseCase();

    const first = await useCase.execute(validInput);
    const second = await useCase.execute(validInput);

    expect(first.reserveId).not.toBe(second.reserveId);
  });
});
