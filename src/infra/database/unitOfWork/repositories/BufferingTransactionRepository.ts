import { TransactionItem } from '@infra/database/items/TransactionItem';
import { DynamoDBTransactionRepository } from '@infra/database/repositories/DynamoDBTransactionRepository';

import type { TransactItem } from '../TransactItem';
import type { Transaction } from '@application/entities/Transaction';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { AppConfig } from '@config/AppConfig';

export class BufferingTransactionRepository extends DynamoDBTransactionRepository {
  constructor(
    private readonly buffer: TransactItem[],
    client: DynamoDBClient,
    config: AppConfig,
  ) {
    super(client, config);
  }

  override async create(transaction: Transaction): Promise<void> {
    this.buffer.push({
      Put: {
        TableName: this.config.database.mainTable,
        Item: TransactionItem.fromEntity(transaction).toItem(),
      },
    });
  }
}
