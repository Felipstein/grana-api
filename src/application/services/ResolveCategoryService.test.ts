import { describe, expect, it } from 'vitest';

import { InMemoryCategoryRepository } from '@application/_test/inMemory';
import { Category } from '@application/entities/Category';
import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { IDService } from '@application/services/IDService';

import { ResolveCategoryService } from './ResolveCategoryService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validAccountId = IDService.generate();

const makeService = () => {
  const categoryRepository = new InMemoryCategoryRepository();
  const service = new ResolveCategoryService(categoryRepository);
  return { categoryRepository, service };
};

const baseParams = { accountId: validAccountId };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ResolveCategoryService', () => {
  describe('when categoryIdOrName is a valid existing ID', () => {
    it('should return the existing category', async () => {
      const { categoryRepository, service } = makeService();
      const category = Category.create({ accountId: validAccountId, name: 'Alimentação' });
      await categoryRepository.create(category);

      const result = await service.resolve({ ...baseParams, categoryIdOrName: category.id });

      expect(result.id).toBe(category.id);
      expect(result.name).toBe('Alimentação');
    });

    it('should not create a new category when resolving by existing ID', async () => {
      const { categoryRepository, service } = makeService();
      const category = Category.create({ accountId: validAccountId, name: 'Alimentação' });
      await categoryRepository.create(category);

      await service.resolve({ ...baseParams, categoryIdOrName: category.id });

      expect(categoryRepository.items).toHaveLength(1);
    });
  });

  describe('when categoryIdOrName is a valid KSUID but does not exist', () => {
    it('should throw ResourceNotFoundError', async () => {
      const { service } = makeService();

      await expect(
        service.resolve({ ...baseParams, categoryIdOrName: IDService.generate() }),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('should not create any category', async () => {
      const { categoryRepository, service } = makeService();

      await expect(
        service.resolve({ ...baseParams, categoryIdOrName: IDService.generate() }),
      ).rejects.toThrow();

      expect(categoryRepository.items).toHaveLength(0);
    });
  });

  describe('when categoryIdOrName is a name (not a KSUID)', () => {
    it('should create and return a new category with the given name', async () => {
      const { categoryRepository, service } = makeService();

      const result = await service.resolve({ ...baseParams, categoryIdOrName: 'Lazer' });

      expect(result.name).toBe('Lazer');
      expect(categoryRepository.items).toHaveLength(1);
      expect(categoryRepository.items[0].id).toBe(result.id);
    });

    it('should create the category with the correct accountId', async () => {
      const { categoryRepository, service } = makeService();

      await service.resolve({ ...baseParams, categoryIdOrName: 'Transporte' });

      expect(categoryRepository.items[0].accountId).toBe(validAccountId);
    });

    it('should reuse existing category when same name is resolved twice', async () => {
      const { categoryRepository, service } = makeService();

      const first = await service.resolve({ ...baseParams, categoryIdOrName: 'Saúde' });
      const second = await service.resolve({ ...baseParams, categoryIdOrName: 'Saúde' });

      expect(categoryRepository.items).toHaveLength(1);
      expect(second.id).toBe(first.id);
    });

    it('should reuse existing category when name normalizes to the same slug', async () => {
      const { categoryRepository, service } = makeService();

      const first = await service.resolve({ ...baseParams, categoryIdOrName: 'Saúde' });
      const second = await service.resolve({ ...baseParams, categoryIdOrName: 'saude' });

      expect(categoryRepository.items).toHaveLength(1);
      expect(second.id).toBe(first.id);
    });
  });
});
