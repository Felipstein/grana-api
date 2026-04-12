import { describe, expect, it } from 'vitest';

import { DomainError } from '@application/errors/DomainError';
import { ValueObjectError } from '@application/errors/ValueObjectError';
import { IDService } from '@application/services/IDService';

import { Reserve } from './Reserve';

const validAccountId = IDService.generate();
const validCategoryId = IDService.generate();

const create = (overrides?: Partial<Reserve.CreateParams>) =>
  Reserve.create({
    accountId: overrides?.accountId ?? validAccountId,
    name: overrides?.name ?? 'Nubank',
    platform: overrides?.platform ?? 'Banco Digital',
    value: overrides?.value ?? 1500,
    categoryId: overrides?.categoryId ?? validCategoryId,
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
      expect(reserve.categoryId).toBe(validCategoryId);
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

  describe('categoryId', () => {
    it('should throw for a non-KSUID categoryId', () => {
      expect(() => create({ categoryId: 'not-a-ksuid' })).toThrow(ValueObjectError);
    });

    it('should throw for an empty categoryId', () => {
      expect(() => create({ categoryId: '' })).toThrow(ValueObjectError);
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
});

describe('Reserve.deposit', () => {
  it('should increase the value by the deposited amount', () => {
    const reserve = create({ value: 1000 });
    reserve.deposit(500);
    expect(reserve.value).toBe(1500);
  });

  it('should allow depositing 0', () => {
    const reserve = create({ value: 1000 });
    reserve.deposit(0);
    expect(reserve.value).toBe(1000);
  });

  it('should accumulate multiple deposits', () => {
    const reserve = create({ value: 0 });
    reserve.deposit(200);
    reserve.deposit(300);
    expect(reserve.value).toBe(500);
  });

  it('should throw DomainError when depositing a negative value', () => {
    const reserve = create({ value: 1000 });
    expect(() => reserve.deposit(-1)).toThrow(DomainError);
  });

  it('should not change the value when deposit fails', () => {
    const reserve = create({ value: 1000 });
    try {
      reserve.deposit(-1);
    } catch {}
    expect(reserve.value).toBe(1000);
  });
});

describe('Reserve.withdraw', () => {
  it('should decrease the value by the withdrawn amount', () => {
    const reserve = create({ value: 1000 });
    reserve.withdraw(400);
    expect(reserve.value).toBe(600);
  });

  it('should allow withdrawing the full balance', () => {
    const reserve = create({ value: 1000 });
    reserve.withdraw(1000);
    expect(reserve.value).toBe(0);
  });

  it('should throw DomainError when withdrawing more than the balance', () => {
    const reserve = create({ value: 500 });
    expect(() => reserve.withdraw(501)).toThrow(DomainError);
  });

  it('should throw DomainError when withdrawing a negative value', () => {
    const reserve = create({ value: 1000 });
    expect(() => reserve.withdraw(-1)).toThrow(DomainError);
  });

  it('should not change the value when withdrawal fails', () => {
    const reserve = create({ value: 500 });
    try {
      reserve.withdraw(600);
    } catch {}
    expect(reserve.value).toBe(500);
  });
});
