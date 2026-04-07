import { Transaction } from '@application/entities/Transaction';
import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { IUnitOfWork } from '@application/interfaces/UnitOfWork';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = {
  reserveId: string;
  accountId: string;
  value: number;
  date: Date;
  observations: string | null;
};

type Output = {
  transactionIdCreated: string;
};

@Injectable()
export class WithdrawFromReserveUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: Input): Promise<Output> {
    return this.uow.run(async ({ reserveRepository, transactionRepository }) => {
      const reserve = await reserveRepository.findById(input.accountId, input.reserveId);

      if (!reserve) {
        throw new ResourceNotFoundError('Reserve not found.');
      }

      reserve.withdraw(input.value);

      await reserveRepository.save(reserve);

      const transaction = Transaction.create({
        accountId: input.accountId,
        type: Transaction.Type.INCOME,
        value: input.value,
        description: `Saque de "${reserve.name}"`,
        date: input.date,
        categoryId: reserve.categoryId,
        observations: input.observations,
        reserveId: reserve.id,
        recurrence: null,
      });

      await transactionRepository.create(transaction);

      return {
        transactionIdCreated: transaction.id,
      };
    });
  }
}
