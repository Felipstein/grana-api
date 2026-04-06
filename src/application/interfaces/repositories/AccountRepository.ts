import type { Account } from '@application/entities/Account';

export interface IAccountRepository {
  findByEmail(email: string): Promise<Account | null>;
}
