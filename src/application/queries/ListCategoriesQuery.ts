import { DynamoDBDocumentClient, paginateQuery } from '@aws-sdk/lib-dynamodb';

import { AppConfig } from '@config/AppConfig';
import { CategoryItem } from '@infra/database/items/CategoryItem';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = {
  accountId: string;
};

type Output = {
  categories: {
    id: string;
    name: string;
    color: string;
    bgColor: string;
  }[];
};

@Injectable()
export class ListCategoriesQuery {
  constructor(
    private readonly dynamoClient: DynamoDBDocumentClient,
    private readonly config: AppConfig,
  ) {}

  async execute({ accountId }: Input): Promise<Output> {
    const paginator = paginateQuery(
      { client: this.dynamoClient },
      {
        TableName: this.config.database.mainTable,
        KeyConditionExpression: '#PK = :PK AND begins_with(#SK, :SK)',
        ExpressionAttributeNames: {
          '#PK': 'PK',
          '#SK': 'SK',
        },
        ExpressionAttributeValues: {
          ':PK': CategoryItem.getPK(accountId),
          ':SK': 'CATEGORY#',
        },
      },
    );

    const categoryItems: CategoryItem.Type[] = [];

    for await (const { Items = [] } of paginator) {
      categoryItems.push(...(Items as CategoryItem.Type[]));
    }

    return {
      categories: categoryItems.map((item) => ({
        id: item.id,
        name: item.name,
        color: item.color,
        bgColor: item.bgColor,
      })),
    };
  }
}
