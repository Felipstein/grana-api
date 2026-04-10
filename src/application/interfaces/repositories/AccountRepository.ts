import type { Account } from '@application/entities/Account';

export abstract class IAccountRepository {
  abstract findById(id: string): Promise<Account | null>;
  abstract findByEmail(email: string): Promise<Account | null>;
  abstract create(account: Account): Promise<void>;
  abstract save(account: Account): Promise<void>;
}
