import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { Injectable } from '@kernel/decorators/Injectable';

import type { Transaction } from '@application/entities/Transaction';
import type { IUnitOfWork } from '@application/interfaces/IUnitOfWork';
import type { ResolveCategoryService } from '@application/services/ResolveCategoryService';

type Input = {
  transactionId: string;
  accountId: string;
  data: {
    type?: Transaction.Type;
    value?: number;
    description?: string;
    date?: Date;
    category?: string;
    observations?: string | null;
    updateAllRecurrences?: boolean;
  };
};

type Output = void;

@Injectable()
export class UpdateTransactionUseCase {
  constructor(
    private readonly uow: IUnitOfWork,
    private readonly resolveCategoryService: ResolveCategoryService,
  ) {}

  async execute(input: Input): Promise<Output> {
    return this.uow.run(async ({ transactionRepository }) => {
      const transaction = await transactionRepository.findById(input.transactionId);

      if (!transaction || transaction.accountId !== input.accountId) {
        throw new ResourceNotFoundError('Transaction not found.');
      }

      let categoryId: string | undefined;

      if (input.data.category) {
        const category = await this.resolveCategoryService.resolve({
          accountId: input.accountId,
          categoryIdOrName: input.data.category,
        });

        categoryId = category.id;
      }

      const applyUpdates = (t: Transaction) => {
        if (input.data.type !== undefined) t.type = input.data.type;
        if (input.data.value !== undefined) t.value = input.data.value;
        if (input.data.description !== undefined) t.description = input.data.description;
        if (input.data.date !== undefined) t.date = input.data.date;
        if (categoryId !== undefined) t.categoryId = categoryId;
        if (input.data.observations !== undefined) t.observations = input.data.observations;
      };

      applyUpdates(transaction);

      const transactionsToSave = [transaction];

      if (input.data.updateAllRecurrences) {
        const transactions = await transactionRepository.listByParentId(input.transactionId);
        transactions.forEach(applyUpdates);
        transactionsToSave.push(...transactions);
      }

      await Promise.all(
        transactionsToSave.map((transaction) => transactionRepository.save(transaction)),
      );
    });
  }
}
