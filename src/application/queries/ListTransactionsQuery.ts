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
  filters?: {
    type?: Transaction.Type;
    search?: string;
    minValue?: number;
    maxValue?: number;
    minPeriod?: Period;
    maxPeriod?: Period;
    recurrenceType?: Set<Transaction.RecurrenceType | 'ALL'>;
    categoryIds?: Set<string>;
  };
};

type Output = {
  transactions: TransactionOutput[];
  summary: TransactionSummaryService.Summary;
  exclusiveStartSignature?: string;
};

@Injectable()
export class ListTransactionsQuery {
  constructor(
    private readonly dynamoClient: DynamoDBClient,
    private readonly config: AppConfig,
    private readonly categoryLoader: CategoryLoader,
    private readonly summaryService: TransactionSummaryService,
    private readonly paginationService: PaginationService,
  ) {}

  async execute(input: Input): Promise<Output> {
    const { accountId, period, startSignature, filters } = input;

    const { filterExpression, expressionNames, expressionValues } =
      this.buildFilterExpression(filters);

    const command = new QueryCommand({
      TableName: this.config.database.mainTable,
      ExclusiveStartKey: startSignature ? this.paginationService.decode(startSignature) : undefined,
      KeyConditionExpression: '#PK = :PK AND begins_with(#SK, :SK)',
      FilterExpression: filterExpression,
      ExpressionAttributeNames: {
        '#PK': 'PK',
        '#SK': 'SK',
        ...expressionNames,
      },
      ExpressionAttributeValues: {
        ':PK': TransactionItem.getPK(accountId),
        ':SK': `TRANSACTION#${period.value}#`,
        ...expressionValues,
      },
    });

    const { Items = [], LastEvaluatedKey } = await this.dynamoClient.send(command);

    let transactionItems = Items as TransactionItem.Type[];

    transactionItems = this.applyInMemoryFilters(transactionItems, filters);

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

  private buildFilterExpression(filters: Input['filters']) {
    const parts: string[] = [];
    const expressionNames: Record<string, string> = {};
    const expressionValues: Record<string, unknown> = {};

    if (filters?.type) {
      parts.push('#type = :type');
      expressionNames['#type'] = 'type';
      expressionValues[':type'] = filters.type;
    }

    if (filters?.search) {
      parts.push('contains(#description, :search)');
      expressionNames['#description'] = 'description';
      expressionValues[':search'] = filters.search;
    }

    if (filters?.minValue !== undefined) {
      parts.push('#value >= :minValue');
      expressionNames['#value'] = 'value';
      expressionValues[':minValue'] = filters.minValue;
    }

    if (filters?.maxValue !== undefined) {
      parts.push('#value <= :maxValue');
      expressionNames['#value'] = 'value';
      expressionValues[':maxValue'] = filters.maxValue;
    }

    if (filters?.minPeriod) {
      parts.push('#date >= :minDate');
      expressionNames['#date'] = 'date';
      expressionValues[':minDate'] = `${filters.minPeriod.value}-01`;
    }

    if (filters?.maxPeriod) {
      parts.push('#date <= :maxDate');
      expressionNames['#date'] = 'date';
      expressionValues[':maxDate'] = `${filters.maxPeriod.value}-31`;
    }

    return {
      filterExpression: parts.length > 0 ? parts.join(' AND ') : undefined,
      expressionNames,
      expressionValues,
    };
  }

  // categoryIds and recurrenceType are filtered in memory since
  // DynamoDB doesn't support IN operator natively for sets
  private applyInMemoryFilters(
    items: TransactionItem.Type[],
    filters: Input['filters'],
  ): TransactionItem.Type[] {
    if (!filters) return items;

    return items.filter((item) => {
      if (filters.categoryIds && !filters.categoryIds.has(item.categoryId)) return false;

      if (filters.recurrenceType && !filters.recurrenceType.has('ALL')) {
        const itemRecurrence = item.recurrenceType ?? 'NONE';
        if (!filters.recurrenceType.has(itemRecurrence as Transaction.RecurrenceType)) return false;
      }

      return true;
    });
  }
}
