import { Transaction } from '@application/entities/Transaction';
import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { IUnitOfWork } from '@application/interfaces/UnitOfWork';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = {
  reserveId: string;
  accountId: string;
};

type Output = {
  transactionIdCreated: string | null;
};

@Injectable()
export class DeleteReserveUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: Input): Promise<Output> {
    return this.uow.run(async ({ reserveRepository, transactionRepository }) => {
      const reserve = await reserveRepository.findById(input.accountId, input.reserveId);

      if (!reserve) {
        throw new ResourceNotFoundError('Reserve not found.');
      }

      const promises = [reserveRepository.delete(input.accountId, input.reserveId)];

      let transactionIdCreated: string | null = null;

      if (reserve.value > 0) {
        const transaction = Transaction.create({
          accountId: input.accountId,
          type: Transaction.Type.INCOME,
          value: reserve.value,
          description: `Saque de "${reserve.name}" (Reserva deletada)`,
          date: new Date(),
          categoryId: reserve.categoryId,
          observations: null,
          reserveId: reserve.id,
          recurrence: null,
        });

        promises.push(transactionRepository.create(transaction));

        transactionIdCreated = transaction.id;
      }

      await Promise.all(promises);

      return {
        transactionIdCreated: transactionIdCreated,
      };
    });
  }
}
