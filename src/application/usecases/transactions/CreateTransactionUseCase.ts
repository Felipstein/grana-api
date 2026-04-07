import { Transaction } from '@application/entities/Transaction';
import { Injectable } from '@kernel/decorators/Injectable';

import type { IUnitOfWork } from '@application/interfaces/UnitOfWork';
import type { ResolveCategoryService } from '@application/services/ResolveCategoryService';

type Input = Omit<Transaction.CreateParams, 'categoryId'> & {
  category: string;
};

type Output = {
  transactionId: string;
  childIds: string[];
};

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    private readonly uow: IUnitOfWork,
    private readonly resolveCategoryService: ResolveCategoryService,
  ) {}

  async execute(input: Input): Promise<Output> {
    return this.uow.run(async ({ transactionRepository }) => {
      const { id: categoryId } = await this.resolveCategoryService.resolve({
        categoryIdOrName: input.category,
        accountId: input.accountId,
      });

      const transaction = Transaction.create({
        accountId: input.accountId,
        type: input.type,
        value: input.value,
        description: input.description,
        date: input.date,
        categoryId,
        observations: input.observations,
        reserveId: input.reserveId,
        recurrence: input.recurrence,
      });

      const transactions = [transaction];

      if (input.recurrence) {
        const totalInstallments = input.recurrence.totalInstallments ?? 12;

        for (let i = input.recurrence.currentInstallment ?? 1; i <= totalInstallments; i++) {
          let date = typeof input.date === 'string' ? new Date(input.date) : input.date;
          date = new Date(date.getFullYear(), date.getMonth() + i, date.getDate());

          const child = Transaction.create({
            accountId: input.accountId,
            parentId: transaction.id,
            type: input.type,
            value: input.value,
            description: input.description,
            date,
            categoryId,
            observations: input.observations,
            recurrence:
              input.recurrence.type === Transaction.RecurrenceType.RECURRING
                ? { type: input.recurrence.type }
                : { type: input.recurrence.type, totalInstallments, currentInstallment: i },
          });

          transactions.push(child);
        }
      }

      await Promise.all(
        transactions.map((transaction) => transactionRepository.create(transaction)),
      );

      const [, ...children] = transactions;

      return {
        transactionId: transaction.id,
        childIds: children.map((child) => child.id),
      };
    });
  }
}
