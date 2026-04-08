import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { paginateQuery } from '@aws-sdk/lib-dynamodb';

import { AppConfig } from '@config/AppConfig';
import { CategoryItem } from '@infra/database/items/CategoryItem';
import { Injectable } from '@kernel/decorators/Injectable';

export type CategoryData = Pick<CategoryItem.Attributes, 'name' | 'color' | 'bgColor'>;

@Injectable()
export class CategoryLoader {
  constructor(
    private readonly dynamoClient: DynamoDBClient,
    private readonly config: AppConfig,
  ) {}

  async load(accountId: string, categoryIdSet: Set<string>): Promise<Map<string, CategoryData>> {
    const paginator = paginateQuery(
      { client: this.dynamoClient },
      {
        TableName: this.config.database.mainTable,
        KeyConditionExpression: '#PK = :PK AND begins_with(#SK, :SK)',
        ExpressionAttributeNames: { '#PK': 'PK', '#SK': 'SK' },
        ExpressionAttributeValues: {
          ':PK': CategoryItem.getPK(accountId),
          ':SK': 'CATEGORY#',
        },
      },
    );

    const result = new Map<string, CategoryData>();

    for await (const { Items = [] } of paginator) {
      for (const item of Items as CategoryItem.Attributes[]) {
        if (categoryIdSet.has(item.id)) {
          result.set(item.id, {
            name: item.name,
            color: item.color,
            bgColor: item.bgColor,
          });
        }
      }

      if (result.size >= categoryIdSet.size) break;
    }

    return result;
  }
}
