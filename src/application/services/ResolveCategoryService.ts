import { Category } from '@application/entities/Category';
import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { ICategoryRepository } from '@application/interfaces/repositories/CategoryRepository';
import { Injectable } from '@kernel/decorators/Injectable';

import { IDService } from './IDService';

type ResolveParams = Omit<Category.CreateParams, 'name'> & {
  categoryIdOrName: string;
};

@Injectable()
export class ResolveCategoryService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async resolve(params: ResolveParams): Promise<Category> {
    if (IDService.isValid(params.categoryIdOrName)) {
      const existing = await this.categoryRepository.findById(params.categoryIdOrName);

      if (existing) {
        return existing;
      }

      throw new ResourceNotFoundError('Category not found.');
    }

    const category = Category.create({
      accountId: params.accountId,
      name: params.categoryIdOrName,
      color: params.color,
      bgColor: params.bgColor,
    });

    await this.categoryRepository.create(category);

    return category;
  }
}
