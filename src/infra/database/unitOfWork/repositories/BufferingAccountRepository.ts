import { MethodNotAllowedError } from '../errors/MethodNotAllowedError';

import type { TransactItem } from '../TransactItem';
import type { Account } from '@application/entities/Account';
import type { IAccountRepository } from '@application/interfaces/repositories/AccountRepository';

export class BufferingAccountRepository implements IAccountRepository {
  constructor(private readonly buffer: TransactItem[]) {}

  async findByEmail(_email: string): Promise<Account | null> {
    throw new MethodNotAllowedError('findByEmail');
  }
}
