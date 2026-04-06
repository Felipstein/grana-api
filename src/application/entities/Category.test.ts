import { describe, expect, it } from 'vitest';

import { ValueObjectError } from '@application/errors/ValueObjectError';
import { IDService } from '@application/services/IDService';

import { Category } from './Category';

const validAccountId = IDService.generate();

const create = (overrides?: Partial<Parameters<typeof Category.create>[0]>) =>
  Category.create({
    accountId: overrides?.accountId ?? validAccountId,
    name: overrides?.name ?? 'Alimentação',
    ...overrides,
  });

describe('Category.create', () => {
  describe('happy path', () => {
    it('should create a category with a generated id', () => {
      const category = create();

      expect(category.id).toBeTruthy();
      expect(category.accountId).toBe(validAccountId);
      expect(category.name).toBe('Alimentação');
    });

    it('should generate a unique id on each call', () => {
      expect(create().id).not.toBe(create().id);
    });

    it('should accept a 2-character name (minimum)', () => {
      expect(() => create({ name: 'Ab' })).not.toThrow();
    });

    it('should accept a 128-character name (maximum)', () => {
      expect(() => create({ name: 'A'.repeat(128) })).not.toThrow();
    });

    it('should accept custom hex colors in #RRGGBB format', () => {
      const category = create({ color: '#FF5733', bgColor: '#FFF7ED' });
      expect(category.color).toBe('#FF5733');
      expect(category.bgColor).toBe('#FFF7ED');
    });

    it('should accept #RGB shorthand format', () => {
      expect(() => create({ color: '#F00', bgColor: '#FFF' })).not.toThrow();
    });

    it('should accept lowercase hex colors', () => {
      expect(() => create({ color: '#ff5733', bgColor: '#fff7ed' })).not.toThrow();
    });
  });

  describe('auto color generation', () => {
    it('should auto-generate color and bgColor when not provided', () => {
      const category = create();
      expect(category.color).toBeTruthy();
      expect(category.bgColor).toBeTruthy();
    });

    it('should auto-generate valid #RRGGBB hex colors', () => {
      const category = create();
      expect(category.color).toMatch(/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/);
      expect(category.bgColor).toMatch(/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/);
    });

    it('should use custom colors when both are provided', () => {
      const category = create({ color: '#FF5733', bgColor: '#FFF7ED' });
      expect(category.color).toBe('#FF5733');
      expect(category.bgColor).toBe('#FFF7ED');
    });

    it('should auto-generate when neither color nor bgColor is provided', () => {
      const category = create({ color: undefined, bgColor: undefined });
      expect(category.color).toMatch(/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/);
      expect(category.bgColor).toMatch(/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/);
    });
  });

  describe('accountId', () => {
    it('should throw for a non-KSUID accountId', () => {
      expect(() => create({ accountId: 'invalid-id' })).toThrow(ValueObjectError);
    });

    it('should throw for an empty accountId', () => {
      expect(() => create({ accountId: '' })).toThrow(ValueObjectError);
    });
  });

  describe('name', () => {
    it('should throw for a 1-character name', () => {
      expect(() => create({ name: 'A' })).toThrow(ValueObjectError);
    });

    it('should throw for an empty name', () => {
      expect(() => create({ name: '' })).toThrow(ValueObjectError);
    });

    it('should throw for more than 128 characters', () => {
      expect(() => create({ name: 'A'.repeat(129) })).toThrow(ValueObjectError);
    });
  });

  describe('color (when provided)', () => {
    it('should throw for a hex string without # prefix', () => {
      expect(() => create({ color: 'FF5733', bgColor: '#FFF7ED' })).toThrow(ValueObjectError);
    });

    it('should throw for an empty string', () => {
      expect(() => create({ color: '', bgColor: '#FFF7ED' })).toThrow(ValueObjectError);
    });

    it('should throw for an invalid format', () => {
      expect(() => create({ color: '#ZZZZZZ', bgColor: '#FFF7ED' })).toThrow(ValueObjectError);
    });
  });

  describe('bgColor (when provided)', () => {
    it('should throw for a hex string without # prefix', () => {
      expect(() => create({ color: '#FF5733', bgColor: 'FFF7ED' })).toThrow(ValueObjectError);
    });

    it('should throw for an empty string', () => {
      expect(() => create({ color: '#FF5733', bgColor: '' })).toThrow(ValueObjectError);
    });

    it('should throw for an invalid format', () => {
      expect(() => create({ color: '#FF5733', bgColor: 'not-hex!' })).toThrow(ValueObjectError);
    });
  });
});
