import { describe, expect, it } from 'vitest';

import { DynamoItem } from './DynamoItem';

class StubItem extends DynamoItem {
  constructor() {
    super('StubEntity', { name: 'Felipe', value: 42 }, { PK: 'STUB#1', SK: 'STUB#1' });
  }
}

describe('DynamoItem', () => {
  it('should merge keys, attrs and entityType into a single item', () => {
    const item = new StubItem().toItem();

    expect(item).toEqual({
      PK: 'STUB#1',
      SK: 'STUB#1',
      name: 'Felipe',
      value: 42,
      entityType: 'StubEntity',
    });
  });

  it('should always include entityType', () => {
    expect(new StubItem().toItem().entityType).toBe('StubEntity');
  });

  it('should include GSI keys when provided', () => {
    class WithGSI extends DynamoItem {
      constructor() {
        super('GSIEntity', { data: 'x' }, { PK: 'A#1', SK: 'A#1', GSI1PK: 'B#1', GSI1SK: 'B#1' });
      }
    }

    const item = new WithGSI().toItem();
    expect(item.GSI1PK).toBe('B#1');
    expect(item.GSI1SK).toBe('B#1');
  });
});
