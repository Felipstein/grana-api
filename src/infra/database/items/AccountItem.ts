import { Account } from '@application/entities/Account';

import { DynamoItem } from './core/DynamoItem';

export class AccountItem extends DynamoItem<AccountItem.Keys, AccountItem.Attributes, 'Account'> {
  static readonly type = 'Account';

  constructor(attrs: AccountItem.Attributes) {
    super(AccountItem.type, attrs, {
      PK: AccountItem.getPK(attrs.id),
      SK: AccountItem.getSK(attrs.id),
      GSI1PK: AccountItem.getGSI1PK(attrs.email),
      GSI1SK: AccountItem.getGSI1SK(attrs.email),
    });
  }

  static getPK(accountId: string): AccountItem.Keys['PK'] {
    return `ACCOUNT#${accountId}`;
  }

  static getSK(accountId: string): AccountItem.Keys['SK'] {
    return `ACCOUNT#${accountId}`;
  }

  static getGSI1PK(email: string): AccountItem.Keys['GSI1PK'] {
    return `ACCOUNT#${email}`;
  }

  static getGSI1SK(email: string): AccountItem.Keys['GSI1SK'] {
    return `ACCOUNT#${email}`;
  }

  static toEntity(item: AccountItem.Type): Account {
    return new Account(item.id, {
      externalId: item.externalId,
      name: item.name,
      email: item.email,
    });
  }

  static fromEntity(account: Account): AccountItem {
    return new AccountItem({
      id: account.id,
      externalId: account.externalId,
      name: account.name,
      email: account.email,
    });
  }
}

export namespace AccountItem {
  export type Keys = {
    PK: `ACCOUNT#${string}`;
    SK: `ACCOUNT#${string}`;
    GSI1PK: `ACCOUNT#${string}`;
    GSI1SK: `ACCOUNT#${string}`;
  };

  export type Attributes = {
    id: string;
    externalId: string;
    name: string;
    email: string;
  };

  export type Type = DynamoItem.Type<Keys, Attributes, 'Account'>;
}
