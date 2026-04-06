import { describe, expect, it } from 'vitest';

import { Category } from '@application/entities/Category';
import { IDService } from '@application/services/IDService';

import { CategoryItem } from './CategoryItem';

const makeCategory = (overrides?: Partial<Parameters<typeof Category.create>[0]>) =>
  Category.create({
    accountId: IDService.generate(),
    name: 'Alimentação',
    color: '#FF5733',
    bgColor: '#1A1A2E',
    ...overrides,
  });

// ─── getPK ───────────────────────────────────────────────────────────────────

describe('CategoryItem.getPK', () => {
  it('should return ACCOUNT#<accountId>', () => {
    const id = IDService.generate();
    expect(CategoryItem.getPK(id)).toBe(`ACCOUNT#${id}`);
  });
});

// ─── getSK ───────────────────────────────────────────────────────────────────

describe('CategoryItem.getSK', () => {
  it('should return CATEGORY#<categoryId>', () => {
    const id = IDService.generate();
    expect(CategoryItem.getSK(id)).toBe(`CATEGORY#${id}`);
  });
});

// ─── fromEntity ──────────────────────────────────────────────────────────────

describe('CategoryItem.fromEntity', () => {
  it('should map all fields from the entity', () => {
    const category = makeCategory();
    const item = CategoryItem.fromEntity(category).toItem();

    expect(item.id).toBe(category.id);
    expect(item.accountId).toBe(category.accountId);
    expect(item.name).toBe('Alimentação');
    expect(item.color).toBe('#FF5733');
    expect(item.bgColor).toBe('#1A1A2E');
    expect(item.entityType).toBe(CategoryItem.type);
  });

  it('should set PK as ACCOUNT#<accountId>', () => {
    const category = makeCategory();
    const item = CategoryItem.fromEntity(category).toItem();
    expect(item.PK).toBe(`ACCOUNT#${category.accountId}`);
  });

  it('should set SK as CATEGORY#<id>', () => {
    const category = makeCategory();
    const item = CategoryItem.fromEntity(category).toItem();
    expect(item.SK).toBe(`CATEGORY#${category.id}`);
  });
});
