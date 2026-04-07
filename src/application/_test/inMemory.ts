import { Account } from '@application/entities/Account';
import { Category } from '@application/entities/Category';
import { Reserve } from '@application/entities/Reserve';
import { Transaction } from '@application/entities/Transaction';

import type { IAuthGateway } from '@application/interfaces/AuthGateway';
import type { IUnitOfWork, IUnitOfWorkContext } from '@application/interfaces/UnitOfWork';
import type { IAccountRepository } from '@application/interfaces/repositories/AccountRepository';
import type { ICategoryRepository } from '@application/interfaces/repositories/CategoryRepository';
import type { IReserveRepository } from '@application/interfaces/repositories/ReserveRepository';
import type { ITransactionRepository } from '@application/interfaces/repositories/TransactionRepository';

export class InMemoryAccountRepository implements IAccountRepository {
  readonly items: Account[] = [];

  async findById(id: string) {
    return this.items.find((a) => a.id === id) ?? null;
  }

  async findByEmail(email: string) {
    return this.items.find((a) => a.email === email) ?? null;
  }

  async create(account: Account) {
    this.items.push(account);
  }

  async save(account: Account) {
    const idx = this.items.findIndex((a) => a.id === account.id);
    if (idx >= 0) this.items[idx] = account;
    else this.items.push(account);
  }
}

export class InMemoryCategoryRepository implements ICategoryRepository {
  readonly items: Category[] = [];

  async findById(id: string) {
    return this.items.find((c) => c.id === id) ?? null;
  }

  async create(category: Category) {
    this.items.push(category);
  }
}

export class InMemoryReserveRepository implements IReserveRepository {
  readonly items: Reserve[] = [];

  async findById(accountId: string, reserveId: string) {
    return this.items.find((r) => r.id === reserveId && r.accountId === accountId) ?? null;
  }

  async create(reserve: Reserve) {
    this.items.push(reserve);
  }

  async save(reserve: Reserve) {
    const idx = this.items.findIndex((r) => r.id === reserve.id);
    if (idx >= 0) this.items[idx] = reserve;
  }

  async delete(accountId: string, reserveId: string) {
    const idx = this.items.findIndex((r) => r.id === reserveId && r.accountId === accountId);
    if (idx >= 0) this.items.splice(idx, 1);
  }
}

export class InMemoryTransactionRepository implements ITransactionRepository {
  readonly items: Transaction[] = [];

  async findById(id: string) {
    return this.items.find((t) => t.id === id) ?? null;
  }

  async listByParentId(parentId: string) {
    return this.items.filter((t) => t.parentId === parentId);
  }

  async create(transaction: Transaction) {
    this.items.push(transaction);
  }

  async save(transaction: Transaction) {
    const idx = this.items.findIndex((t) => t.id === transaction.id);
    if (idx >= 0) this.items[idx] = transaction;
  }

  async delete(transaction: Transaction) {
    const idx = this.items.findIndex((t) => t.id === transaction.id);
    if (idx >= 0) this.items.splice(idx, 1);
  }
}

export class InMemoryAuthGateway implements IAuthGateway {
  readonly signedUpUsers: Array<{ accountId: string; email: string; externalId: string }> = [];

  async signUp(accountId: string, email: string, _password: string): Promise<IAuthGateway.SignUpResult> {
    const externalId = `ext-${accountId}`;
    this.signedUpUsers.push({ accountId, email, externalId });
    return { externalId };
  }

  async signIn(_email: string, _password: string): Promise<IAuthGateway.AuthResult> {
    return { accessToken: 'access-token', refreshToken: 'refresh-token' };
  }

  async refreshToken(_refreshToken: string): Promise<IAuthGateway.AuthResult> {
    return { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' };
  }

  async changePassword(_params: IAuthGateway.ChangePasswordParams): Promise<void> {}

  async deleteUser(_externalId: string): Promise<void> {
    const idx = this.signedUpUsers.findIndex((u) => u.externalId === _externalId);
    if (idx >= 0) this.signedUpUsers.splice(idx, 1);
  }
}

export class InMemoryUnitOfWork implements IUnitOfWork {
  readonly accountRepository = new InMemoryAccountRepository();
  readonly categoryRepository = new InMemoryCategoryRepository();
  readonly reserveRepository = new InMemoryReserveRepository();
  readonly transactionRepository = new InMemoryTransactionRepository();

  async run<T>(work: (ctx: IUnitOfWorkContext) => Promise<T>): Promise<T> {
    return work({
      accountRepository: this.accountRepository,
      categoryRepository: this.categoryRepository,
      reserveRepository: this.reserveRepository,
      transactionRepository: this.transactionRepository,
    });
  }
}
