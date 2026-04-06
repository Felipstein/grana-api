import type { Transaction } from '@application/entities/Transaction';

export interface ITransactionRepository {
  findById(id: string): Promise<Transaction | null>;

  listByParentId(parentId: string): Promise<Transaction[]>;

  create(transaction: Transaction): Promise<void>;

  save(transaction: Transaction): Promise<void>;
}
