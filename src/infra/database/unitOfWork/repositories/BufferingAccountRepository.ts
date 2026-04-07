import { MethodNotAllowedError } from '../errors/MethodNotAllowedError';

import type { TransactItem } from '../TransactItem';
import type { Account } from '@application/entities/Account';
import type { IAccountRepository } from '@application/interfaces/repositories/AccountRepository';

export class BufferingAccountRepository implements IAccountRepository {
  constructor(private readonly buffer: TransactItem[]) {}

  async findById(_id: string): Promise<Account | null> {
    throw new MethodNotAllowedError('findById');
  }

  async findByEmail(_email: string): Promise<Account | null> {
    throw new MethodNotAllowedError('findByEmail');
  }

  async save(_account: Account): Promise<void> {
    throw new MethodNotAllowedError('save');
  }
}
