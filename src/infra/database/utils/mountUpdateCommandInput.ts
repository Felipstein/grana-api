import type { DynamoItem } from '../items/core/DynamoItem';
import type { UpdateCommandInput } from '@aws-sdk/lib-dynamodb';

type Params<Item extends DynamoItem.Type> = {
  tableName: string;
  item: Item;
  fields: (keyof Item)[];
};

type CommandInput = Omit<UpdateCommandInput, 'UpdateExpression'> & {
  UpdateExpression: Exclude<UpdateCommandInput['UpdateExpression'], undefined>;
};

export function mountUpdateCommandInput<Item extends DynamoItem.Type>(
  params: Params<Item>,
): CommandInput {
  const { tableName, item, fields: _fields } = params;
  const fields = _fields as string[];

  return {
    TableName: tableName,
    Key: {
      PK: item.PK,
      SK: item.SK,
    },
    UpdateExpression: `SET ${fields.map((field) => `#${field} = :${field}`).join(', ')}`,
    ExpressionAttributeNames: fields.reduce(
      (attributeNames, field) => ({ ...attributeNames, [`#${field}`]: field }),
      {},
    ),
    ExpressionAttributeValues: fields.reduce(
      (attributeNames, field) => ({
        ...attributeNames,
        [`:${field}`]: item[field as keyof typeof item],
      }),
      {},
    ),
    ReturnValues: 'NONE',
  };
}
