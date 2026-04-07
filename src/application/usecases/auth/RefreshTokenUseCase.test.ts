import { describe, expect, it, vi } from 'vitest';

import { InMemoryAuthGateway } from '@application/_test/inMemory';

import { RefreshTokenUseCase } from './RefreshTokenUseCase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeUseCase = () => {
  const authGateway = new InMemoryAuthGateway();
  const useCase = new RefreshTokenUseCase(authGateway);
  return { authGateway, useCase };
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RefreshTokenUseCase', () => {
  it('should return new accessToken and refreshToken', async () => {
    const { useCase } = makeUseCase();

    const result = await useCase.execute({ refreshToken: 'old-refresh-token' });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it('should delegate to authGateway.refreshToken with the provided token', async () => {
    const { authGateway, useCase } = makeUseCase();
    const spy = vi.spyOn(authGateway, 'refreshToken');

    await useCase.execute({ refreshToken: 'old-refresh-token' });

    expect(spy).toHaveBeenCalledWith('old-refresh-token');
  });

  it('should propagate errors from authGateway', async () => {
    const { authGateway, useCase } = makeUseCase();
    vi.spyOn(authGateway, 'refreshToken').mockRejectedValueOnce(new Error('Token expired'));

    await expect(useCase.execute({ refreshToken: 'expired' })).rejects.toThrow('Token expired');
  });
});
