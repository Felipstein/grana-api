import { ReserveItem } from '@infra/database/items/ReserveItem';
import { DynamoDBReserveRepository } from '@infra/database/repositories/DynamoDBReserveRepository';

import type { TransactItem } from '../TransactItem';
import type { Reserve } from '@application/entities/Reserve';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { AppConfig } from '@config/AppConfig';

export class BufferingReserveRepository extends DynamoDBReserveRepository {
  constructor(
    private readonly buffer: TransactItem[],
    client: DynamoDBClient,
    config: AppConfig,
  ) {
    super(client, config);
  }

  override async create(reserve: Reserve): Promise<void> {
    this.buffer.push({
      Put: {
        TableName: this.config.database.mainTable,
        Item: ReserveItem.fromEntity(reserve).toItem(),
      },
    });
  }
}
