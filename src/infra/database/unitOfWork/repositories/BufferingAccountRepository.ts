import { AccountItem } from '@infra/database/items/AccountItem';
import { DynamoAccountRepository } from '@infra/database/repositories/DynamoAccountRepository';

import type { TransactItem } from '../TransactItem';
import type { Account } from '@application/entities/Account';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { AppConfig } from '@config/AppConfig';

export class BufferingAccountRepository extends DynamoAccountRepository {
  constructor(
    private readonly buffer: TransactItem[],
    client: DynamoDBClient,
    config: AppConfig,
  ) {
    super(client, config);
  }

  override async create(account: Account): Promise<void> {
    this.buffer.push({
      Put: {
        TableName: this.config.database.mainTable,
        Item: AccountItem.fromEntity(account).toItem(),
      },
    });
  }

  override async save(account: Account): Promise<void> {
    this.buffer.push({
      Put: {
        TableName: this.config.database.mainTable,
        Item: AccountItem.fromEntity(account).toItem(),
        ConditionExpression: 'attribute_exists(PK)',
      },
    });
  }
}
