import { describe, expect, it } from 'vitest';

import { ValueObjectError } from '@application/errors/ValueObjectError';
import { IDService } from '@application/services/IDService';

import { Reserve } from './Reserve';

const validAccountId = IDService.generate();

const create = (overrides?: Partial<Reserve.CreateParams>) =>
  Reserve.create({
    accountId: overrides?.accountId ?? validAccountId,
    name: overrides?.name ?? 'Nubank',
    platform: overrides?.platform ?? 'Banco Digital',
    value: overrides?.value ?? 1500,
  });

describe('Reserve.create', () => {
  describe('happy path', () => {
    it('should create a reserve with a generated id', () => {
      const reserve = create();

      expect(reserve.id).toBeTruthy();
      expect(reserve.accountId).toBe(validAccountId);
      expect(reserve.name).toBe('Nubank');
      expect(reserve.platform).toBe('Banco Digital');
      expect(reserve.value).toBe(1500);
    });

    it('should generate a unique id on each call', () => {
      expect(create().id).not.toBe(create().id);
    });

    it('should accept value of 0', () => {
      expect(() => create({ value: 0 })).not.toThrow();
    });

    it('should accept maximum value (1_000_000_000)', () => {
      expect(() => create({ value: 1_000_000_000 })).not.toThrow();
    });

    it('should accept a 2-character name (minimum)', () => {
      expect(() => create({ name: 'XP' })).not.toThrow();
    });

    it('should accept a 200-character name (maximum)', () => {
      expect(() => create({ name: 'A'.repeat(200) })).not.toThrow();
    });

    it('should accept a 2-character platform (minimum)', () => {
      expect(() => create({ platform: 'XP' })).not.toThrow();
    });

    it('should accept a 200-character platform (maximum)', () => {
      expect(() => create({ platform: 'A'.repeat(200) })).not.toThrow();
    });
  });

  describe('accountId', () => {
    it('should throw for a non-KSUID accountId', () => {
      expect(() => create({ accountId: 'not-a-ksuid' })).toThrow(ValueObjectError);
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

    it('should throw for more than 200 characters', () => {
      expect(() => create({ name: 'A'.repeat(201) })).toThrow(ValueObjectError);
    });
  });

  describe('platform', () => {
    it('should throw for a 1-character platform', () => {
      expect(() => create({ platform: 'X' })).toThrow(ValueObjectError);
    });

    it('should throw for an empty platform', () => {
      expect(() => create({ platform: '' })).toThrow(ValueObjectError);
    });

    it('should throw for more than 200 characters', () => {
      expect(() => create({ platform: 'A'.repeat(201) })).toThrow(ValueObjectError);
    });
  });

  describe('value', () => {
    it('should throw for a negative value', () => {
      expect(() => create({ value: -1 })).toThrow(ValueObjectError);
    });

    it('should throw above 1_000_000_000', () => {
      expect(() => create({ value: 1_000_000_001 })).toThrow(ValueObjectError);
    });
  });
});

describe('Reserve setters', () => {
  describe('name', () => {
    it('should update name with a valid value', () => {
      const reserve = create();
      reserve.name = 'Itaú';
      expect(reserve.name).toBe('Itaú');
    });

    it('should throw for a 1-character name', () => {
      const reserve = create();
      expect(() => (reserve.name = 'A')).toThrow(ValueObjectError);
    });

    it('should throw for more than 200 characters', () => {
      const reserve = create();
      expect(() => (reserve.name = 'A'.repeat(201))).toThrow(ValueObjectError);
    });
  });

  describe('platform', () => {
    it('should update platform with a valid value', () => {
      const reserve = create();
      reserve.platform = 'Corretora';
      expect(reserve.platform).toBe('Corretora');
    });

    it('should throw for a 1-character platform', () => {
      const reserve = create();
      expect(() => (reserve.platform = 'X')).toThrow(ValueObjectError);
    });

    it('should throw for more than 200 characters', () => {
      const reserve = create();
      expect(() => (reserve.platform = 'A'.repeat(201))).toThrow(ValueObjectError);
    });
  });

  describe('value', () => {
    it('should update value with a valid amount', () => {
      const reserve = create();
      reserve.value = 5000;
      expect(reserve.value).toBe(5000);
    });

    it('should throw for a negative value', () => {
      const reserve = create();
      expect(() => (reserve.value = -100)).toThrow(ValueObjectError);
    });

    it('should throw above 1_000_000_000', () => {
      const reserve = create();
      expect(() => (reserve.value = 1_000_000_001)).toThrow(ValueObjectError);
    });
  });
});
