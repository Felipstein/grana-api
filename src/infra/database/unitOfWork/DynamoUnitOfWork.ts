import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

import { AppConfig } from '@config/AppConfig';
import { Injectable } from '@kernel/decorators/Injectable';

import { BufferingAccountRepository } from './repositories/BufferingAccountRepository';
import { BufferingCategoryRepository } from './repositories/BufferingCategoryRepository';
import { BufferingReserveRepository } from './repositories/BufferingReserveRepository';
import { BufferingTransactionRepository } from './repositories/BufferingTransactionRepository';
import { TransactItem } from './TransactItem';

import type { IUnitOfWork, IUnitOfWorkContext } from '@application/interfaces/UnitOfWork';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoUnitOfWork implements IUnitOfWork {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly config: AppConfig,
  ) {}

  async run<T>(work: (ctx: IUnitOfWorkContext) => Promise<T>): Promise<T> {
    const buffer: TransactItem[] = [];

    const ctx: IUnitOfWorkContext = {
      accountRepository: new BufferingAccountRepository(buffer),
      transactionRepository: new BufferingTransactionRepository(buffer, this.client, this.config),
      reserveRepository: new BufferingReserveRepository(buffer, this.client, this.config),
      categoryRepository: new BufferingCategoryRepository(buffer, this.config),
    };

    const result = await work(ctx);

    if (buffer.length > 0) {
      await this.client.send(new TransactWriteCommand({ TransactItems: buffer }));
    }

    return result;
  }
}
