import { CategoryItem } from '@infra/database/items/CategoryItem';

import { MethodNotAllowedError } from '../errors/MethodNotAllowedError';

import type { TransactItem } from '../TransactItem';
import type { Category } from '@application/entities/Category';
import { ICategoryRepository } from '@application/interfaces/repositories/CategoryRepository';
import type { AppConfig } from '@config/AppConfig';

export class BufferingCategoryRepository extends ICategoryRepository {
  constructor(
    private readonly buffer: TransactItem[],
    private readonly config: AppConfig,
  ) { super(); }

  async findById(_accountId: string, _categoryId: string): Promise<Category | null> {
    throw new MethodNotAllowedError('findById');
  }

  async findBySlug(_accountId: string, _slug: string): Promise<Category | null> {
    throw new MethodNotAllowedError('findBySlug');
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
