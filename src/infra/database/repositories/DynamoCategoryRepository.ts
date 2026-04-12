import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

import { Category } from '@application/entities/Category';
import { ICategoryRepository } from '@application/interfaces/repositories/CategoryRepository';
import { AppConfig } from '@config/AppConfig';
import { Injectable } from '@kernel/decorators/Injectable';

import { CategoryItem } from '../items/CategoryItem';

@Injectable()
export class DynamoCategoryRepository extends ICategoryRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly config: AppConfig,
  ) {
    super();
  }

  async findById(accountId: string, categoryId: string): Promise<Category | null> {
    const { Item } = await this.client.send(
      new GetCommand({
        TableName: this.config.database.mainTable,
        Key: {
          PK: CategoryItem.getPK(accountId),
          SK: CategoryItem.getSK(categoryId),
        },
      }),
    );

    if (!Item) return null;

    return CategoryItem.toEntity(Item as CategoryItem.Type);
  }

  async findBySlug(accountId: string, slug: string): Promise<Category | null> {
    const { Items = [] } = await this.client.send(
      new QueryCommand({
        TableName: this.config.database.mainTable,
        IndexName: 'GSI1',
        Limit: 1,
        KeyConditionExpression: '#GSI1PK = :GSI1PK AND #GSI1SK = :GSI1SK',
        ExpressionAttributeNames: { '#GSI1PK': 'GSI1PK', '#GSI1SK': 'GSI1SK' },
        ExpressionAttributeValues: {
          ':GSI1PK': CategoryItem.getGSI1PK(accountId),
          ':GSI1SK': CategoryItem.getGSI1SK(slug),
        },
      }),
    );

    if (Items.length === 0) return null;

    return CategoryItem.toEntity(Items[0] as CategoryItem.Type);
  }

  async create(category: Category): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.config.database.mainTable,
        Item: CategoryItem.fromEntity(category).toItem(),
      }),
    );
  }
}
