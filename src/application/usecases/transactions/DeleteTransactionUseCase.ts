import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { IUnitOfWork } from '@application/interfaces/UnitOfWork';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = {
  transactionId: string;
  accountId: string;
  deleteAllRecurrences: boolean;
};

type Output = void;

@Injectable()
export class DeleteTransactionUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: Input): Promise<Output> {
    return this.uow.run(async ({ transactionRepository }) => {
      const transaction = await transactionRepository.findById(input.transactionId);

      if (!transaction || transaction.accountId !== input.accountId) {
        throw new ResourceNotFoundError('Transaction not found.');
      }

      const promises = [transactionRepository.delete(transaction)];

      if (input.deleteAllRecurrences) {
        const children = await transactionRepository.listByParentId(input.transactionId);

        promises.push(...children.map((child) => transactionRepository.delete(child)));
      }

      await Promise.all(promises);
    });
  }
}
