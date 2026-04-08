import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

import { Transaction } from '@application/entities/Transaction';
import { TransactionSummaryService } from '@application/services/TransactionSummaryService';
import { AppConfig } from '@config/AppConfig';
import { TransactionItem } from '@infra/database/items/TransactionItem';
import { CategoryLoader } from '@infra/database/services/CategoryLoader';
import { PaginationService } from '@infra/database/services/PaginationService';
import { Injectable } from '@kernel/decorators/Injectable';

import type { Period } from '@application/valueObjects/Period';
import type { CategoryData } from '@infra/database/services/CategoryLoader';

type TransactionOutput = Pick<
  Transaction,
  'id' | 'description' | 'recurrence' | 'date' | 'value' | 'observations' | 'type'
> & {
  category: CategoryData;
};

type Input = {
  accountId: string;
  period: Period;
  startSignature?: string;
};

type Output = {
  transactions: TransactionOutput[];
  summary: TransactionSummaryService.Summary;
  exclusiveStartSignature?: string;
};

@Injectable()
export class ListCommitmentsQuery {
  constructor(
    private readonly dynamoClient: DynamoDBClient,
    private readonly config: AppConfig,
    private readonly categoryLoader: CategoryLoader,
    private readonly summaryService: TransactionSummaryService,
    private readonly paginationService: PaginationService,
  ) {}

  async execute(input: Input): Promise<Output> {
    const { accountId, period, startSignature } = input;

    const command = new QueryCommand({
      TableName: this.config.database.mainTable,
      ExclusiveStartKey: startSignature ? this.paginationService.decode(startSignature) : undefined,
      KeyConditionExpression: '#PK = :PK AND begins_with(#SK, :SK)',
      ExpressionAttributeNames: { '#PK': 'PK', '#SK': 'SK' },
      ExpressionAttributeValues: {
        ':PK': TransactionItem.getPK(accountId),
        ':SK': `TRANSACTION#${period.value}#`,
      },
    });

    const { Items = [], LastEvaluatedKey } = await this.dynamoClient.send(command);

    const transactionItems = Items as TransactionItem.Type[];
    const categoryIdSet = new Set(transactionItems.map((item) => item.categoryId));
    const categories = await this.categoryLoader.load(accountId, categoryIdSet);

    const transactions = transactionItems.map((item): TransactionOutput => {
      let recurrence: TransactionOutput['recurrence'];

      switch (item.recurrenceType) {
        case Transaction.RecurrenceType.RECURRING:
          recurrence = { type: Transaction.RecurrenceType.RECURRING };
          break;
        case Transaction.RecurrenceType.INSTALLMENT:
          recurrence = {
            type: Transaction.RecurrenceType.INSTALLMENT,
            totalInstallments: item.totalInstallments!,
            currentInstallment: item.currentInstallment!,
          };
          break;
        default:
          recurrence = null;
      }

      return {
        id: item.id,
        type: item.type,
        value: item.value,
        description: item.description,
        date: new Date(item.date),
        observations: item.observations,
        recurrence,
        category: categories.get(item.categoryId)!,
      };
    });

    return {
      transactions,
      summary: this.summaryService.calculate(transactions),
      exclusiveStartSignature: LastEvaluatedKey
        ? this.paginationService.encode(LastEvaluatedKey)
        : undefined,
    };
  }
}
