import type { Account } from '@application/entities/Account';

export interface IAccountRepository {
  findById(id: string): Promise<Account | null>;

  findByEmail(email: string): Promise<Account | null>;

  create(account: Account): Promise<void>;

  save(account: Account): Promise<void>;
}
