import { describe, expect, it, vi } from 'vitest';

import { InMemoryAuthGateway } from '@application/_test/inMemory';

import { ChangePasswordUseCase } from './ChangePasswordUseCase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeUseCase = () => {
  const authGateway = new InMemoryAuthGateway();
  const useCase = new ChangePasswordUseCase(authGateway);
  return { authGateway, useCase };
};

const validInput = {
  accessToken: 'access-token',
  oldPassword: 'OldPass123!',
  newPassword: 'NewPass456!',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ChangePasswordUseCase', () => {
  it('should delegate to authGateway.changePassword with all params', async () => {
    const { authGateway, useCase } = makeUseCase();
    const spy = vi.spyOn(authGateway, 'changePassword');

    await useCase.execute(validInput);

    expect(spy).toHaveBeenCalledWith(validInput);
  });

  it('should propagate errors from authGateway', async () => {
    const { authGateway, useCase } = makeUseCase();
    vi.spyOn(authGateway, 'changePassword').mockRejectedValueOnce(new Error('Wrong password'));

    await expect(useCase.execute(validInput)).rejects.toThrow('Wrong password');
  });
});
