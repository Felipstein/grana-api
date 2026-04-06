import type { Category } from '@application/entities/Category';

export interface ICategoryRepository {
  findById(id: string): Promise<Category | null>;

  create(category: Category): Promise<void>;
}
