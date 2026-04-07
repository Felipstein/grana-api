import { Reserve } from '@application/entities/Reserve';

import { DynamoItem } from './core/DynamoItem';

export class ReserveItem extends DynamoItem<ReserveItem.Keys, ReserveItem.Attributes, 'Reserve'> {
  static readonly type = 'Reserve';

  constructor(attrs: ReserveItem.Attributes) {
    super(ReserveItem.type, attrs, {
      PK: ReserveItem.getPK(attrs.accountId),
      SK: ReserveItem.getSK(attrs.id),
    });
  }

  static getPK(accountId: string): ReserveItem.Keys['PK'] {
    return `ACCOUNT#${accountId}`;
  }

  static getSK(reserveId: string): ReserveItem.Keys['SK'] {
    return `RESERVE#${reserveId}`;
  }

  static toEntity(reserveItem: ReserveItem.Type) {
    return new Reserve(reserveItem.id, reserveItem);
  }

  static fromEntity(reserve: Reserve) {
    return new ReserveItem(reserve);
  }
}

export namespace ReserveItem {
  export type Keys = {
    PK: `ACCOUNT#${string}`;
    SK: `RESERVE#${string}`;
  };

  export type Attributes = {
    id: string;
    accountId: string;
    name: string;
    platform: string;
    value: number;
    categoryId: string;
  };

  export type Type = DynamoItem.Type<Keys, Attributes, 'Reserve'>;
}
