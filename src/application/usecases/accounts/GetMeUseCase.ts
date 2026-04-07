import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { IAccountRepository } from '@application/interfaces/repositories/AccountRepository';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = {
  accountId: string;
};

type Output = {
  name: string;
  email: string;
};

@Injectable()
export class GetMeUsecase {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(input: Input): Promise<Output> {
    const account = await this.accountRepository.findById(input.accountId);

    if (!account) {
      throw new ResourceNotFoundError('Account not found.');
    }

    return {
      name: account.name,
      email: account.email,
    };
  }
}
