import { describe, expect, it } from 'vitest';

import { IDService } from '@application/services/IDService';

import { Account } from '../Account';
import { Transaction } from '../Transaction';

import { Entity } from './Entity';

describe('Entity', () => {
  it('should throw error when create entity with invalid id', () => {
    expect(
      () =>
        new (class _Entity extends Entity {
          constructor() {
            super('invalid-id');
          }
        })(),
    ).toThrow();
  });

  it('should be equals entity based only on identifier', () => {
    const id = IDService.generate();

    const entity1 = new Account(id, { externalId: 'id1', name: 'name1', email: '1@email.com' });
    const entity2 = new Account(id, { externalId: 'id2', name: 'name2', email: '2@email.com' });

    expect(entity1.equals(entity2)).toBe(true);
  });

  it('should be not equals entity having same identifier, but different class', () => {
    const id = IDService.generate();

    const entity1 = new Account(id, { externalId: 'id', name: 'name', email: 'email@email.com' });
    const entity2 = new Transaction(id, {
      accountId: IDService.generate(),
      type: Transaction.Type.INCOME,
      value: 200,
      description: 'description',
      date: new Date(),
      categoryId: IDService.generate(),
      observations: null,
      recurrence: null,
    });

    expect(entity1.equals(entity2)).toBe(true);
  });

  it('should be not equals entity based only on identifier', () => {
    const attrs = { externalId: 'id', name: 'name', email: 'email@email.com' };

    const entity1 = Account.create(attrs);
    const entity2 = Account.create(attrs);

    expect(entity1.equals(entity2)).toBe(false);
  });
});
