import { describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '@application/errors/ApplicationError';
import { Saga } from '@application/utils/Saga';

import { InMemoryAuthGateway, InMemoryUnitOfWork } from '@application/_test/inMemory';

import { SignUpUseCase } from './SignUpUseCase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeUseCase = () => {
  const uow = new InMemoryUnitOfWork();
  const authGateway = new InMemoryAuthGateway();
  const saga = new Saga();
  const useCase = new SignUpUseCase(saga, uow, authGateway);
  return { uow, authGateway, saga, useCase };
};

const validInput = {
  name: 'Felipe',
  email: 'felipe@email.com',
  password: 'Senha123!',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SignUpUseCase', () => {
  describe('email validation', () => {
    it('should throw ApplicationError with EMAIL_ALREADY_TAKEN when email is in use', async () => {
      const { uow, authGateway } = makeUseCase();

      await new SignUpUseCase(new Saga(), uow, authGateway).execute(validInput);

      await expect(
        new SignUpUseCase(new Saga(), uow, authGateway).execute(validInput),
      ).rejects.toMatchObject({ code: ApplicationError.Code.EMAIL_ALREADY_TAKEN });
    });
  });

  describe('happy path', () => {
    it('should return accessToken and refreshToken', async () => {
      const { useCase } = makeUseCase();

      const result = await useCase.execute(validInput);

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should persist the account with correct name and email', async () => {
      const { uow, useCase } = makeUseCase();

      await useCase.execute(validInput);

      expect(uow.accountRepository.items).toHaveLength(1);
      expect(uow.accountRepository.items[0].name).toBe(validInput.name);
      expect(uow.accountRepository.items[0].email).toBe(validInput.email);
    });

    it('should link the account to the externalId returned by authGateway', async () => {
      const { uow, authGateway, useCase } = makeUseCase();

      await useCase.execute(validInput);

      const account = uow.accountRepository.items[0];
      expect(account.externalId).toBe(authGateway.signedUpUsers[0].externalId);
    });

    it('should call authGateway.signUp with the pre-generated accountId', async () => {
      const { uow, authGateway, useCase } = makeUseCase();

      await useCase.execute(validInput);

      const account = uow.accountRepository.items[0];
      expect(authGateway.signedUpUsers[0].accountId).toBe(account.id);
    });
  });

  describe('saga compensation', () => {
    it('should call authGateway.deleteUser when signIn fails after signUp', async () => {
      const { authGateway, saga } = makeUseCase();
      const uow = new InMemoryUnitOfWork();
      const deleteUserSpy = vi.spyOn(authGateway, 'deleteUser');
      vi.spyOn(authGateway, 'signIn').mockRejectedValueOnce(new Error('signIn failed'));

      await expect(
        new SignUpUseCase(saga, uow, authGateway).execute(validInput),
      ).rejects.toThrow();

      expect(deleteUserSpy).toHaveBeenCalledOnce();
    });

    it('should propagate the error after compensation', async () => {
      const { authGateway, saga } = makeUseCase();
      const uow = new InMemoryUnitOfWork();
      vi.spyOn(authGateway, 'signIn').mockRejectedValueOnce(new Error('signIn failed'));

      await expect(
        new SignUpUseCase(saga, uow, authGateway).execute(validInput),
      ).rejects.toThrow('signIn failed');
    });
  });
});
