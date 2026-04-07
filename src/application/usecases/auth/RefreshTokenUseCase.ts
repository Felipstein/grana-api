import { IAuthGateway } from '@application/interfaces/AuthGateway';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = {
  refreshToken: string;
};

type Output = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class RefreshTokenUseCase {
  constructor(private readonly authGateway: IAuthGateway) {}

  async execute(input: Input): Promise<Output> {
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await this.authGateway.refreshToken(input.refreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}
