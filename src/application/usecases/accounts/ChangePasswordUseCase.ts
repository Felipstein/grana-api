import { IAuthGateway } from '@application/interfaces/AuthGateway';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = {
  accessToken: string;
  oldPassword: string;
  newPassword: string;
};

type Output = void;

@Injectable()
export class ChangePasswordUseCase {
  constructor(private readonly authGateway: IAuthGateway) {}

  async execute(input: Input): Promise<Output> {
    await this.authGateway.changePassword(input);
  }
}
