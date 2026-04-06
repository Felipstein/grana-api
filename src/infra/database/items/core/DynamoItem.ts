type KeysRecord = {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
};

export abstract class DynamoItem<
  TKeys extends KeysRecord = KeysRecord,
  TAttrs extends Record<string, unknown> = Record<string, unknown>,
  TEntityType extends string = string,
> {
  constructor(
    private readonly type: TEntityType,
    private readonly attrs: TAttrs,
    private readonly keys: TKeys,
  ) {}

  toItem(): DynamoItem.Type<TKeys, TAttrs, TEntityType> {
    return {
      ...this.keys,
      ...this.attrs,
      entityType: this.type,
    };
  }
}

export namespace DynamoItem {
  export type Type<
    TKeys extends KeysRecord = KeysRecord,
    TAttrs extends Record<string, unknown> = Record<string, unknown>,
    TEntityType extends string = string,
  > = TKeys & TAttrs & { entityType: TEntityType };
}
