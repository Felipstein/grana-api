import { Category } from '@application/entities/Category';

import { DynamoItem } from './core/DynamoItem';

export class CategoryItem extends DynamoItem<
  CategoryItem.Keys,
  CategoryItem.Attributes,
  'Category'
> {
  static readonly type = 'Category';

  constructor(attrs: CategoryItem.Attributes) {
    super(CategoryItem.type, attrs, {
      PK: CategoryItem.getPK(attrs.accountId),
      SK: CategoryItem.getSK(attrs.id),
      GSI1PK: CategoryItem.getGSI1PK(attrs.accountId),
      GSI1SK: CategoryItem.getGSI1SK(attrs.slug),
    });
  }

  static getPK(accountId: string): CategoryItem.Keys['PK'] {
    return `ACCOUNT#${accountId}`;
  }

  static getSK(categoryId: string): CategoryItem.Keys['SK'] {
    return `CATEGORY#${categoryId}`;
  }

  static getGSI1PK(accountId: string): CategoryItem.Keys['GSI1PK'] {
    return `CATEGORY#${accountId}`;
  }

  static getGSI1SK(slug: string): CategoryItem.Keys['GSI1SK'] {
    return `CATEGORY#SLUG#${slug}`;
  }

  static fromEntity(category: Category) {
    return new CategoryItem({
      id: category.id,
      accountId: category.accountId,
      name: category.name,
      slug: category.slug,
      color: category.color,
      bgColor: category.bgColor,
    });
  }

  static toEntity(item: CategoryItem.Type): Category {
    return new Category(item.id, {
      accountId: item.accountId,
      name: item.name,
      slug: item.slug,
      color: item.color,
      bgColor: item.bgColor,
    });
  }
}

export namespace CategoryItem {
  export type Keys = {
    PK: `ACCOUNT#${string}`;
    SK: `CATEGORY#${string}`;
    GSI1PK: `CATEGORY#${string}`;
    GSI1SK: `CATEGORY#SLUG#${string}`;
  };

  export type Attributes = {
    id: string;
    accountId: string;
    name: string;
    slug: string;
    color: string;
    bgColor: string;
  };

  export type Type = DynamoItem.Type<Keys, Attributes, 'Category'>;
}
