import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { Transaction } from '@application/entities/Transaction';
import { AppConfig } from '@config/AppConfig';
import { Injectable } from '@kernel/decorators/Injectable';

import { TransactionItem } from '../items/TransactionItem';

import type { ITransactionRepository } from '@application/interfaces/repositories/TransactionRepository';

@Injectable()
export class DynamoTransactionRepository implements ITransactionRepository {
  constructor(
    protected readonly client: DynamoDBClient,
    protected readonly config: AppConfig,
  ) {}

  async findById(id: string): Promise<Transaction | null> {
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
        ':GSI1PK': TransactionItem.getGSI1PK(id),
        ':GSI1SK': TransactionItem.getGSI1SK(id),
      },
    });

    const { Items = [] } = await this.client.send(command);
    const transaction = Items[0] as TransactionItem.Type;

    if (!transaction) {
      return null;
    }

    return TransactionItem.toEntity(transaction);
  }

  async listByParentId(parentId: string): Promise<Transaction[]> {
    const command = new QueryCommand({
      TableName: this.config.database.mainTable,
      IndexName: 'GSI2',
      KeyConditionExpression: '#GSI2PK = :GSI2PK',
      ExpressionAttributeNames: {
        '#GSI2PK': 'GSI2PK',
      },
      ExpressionAttributeValues: {
        ':GSI2PK': TransactionItem.getGSI2PK(parentId),
      },
    });

    const { Items = [] } = await this.client.send(command);
    const transactions = Items as TransactionItem.Type[];

    return transactions.map(TransactionItem.toEntity);
  }

  async create(transaction: Transaction): Promise<void> {
    const command = new PutCommand({
      TableName: this.config.database.mainTable,
      Item: TransactionItem.fromEntity(transaction).toItem(),
    });

    await this.client.send(command);
  }

  async save(transaction: Transaction): Promise<void> {
    const item = TransactionItem.fromEntity(transaction).toItem();

    const fields = ['type', 'value', 'description', 'date', 'categoryId', 'observations'];

    const command = new UpdateCommand({
      TableName: this.config.database.mainTable,
      Key: {
        PK: item.PK,
        SK: item.SK,
      },
      UpdateExpression: `SET ${fields.map((field) => `#${field} = :${field}`).join(', ')}`,
      ExpressionAttributeNames: fields.reduce(
        (attributeNames, field) => ({ ...attributeNames, [`#${field}`]: field }),
        {},
      ),
      ExpressionAttributeValues: fields.reduce(
        (attributeNames, field) => ({
          ...attributeNames,
          [`:${field}`]: item[field as keyof typeof item],
        }),
        {},
      ),
      ReturnValues: 'NONE',
    });

    await this.client.send(command);
  }
}
