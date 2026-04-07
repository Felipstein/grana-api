import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { IAccountRepository } from '@application/interfaces/repositories/AccountRepository';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = {
  accountId: string;
  data: {
    name?: string;
  };
};

type Output = void;

@Injectable()
export class UpdateAccountUseCase {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(input: Input): Promise<Output> {
    const account = await this.accountRepository.findById(input.accountId);

    if (!account) {
      throw new ResourceNotFoundError('Account not found.');
    }

    if (input.data.name !== undefined) account.name = input.data.name;

    await this.accountRepository.save(account);
  }
}
