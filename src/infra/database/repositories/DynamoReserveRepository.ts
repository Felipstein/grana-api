import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { Reserve } from '@application/entities/Reserve';
import { IReserveRepository } from '@application/interfaces/repositories/ReserveRepository';
import { AppConfig } from '@config/AppConfig';
import { Injectable } from '@kernel/decorators/Injectable';

import { ReserveItem } from '../items/ReserveItem';
import { mountUpdateCommandInput } from '../utils/mountUpdateCommandInput';

@Injectable()
export class DynamoReserveRepository implements IReserveRepository {
  constructor(
    private readonly client: DynamoDBClient,
    protected readonly config: AppConfig,
  ) {}

  async findById(accountId: string, reserveId: string): Promise<Reserve | null> {
    const command = new GetCommand({
      TableName: this.config.database.mainTable,
      Key: {
        PK: ReserveItem.getPK(accountId),
        SK: ReserveItem.getSK(reserveId),
      },
    });

    const { Item } = await this.client.send(command);
    const reserveItem = Item as ReserveItem.Type;

    if (!reserveItem) {
      return null;
    }

    return ReserveItem.toEntity(reserveItem);
  }

  async create(reserve: Reserve): Promise<void> {
    const reserveItem = ReserveItem.fromEntity(reserve).toItem();

    const command = new PutCommand({
      TableName: this.config.database.mainTable,
      Item: reserveItem,
    });

    await this.client.send(command);
  }

  async save(reserve: Reserve): Promise<void> {
    const item = ReserveItem.fromEntity(reserve).toItem();

    const command = new UpdateCommand(
      mountUpdateCommandInput({
        tableName: this.config.database.mainTable,
        item,
        fields: ['name', 'platform'],
      }),
    );

    await this.client.send(command);
  }
}
