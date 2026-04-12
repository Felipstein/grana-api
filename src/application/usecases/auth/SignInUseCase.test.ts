import { describe, expect, it, vi } from 'vitest';

import { InMemoryAuthGateway } from '@application/_test/inMemory';

import { SignInUseCase } from './SignInUseCase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeUseCase = () => {
  const authGateway = new InMemoryAuthGateway();
  const useCase = new SignInUseCase(authGateway);
  return { authGateway, useCase };
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SignInUseCase', () => {
  it('should return accessToken and refreshToken', async () => {
    const { useCase } = makeUseCase();

    const result = await useCase.execute({ email: 'felipe@email.com', password: 'Senha123!' });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it('should delegate to authGateway.signIn with email and password', async () => {
    const { authGateway, useCase } = makeUseCase();
    const signInSpy = vi.spyOn(authGateway, 'signIn');

    await useCase.execute({ email: 'felipe@email.com', password: 'Senha123!' });

    expect(signInSpy).toHaveBeenCalledWith('felipe@email.com', 'Senha123!');
  });

  it('should propagate errors from authGateway', async () => {
    const { authGateway, useCase } = makeUseCase();
    vi.spyOn(authGateway, 'signIn').mockRejectedValueOnce(new Error('Invalid credentials'));

    await expect(useCase.execute({ email: 'felipe@email.com', password: 'wrong' })).rejects.toThrow(
      'Invalid credentials',
    );
  });
});
