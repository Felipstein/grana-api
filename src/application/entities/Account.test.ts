import { describe, expect, it } from 'vitest';

import { ValueObjectError } from '@application/errors/ValueObjectError';

import { Account } from './Account';

const create = (overrides?: Partial<Parameters<typeof Account.create>[0]>) =>
  Account.create({
    externalId: overrides?.externalId ?? 'cognito-external-id',
    name: overrides?.name ?? 'Felipe',
    email: overrides?.email ?? 'felipe@example.com',
  });

describe('Account.create', () => {
  describe('happy path', () => {
    it('should create an account with a generated id', () => {
      const account = create();

      expect(account.id).toBeTruthy();
      expect(account.externalId).toBe('cognito-external-id');
      expect(account.name).toBe('Felipe');
      expect(account.email).toBe('felipe@example.com');
    });

    it('should generate a unique id on each call', () => {
      expect(create().id).not.toBe(create().id);
    });
  });

  describe('name', () => {
    it('should throw for 1 character', () => {
      expect(() => create({ name: 'A' })).toThrow(ValueObjectError);
    });

    it('should throw for empty string', () => {
      expect(() => create({ name: '' })).toThrow(ValueObjectError);
    });

    it('should throw for more than 200 characters', () => {
      expect(() => create({ name: 'A'.repeat(201) })).toThrow(ValueObjectError);
    });

    it('should accept exactly 2 characters', () => {
      expect(create({ name: 'Fe' }).name).toBe('Fe');
    });

    it('should accept exactly 200 characters', () => {
      const name = 'A'.repeat(200);
      expect(create({ name }).name).toBe(name);
    });
  });

  describe('email', () => {
    it('should throw for an invalid email', () => {
      expect(() => create({ email: 'not-an-email' })).toThrow(ValueObjectError);
    });

    it('should throw for empty string', () => {
      expect(() => create({ email: '' })).toThrow(ValueObjectError);
    });
  });

  describe('externalId', () => {
    it('should throw for empty string', () => {
      expect(() => create({ externalId: '' })).toThrow(ValueObjectError);
    });
  });
});

describe('Account mutations', () => {
  it('should update name when valid', () => {
    const account = create();
    account.name = 'Felipe Updated';
    expect(account.name).toBe('Felipe Updated');
  });

  it('should throw when setting name too short', () => {
    const account = create();
    expect(() => (account.name = 'A')).toThrow(ValueObjectError);
  });

  it('should throw when setting name too long', () => {
    const account = create();
    expect(() => (account.name = 'A'.repeat(201))).toThrow(ValueObjectError);
  });

  it('should not update name when validation fails', () => {
    const account = create();
    expect(() => (account.name = 'A')).toThrow();
    expect(account.name).toBe('Felipe');
  });
});
