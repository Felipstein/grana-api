import type { Category } from '@application/entities/Category';

export abstract class ICategoryRepository {
  abstract findById(accountId: string, categoryId: string): Promise<Category | null>;
  abstract create(category: Category): Promise<void>;
}
