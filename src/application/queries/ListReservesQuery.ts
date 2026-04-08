import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

import { Reserve } from '@application/entities/Reserve';
import { AppConfig } from '@config/AppConfig';
import { ReserveItem } from '@infra/database/items/ReserveItem';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = {
  accountId: string;
};

type Output = {
  reserves: Pick<Reserve, 'id' | 'name' | 'platform' | 'value'>[];
};

@Injectable()
export class ListReservesQuery {
  constructor(
    private readonly dynamoClient: DynamoDBClient,
    private readonly config: AppConfig,
  ) {}

  async execute({ accountId }: Input): Promise<Output> {
    const command = new QueryCommand({
      TableName: this.config.database.mainTable,
      KeyConditionExpression: '#PK = :PK AND begins_with(#SK, :SK)',
      ExpressionAttributeNames: {
        '#PK': 'PK',
        '#SK': 'SK',
      },
      ExpressionAttributeValues: {
        ':PK': ReserveItem.getPK(accountId),
        ':SK': 'RESERVE#',
      },
    });

    const { Items = [] } = await this.dynamoClient.send(command);
    const reserveItems = Items as ReserveItem.Type[];

    const reserves = reserveItems.map((item) => ({
      id: item.id,
      name: item.name,
      platform: item.platform,
      value: item.value,
    })) as Output['reserves'];

    return { reserves };
  }
}
