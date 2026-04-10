import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { Account } from '@application/entities/Account';
import { IAccountRepository } from '@application/interfaces/repositories/AccountRepository';
import { AppConfig } from '@config/AppConfig';
import { Injectable } from '@kernel/decorators/Injectable';

import { AccountItem } from '../items/AccountItem';
import { mountUpdateCommandInput } from '../utils/mountUpdateCommandInput';

@Injectable()
export class DynamoAccountRepository extends IAccountRepository {
  constructor(
    protected readonly client: DynamoDBDocumentClient,
    protected readonly config: AppConfig,
  ) { super(); }

  async findById(id: string): Promise<Account | null> {
    const command = new GetCommand({
      TableName: this.config.database.mainTable,
      Key: {
        PK: AccountItem.getPK(id),
        SK: AccountItem.getSK(id),
      },
    });

    const { Item } = await this.client.send(command);

    if (!Item) return null;

    return AccountItem.toEntity(Item as AccountItem.Type);
  }

  async findByEmail(email: string): Promise<Account | null> {
    const command = new QueryCommand({
      TableName: this.config.database.mainTable,
      IndexName: 'GSI1',
      Limit: 1,
      KeyConditionExpression: '#GSI1PK = :GSI1PK AND #GSI1SK = :GSI1SK',
      ExpressionAttributeNames: {
        '#GSI1PK': 'GSI1PK',
        '#GSI1SK': 'GSI1SK',
      },
      ExpressionAttributeValues: {
        ':GSI1PK': AccountItem.getGSI1PK(email),
        ':GSI1SK': AccountItem.getGSI1SK(email),
      },
    });

    const { Items = [] } = await this.client.send(command);

    if (Items.length === 0) return null;

    return AccountItem.toEntity(Items[0] as AccountItem.Type);
  }

  async create(account: Account): Promise<void> {
    const command = new PutCommand({
      TableName: this.config.database.mainTable,
      Item: AccountItem.fromEntity(account).toItem(),
    });

    await this.client.send(command);
  }

  async save(account: Account): Promise<void> {
    const item = AccountItem.fromEntity(account).toItem();

    const command = new UpdateCommand(
      mountUpdateCommandInput({
        tableName: this.config.database.mainTable,
        item,
        fields: ['name'],
      }),
    );

    await this.client.send(command);
  }
}
