import { ReserveItem } from '@infra/database/items/ReserveItem';
import { DynamoReserveRepository } from '@infra/database/repositories/DynamoReserveRepository';
import { mountUpdateCommandInput } from '@infra/database/utils/mountUpdateCommandInput';

import type { TransactItem } from '../TransactItem';
import type { Reserve } from '@application/entities/Reserve';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { AppConfig } from '@config/AppConfig';

export class BufferingReserveRepository extends DynamoReserveRepository {
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

  override async save(reserve: Reserve): Promise<void> {
    this.buffer.push({
      Update: mountUpdateCommandInput({
        tableName: this.config.database.mainTable,
        item: ReserveItem.fromEntity(reserve).toItem(),
        fields: ['name', 'platform'],
      }),
    });
  }
}
