import { describe, expect, it, vi } from 'vitest';

vi.mock('@config/AppConfig', () => ({
  AppConfig: class {
    database = { mainTable: 'grana-table' };
  },
}));

import { Transaction } from '@application/entities/Transaction';
import { IDService } from '@application/services/IDService';
import { TransactionSummaryService } from '@application/services/TransactionSummaryService';
import { Period } from '@application/valueObjects/Period';
import { AppConfig } from '@config/AppConfig';
import { PaginationService } from '@infra/database/services/PaginationService';

import { ListTransactionsQuery } from './ListTransactionsQuery';

import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { TransactionItem } from '@infra/database/items/TransactionItem';
import type { CategoryLoader, CategoryData } from '@infra/database/services/CategoryLoader';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeDynamoItem = (
  overrides: Partial<TransactionItem.Attributes> = {},
): TransactionItem.Type => {
  const id = IDService.generate();
  const accountId = IDService.generate();
  const categoryId = IDService.generate();

  return {
    PK: `ACCOUNT#${accountId}`,
    SK: `TRANSACTION#2026-04#${id}`,
    GSI1PK: `TRANSACTION#${id}`,
    GSI1SK: `TRANSACTION#${id}`,
    entityType: 'Transaction',
    id,
    accountId,
    parentId: null,
    type: Transaction.Type.EXPENSE,
    value: 100,
    description: 'Mercado',
    date: '2026-04-08T00:00:00.000Z',
    categoryId,
    observations: null,
    reserveId: null,
    recurrenceType: null,
    totalInstallments: null,
    currentInstallment: null,
    ...overrides,
  };
};

const makeCategoryData = (): CategoryData => ({
  name: 'Alimentação',
  color: '#DC2626',
  bgColor: '#FEF2F2',
});

const makeQuery = () => {
  const sendMock = vi.fn<(cmd: any) => Promise<any>>();
  const dynamoClient = {
    send: sendMock,
  } as unknown as DynamoDBDocumentClient;
  const config = new AppConfig();
  const categoryLoader = { load: vi.fn() } as unknown as CategoryLoader;
  const summaryService = new TransactionSummaryService();
  const paginationService = new PaginationService();

  const query = new ListTransactionsQuery(
    dynamoClient,
    config,
    categoryLoader,
    summaryService,
    paginationService,
  );

  return { sendMock, categoryLoader, query };
};

const validAccountId = IDService.generate();
const validPeriod = new Period('2026-04');

const execute = (
  query: ReturnType<typeof makeQuery>['query'],
  overrides: Partial<Parameters<typeof query.execute>[0]> = {},
) =>
  query.execute({
    accountId: validAccountId,
    period: validPeriod,
    ...overrides,
  });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ListTransactionsQuery', () => {
  describe('base behavior', () => {
    it('should return empty transactions when none exist', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      const result = await execute(query);

      expect(result.transactions).toHaveLength(0);
    });

    it('should map transaction fields correctly', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const item = makeDynamoItem({
        value: 500,
        description: 'Salário',
        type: Transaction.Type.INCOME,
      });
      const category = makeCategoryData();

      sendMock.mockResolvedValue({ Items: [item] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map([[item.categoryId, category]]));

      const { transactions } = await execute(query);

      expect(transactions[0]).toMatchObject({
        id: item.id,
        value: 500,
        description: 'Salário',
        type: Transaction.Type.INCOME,
        category,
      });
    });
  });

  describe('filters — DynamoDB FilterExpression', () => {
    it('should pass type filter in FilterExpression', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      await execute(query, { filters: { type: Transaction.Type.INCOME } });

      const command = sendMock.mock.calls[0][0] as any;
      expect(command.input.FilterExpression).toContain('#type = :type');
      expect(command.input.ExpressionAttributeValues[':type']).toBe(Transaction.Type.INCOME);
    });

    it('should pass search filter as contains on description', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      await execute(query, { filters: { search: 'Mercado' } });

      const command = sendMock.mock.calls[0][0] as any;
      expect(command.input.FilterExpression).toContain('contains(#description, :search)');
      expect(command.input.ExpressionAttributeValues[':search']).toBe('Mercado');
    });

    it('should pass minValue filter', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      await execute(query, { filters: { minValue: 100 } });

      const command = sendMock.mock.calls[0][0] as any;
      expect(command.input.FilterExpression).toContain('#value >= :minValue');
      expect(command.input.ExpressionAttributeValues[':minValue']).toBe(100);
    });

    it('should pass maxValue filter', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      await execute(query, { filters: { maxValue: 500 } });

      const command = sendMock.mock.calls[0][0] as any;
      expect(command.input.FilterExpression).toContain('#value <= :maxValue');
    });

    it('should combine multiple filters with AND', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      await execute(query, { filters: { type: Transaction.Type.EXPENSE, search: 'Mercado' } });

      const command = sendMock.mock.calls[0][0] as any;
      expect(command.input.FilterExpression).toContain(' AND ');
    });

    it('should not set FilterExpression when no filters provided', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      await execute(query);

      const command = sendMock.mock.calls[0][0] as any;
      expect(command.input.FilterExpression).toBeUndefined();
    });

    it('should pass minPeriod as date filter', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      await execute(query, { filters: { minPeriod: new Period('2026-01') } });

      const command = sendMock.mock.calls[0][0] as any;
      expect(command.input.FilterExpression).toContain('#date >= :minDate');
    });

    it('should pass maxPeriod as date filter', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      await execute(query, { filters: { maxPeriod: new Period('2026-04') } });

      const command = sendMock.mock.calls[0][0] as any;
      expect(command.input.FilterExpression).toContain('#date <= :maxDate');
    });
  });

  describe('filters — in-memory', () => {
    it('should filter by categoryIds', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const targetCategoryId = IDService.generate();
      const otherCategoryId = IDService.generate();
      const item1 = makeDynamoItem({ categoryId: targetCategoryId });
      const item2 = makeDynamoItem({ categoryId: otherCategoryId });

      sendMock.mockResolvedValue({ Items: [item1, item2] });
      vi.mocked(categoryLoader.load).mockResolvedValue(
        new Map([[targetCategoryId, makeCategoryData()]]),
      );

      const { transactions } = await execute(query, {
        filters: { categoryIds: new Set([targetCategoryId]) },
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].id).toBe(item1.id);
    });

    it('should filter by recurrenceType', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const recurring = makeDynamoItem({ recurrenceType: Transaction.RecurrenceType.RECURRING });
      const once = makeDynamoItem({ recurrenceType: null });

      sendMock.mockResolvedValue({ Items: [recurring, once] });
      vi.mocked(categoryLoader.load).mockResolvedValue(
        new Map([
          [recurring.categoryId, makeCategoryData()],
          [once.categoryId, makeCategoryData()],
        ]),
      );

      const { transactions } = await execute(query, {
        filters: { recurrenceType: new Set([Transaction.RecurrenceType.RECURRING]) },
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].id).toBe(recurring.id);
    });

    it('should return all when recurrenceType contains ALL', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const item1 = makeDynamoItem({ recurrenceType: Transaction.RecurrenceType.RECURRING });
      const item2 = makeDynamoItem({ recurrenceType: null });

      sendMock.mockResolvedValue({ Items: [item1, item2] });
      vi.mocked(categoryLoader.load).mockResolvedValue(
        new Map([
          [item1.categoryId, makeCategoryData()],
          [item2.categoryId, makeCategoryData()],
        ]),
      );

      const { transactions } = await execute(query, {
        filters: { recurrenceType: new Set(['ALL']) },
      });

      expect(transactions).toHaveLength(2);
    });
  });

  describe('summary', () => {
    it('should calculate summary from returned transactions', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const income = makeDynamoItem({ type: Transaction.Type.INCOME, value: 3000 });
      const expense = makeDynamoItem({ type: Transaction.Type.EXPENSE, value: 1000 });

      sendMock.mockResolvedValue({ Items: [income, expense] });
      vi.mocked(categoryLoader.load).mockResolvedValue(
        new Map([
          [income.categoryId, makeCategoryData()],
          [expense.categoryId, makeCategoryData()],
        ]),
      );

      const { summary } = await execute(query);

      expect(summary.totalIncome).toBe(3000);
      expect(summary.totalExpense).toBe(1000);
      expect(summary.total).toBe(2000);
    });

    it('should calculate summary only from filtered transactions', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const income = makeDynamoItem({ type: Transaction.Type.INCOME, value: 3000 });
      const expense = makeDynamoItem({ type: Transaction.Type.EXPENSE, value: 1000 });

      sendMock.mockResolvedValue({ Items: [income, expense] });
      vi.mocked(categoryLoader.load).mockResolvedValue(
        new Map([[income.categoryId, makeCategoryData()]]),
      );

      const { summary } = await execute(query, {
        filters: { categoryIds: new Set([income.categoryId]) },
      });

      expect(summary.totalIncome).toBe(3000);
      expect(summary.totalExpense).toBe(0);
    });
  });

  describe('pagination', () => {
    it('should return exclusiveStartSignature when more pages exist', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const lastKey = { PK: `ACCOUNT#${validAccountId}`, SK: 'TRANSACTION#2026-04#xyz' };

      sendMock.mockResolvedValue({
        Items: [],
        LastEvaluatedKey: lastKey,
      });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      const { exclusiveStartSignature } = await execute(query);

      expect(exclusiveStartSignature).toBeTruthy();
    });

    it('should not return exclusiveStartSignature on last page', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      const { exclusiveStartSignature } = await execute(query);

      expect(exclusiveStartSignature).toBeUndefined();
    });
  });
});
