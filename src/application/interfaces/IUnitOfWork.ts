import type { IAccountRepository } from './repositories/AccountRepository';
import type { ICategoryRepository } from './repositories/CategoryRepository';
import type { IReserveRepository } from './repositories/ReserveRepository';
import type { ITransactionRepository } from './repositories/TransactionRepository';

export interface IUnitOfWorkContext {
  accountRepository: IAccountRepository;
  transactionRepository: ITransactionRepository;
  reserveRepository: IReserveRepository;
  categoryRepository: ICategoryRepository;
}

export interface IUnitOfWork {
  run<T>(work: (ctx: IUnitOfWorkContext) => Promise<T>): Promise<T>;
}
