import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

import { Transaction } from '@application/entities/Transaction';
import { TransactionSummaryService } from '@application/services/TransactionSummaryService';
import { AppConfig } from '@config/AppConfig';
import { ReserveItem } from '@infra/database/items/ReserveItem';
import { TransactionItem } from '@infra/database/items/TransactionItem';
import { CategoryLoader } from '@infra/database/services/CategoryLoader';
import { PaginationService } from '@infra/database/services/PaginationService';
import { Injectable } from '@kernel/decorators/Injectable';

import type { Period } from '@application/valueObjects/Period';
import type { CategoryData } from '@infra/database/services/CategoryLoader';

type TransactionOutput = {
  id: string;
  type: Transaction.Type;
  value: number;
  description: string;
  date: Date;
  observations: string | null;
  recurrence: Transaction['recurrence'];
  category: CategoryData;
};

type Input = {
  accountId: string;
  period: Period;
  startSignature?: string;
};

type Output = {
  exclusiveStartSignature?: string;
  currentTransactions: TransactionOutput[];
  commitments: TransactionOutput[];
  reserves: {
    id: string;
    name: string;
    platform: string;
    value: number;
  }[];
  summary: {
    total: number;
    totalIncome: number;
    totalExpense: number;
    nextTotal: number;
  };
};

@Injectable()
export class GetDashboardQuery {
  constructor(
    private readonly dynamoClient: DynamoDBDocumentClient,
    private readonly config: AppConfig,
    private readonly categoryLoader: CategoryLoader,
    private readonly summaryService: TransactionSummaryService,
    private readonly paginationService: PaginationService,
  ) {}

  async execute(input: Input): Promise<Output> {
    const { accountId, period, startSignature } = input;
    const nextPeriod = this.getNextPeriod(period);

    const [currentResult, commitmentsResult, reservesResult] = await Promise.all([
      this.dynamoClient.send(
        new QueryCommand({
          TableName: this.config.database.mainTable,
          ExclusiveStartKey: startSignature
            ? this.paginationService.decode(startSignature)
            : undefined,
          KeyConditionExpression: '#PK = :PK AND begins_with(#SK, :SK)',
          ExpressionAttributeNames: { '#PK': 'PK', '#SK': 'SK' },
          ExpressionAttributeValues: {
            ':PK': TransactionItem.getPK(accountId),
            ':SK': `TRANSACTION#${period.value}#`,
          },
        }),
      ),
      this.dynamoClient.send(
        new QueryCommand({
          TableName: this.config.database.mainTable,
          KeyConditionExpression: '#PK = :PK AND begins_with(#SK, :SK)',
          ExpressionAttributeNames: { '#PK': 'PK', '#SK': 'SK' },
          ExpressionAttributeValues: {
            ':PK': TransactionItem.getPK(accountId),
            ':SK': `TRANSACTION#${nextPeriod}#`,
          },
        }),
      ),
      this.dynamoClient.send(
        new QueryCommand({
          TableName: this.config.database.mainTable,
          KeyConditionExpression: '#PK = :PK AND begins_with(#SK, :SK)',
          ExpressionAttributeNames: { '#PK': 'PK', '#SK': 'SK' },
          ExpressionAttributeValues: {
            ':PK': ReserveItem.getPK(accountId),
            ':SK': 'RESERVE#',
          },
        }),
      ),
    ]);

    const currentItems = (currentResult.Items ?? []) as TransactionItem.Type[];
    const commitmentItems = (commitmentsResult.Items ?? []) as TransactionItem.Type[];
    const reserveItems = (reservesResult.Items ?? []) as ReserveItem.Type[];

    const allCategoryIds = new Set([
      ...currentItems.map((i) => i.categoryId),
      ...commitmentItems.map((i) => i.categoryId),
    ]);

    const categories = await this.categoryLoader.load(accountId, allCategoryIds);

    const currentTransactions = currentItems.map((item) => this.mapTransaction(item, categories));
    const commitments = commitmentItems.map((item) => this.mapTransaction(item, categories));

    const currentSummary = this.summaryService.calculate(currentTransactions);
    const nextTotal = commitments
      .filter((t) => t.type === Transaction.Type.EXPENSE)
      .reduce((sum, t) => sum + t.value, 0);

    return {
      currentTransactions,
      commitments,
      reserves: reserveItems.map((item) => ({
        id: item.id,
        name: item.name,
        platform: item.platform,
        value: item.value,
      })),
      summary: {
        totalIncome: currentSummary.totalIncome,
        totalExpense: currentSummary.totalExpense,
        total: currentSummary.total,
        nextTotal,
      },
      exclusiveStartSignature: currentResult.LastEvaluatedKey
        ? this.paginationService.encode(currentResult.LastEvaluatedKey)
        : undefined,
    };
  }

  private mapTransaction(
    item: TransactionItem.Type,
    categories: Map<string, CategoryData>,
  ): TransactionOutput {
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
  }

  private getNextPeriod(period: Period): string {
    const [year, month] = period.value.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
  }
}
