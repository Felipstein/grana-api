import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

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
  ) { super(); }

  async findById(accountId: string, categoryId: string): Promise<Category | null> {
    const command = new GetCommand({
      TableName: this.config.database.mainTable,
      Key: {
        PK: CategoryItem.getPK(accountId),
        SK: CategoryItem.getSK(categoryId),
      },
    });

    const { Item } = await this.client.send(command);

    if (!Item) return null;

    return CategoryItem.toEntity(Item as CategoryItem.Type);
  }

  async create(category: Category): Promise<void> {
    const command = new PutCommand({
      TableName: this.config.database.mainTable,
      Item: CategoryItem.fromEntity(category).toItem(),
    });

    await this.client.send(command);
  }
}
