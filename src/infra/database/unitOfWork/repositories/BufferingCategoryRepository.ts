import { CategoryItem } from '@infra/database/items/CategoryItem';

import { MethodNotAllowedError } from '../errors/MethodNotAllowedError';

import type { TransactItem } from '../TransactItem';
import type { Category } from '@application/entities/Category';
import type { ICategoryRepository } from '@application/interfaces/repositories/CategoryRepository';
import type { AppConfig } from '@config/AppConfig';

export class BufferingCategoryRepository implements ICategoryRepository {
  constructor(
    private readonly buffer: TransactItem[],
    private readonly config: AppConfig,
  ) {}

  async findById(_id: string): Promise<Category | null> {
    throw new MethodNotAllowedError('findById');
  }

  async create(category: Category): Promise<void> {
    this.buffer.push({
      Put: {
        TableName: this.config.database.mainTable,
        Item: CategoryItem.fromEntity(category).toItem(),
      },
    });
  }
}
