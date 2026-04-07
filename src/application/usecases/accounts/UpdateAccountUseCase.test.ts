import { describe, expect, it } from 'vitest';

import { InMemoryAccountRepository } from '@application/_test/inMemory';
import { Account } from '@application/entities/Account';
import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { IDService } from '@application/services/IDService';

import { UpdateAccountUseCase } from './UpdateAccountUseCase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeUseCase = () => {
  const accountRepository = new InMemoryAccountRepository();
  const useCase = new UpdateAccountUseCase(accountRepository);
  return { accountRepository, useCase };
};

const seedAccount = async (
  repo: InMemoryAccountRepository,
  overrides?: Partial<Account.CreateParams>,
) => {
  const account = Account.create({
    externalId: 'ext-123',
    name: 'Felipe',
    email: 'felipe@email.com',
    ...overrides,
  });
  repo.items.push(account);
  return account;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UpdateAccountUseCase', () => {
  describe('authorization', () => {
    it('should throw ResourceNotFoundError when account does not exist', async () => {
      const { useCase } = makeUseCase();

      await expect(
        useCase.execute({ accountId: IDService.generate(), data: { name: 'Novo Nome' } }),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('field updates', () => {
    it('should update name when provided', async () => {
      const { accountRepository, useCase } = makeUseCase();
      const account = await seedAccount(accountRepository);

      await useCase.execute({ accountId: account.id, data: { name: 'Carlos' } });

      expect(accountRepository.items[0].name).toBe('Carlos');
    });

    it('should not change name when not provided', async () => {
      const { accountRepository, useCase } = makeUseCase();
      const account = await seedAccount(accountRepository);

      await useCase.execute({ accountId: account.id, data: {} });

      expect(accountRepository.items[0].name).toBe('Felipe');
    });

    it('should save the account after update', async () => {
      const { accountRepository, useCase } = makeUseCase();
      const account = await seedAccount(accountRepository);

      await useCase.execute({ accountId: account.id, data: { name: 'Carlos' } });

      expect(accountRepository.items).toHaveLength(1);
      expect(accountRepository.items[0].name).toBe('Carlos');
    });
  });
});
