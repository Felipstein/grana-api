import { IAuthGateway } from '@application/interfaces/AuthGateway';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = {
  email: string;
  password: string;
};

type Output = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class SignInUseCase {
  constructor(private readonly authGateway: IAuthGateway) {}

  async execute(input: Input): Promise<Output> {
    const { accessToken, refreshToken } = await this.authGateway.signIn(
      input.email,
      input.password,
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}
