import { TransactionItem } from '@infra/database/items/TransactionItem';
import { DynamoTransactionRepository } from '@infra/database/repositories/DynamoTransactionRepository';
import { mountUpdateCommandInput } from '@infra/database/utils/mountUpdateCommandInput';

import type { TransactItem } from '../TransactItem';
import type { Transaction } from '@application/entities/Transaction';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { AppConfig } from '@config/AppConfig';

export class BufferingTransactionRepository extends DynamoTransactionRepository {
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

  override async save(transaction: Transaction): Promise<void> {
    this.buffer.push({
      Update: mountUpdateCommandInput({
        tableName: this.config.database.mainTable,
        item: TransactionItem.fromEntity(transaction).toItem(),
        fields: ['type', 'value', 'description', 'date', 'categoryId', 'observations'],
      }),
    });
  }
}
