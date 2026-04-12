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
import { PaginationService } from '@infra/database/services/PaginationService';

import { ListCommitmentsQuery } from './ListCommitmentsQuery';

import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { AppConfig } from '@config/AppConfig';
import type { TransactionItem } from '@infra/database/items/TransactionItem';
import type { CategoryLoader, CategoryData } from '@infra/database/services/CategoryLoader';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeDynamoItem = (
  overrides: Partial<TransactionItem.Attributes> = {},
): TransactionItem.Type => {
  const id = IDService.generate();
  const accountId = IDService.generate();
  const categoryId = IDService.generate();
  const date = '2026-04-01T00:00:00.000Z';

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
    date,
    categoryId,
    observations: null,
    reserveId: null,
    recurrenceType: null,
    totalInstallments: null,
    currentInstallment: null,
    ...overrides,
  };
};

const makeCategoryData = (overrides: Partial<CategoryData> = {}): CategoryData => ({
  name: 'Alimentação',
  color: '#DC2626',
  bgColor: '#FEF2F2',
  ...overrides,
});

const makeQuery = () => {
  const dynamoClient = {
    send: vi.fn<(cmd: any) => Promise<any>>(),
  } as unknown as DynamoDBDocumentClient;
  const config = { database: { mainTable: 'grana-table' } } as AppConfig;
  const categoryLoader = { load: vi.fn() } as unknown as CategoryLoader;
  const summaryService = new TransactionSummaryService();

  const paginationService = new PaginationService();
  const query = new ListCommitmentsQuery(
    dynamoClient,
    config,
    categoryLoader,
    summaryService,
    paginationService,
  );

  return { sendMock: dynamoClient.send as ReturnType<typeof vi.fn>, categoryLoader, query };
};

const validAccountId = IDService.generate();
const validPeriod = new Period('2026-04');

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ListCommitmentsQuery', () => {
  describe('transactions', () => {
    it('should return empty transactions when none exist', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      const result = await query.execute({ accountId: validAccountId, period: validPeriod });

      expect(result.transactions).toHaveLength(0);
    });

    it('should map transaction fields correctly', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const item = makeDynamoItem({
        type: Transaction.Type.INCOME,
        value: 500,
        description: 'Salário',
      });
      const category = makeCategoryData({ name: 'Renda' });

      sendMock.mockResolvedValue({ Items: [item] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map([[item.categoryId, category]]));

      const result = await query.execute({ accountId: validAccountId, period: validPeriod });

      const tx = result.transactions[0];
      expect(tx.id).toBe(item.id);
      expect(tx.type).toBe(Transaction.Type.INCOME);
      expect(tx.value).toBe(500);
      expect(tx.description).toBe('Salário');
      expect(tx.date).toBeInstanceOf(Date);
      expect(tx.category).toEqual(category);
    });

    it('should map recurrence RECURRING correctly', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const item = makeDynamoItem({ recurrenceType: Transaction.RecurrenceType.RECURRING });
      sendMock.mockResolvedValue({ Items: [item] });
      vi.mocked(categoryLoader.load).mockResolvedValue(
        new Map([[item.categoryId, makeCategoryData()]]),
      );

      const { transactions } = await query.execute({
        accountId: validAccountId,
        period: validPeriod,
      });

      expect(transactions[0].recurrence).toEqual({ type: Transaction.RecurrenceType.RECURRING });
    });

    it('should map recurrence INSTALLMENT correctly', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const item = makeDynamoItem({
        recurrenceType: Transaction.RecurrenceType.INSTALLMENT,
        totalInstallments: 6,
        currentInstallment: 3,
      });
      sendMock.mockResolvedValue({ Items: [item] });
      vi.mocked(categoryLoader.load).mockResolvedValue(
        new Map([[item.categoryId, makeCategoryData()]]),
      );

      const { transactions } = await query.execute({
        accountId: validAccountId,
        period: validPeriod,
      });

      expect(transactions[0].recurrence).toEqual({
        type: Transaction.RecurrenceType.INSTALLMENT,
        totalInstallments: 6,
        currentInstallment: 3,
      });
    });

    it('should set recurrence to null when none', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const item = makeDynamoItem({ recurrenceType: null });
      sendMock.mockResolvedValue({ Items: [item] });
      vi.mocked(categoryLoader.load).mockResolvedValue(
        new Map([[item.categoryId, makeCategoryData()]]),
      );

      const { transactions } = await query.execute({
        accountId: validAccountId,
        period: validPeriod,
      });

      expect(transactions[0].recurrence).toBeNull();
    });
  });

  describe('summary', () => {
    it('should calculate summary from transactions', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const income = makeDynamoItem({ type: Transaction.Type.INCOME, value: 1000 });
      const expense = makeDynamoItem({ type: Transaction.Type.EXPENSE, value: 400 });
      const categoryMap = new Map([
        [income.categoryId, makeCategoryData()],
        [expense.categoryId, makeCategoryData()],
      ]);

      sendMock.mockResolvedValue({ Items: [income, expense] });
      vi.mocked(categoryLoader.load).mockResolvedValue(categoryMap);

      const { summary } = await query.execute({ accountId: validAccountId, period: validPeriod });

      expect(summary.totalIncome).toBe(1000);
      expect(summary.totalExpense).toBe(400);
      expect(summary.total).toBe(600);
    });

    it('should return zero summary for empty result', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      const { summary } = await query.execute({ accountId: validAccountId, period: validPeriod });

      expect(summary).toEqual({ totalIncome: 0, totalExpense: 0, total: 0 });
    });
  });

  describe('pagination', () => {
    it('should return exclusiveStartSignature when LastEvaluatedKey exists', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const lastKey = { PK: `ACCOUNT#${validAccountId}`, SK: 'TRANSACTION#2026-04#xyz' };

      sendMock.mockResolvedValue({
        Items: [],
        LastEvaluatedKey: lastKey,
      });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      const { exclusiveStartSignature } = await query.execute({
        accountId: validAccountId,
        period: validPeriod,
      });

      expect(exclusiveStartSignature).toBeTruthy();
      expect(typeof exclusiveStartSignature).toBe('string');
    });

    it('should not return exclusiveStartSignature when no more pages', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      const { exclusiveStartSignature } = await query.execute({
        accountId: validAccountId,
        period: validPeriod,
      });

      expect(exclusiveStartSignature).toBeUndefined();
    });

    it('should decode and pass startSignature as ExclusiveStartKey', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const lastKey = { PK: `ACCOUNT#${validAccountId}`, SK: 'TRANSACTION#2026-04#xyz' };
      const signature = Buffer.from(JSON.stringify(lastKey), 'utf-8').toString('base64');

      sendMock.mockResolvedValue({ Items: [] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      await query.execute({
        accountId: validAccountId,
        period: validPeriod,
        startSignature: signature,
      });

      const sentCommand = sendMock.mock.calls[0][0] as any;
      expect(sentCommand.input.ExclusiveStartKey).toEqual(lastKey);
    });

    it('should encode and decode startSignature as round-trip', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const lastKey = { PK: `ACCOUNT#${validAccountId}`, SK: 'TRANSACTION#2026-04#abc' };

      sendMock.mockResolvedValue({
        Items: [],
        LastEvaluatedKey: lastKey,
      });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      const { exclusiveStartSignature } = await query.execute({
        accountId: validAccountId,
        period: validPeriod,
      });

      sendMock.mockResolvedValue({ Items: [] });

      await query.execute({
        accountId: validAccountId,
        period: validPeriod,
        startSignature: exclusiveStartSignature,
      });

      const sentCommand = sendMock.mock.calls[1][0] as any;
      expect(sentCommand.input.ExclusiveStartKey).toEqual(lastKey);
    });
  });

  describe('category loading', () => {
    it('should call categoryLoader with accountId and deduplicated categoryIds', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const categoryId = IDService.generate();
      const item1 = makeDynamoItem({ categoryId });
      const item2 = makeDynamoItem({ categoryId }); // mesmo categoryId

      sendMock.mockResolvedValue({ Items: [item1, item2] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map([[categoryId, makeCategoryData()]]));

      await query.execute({ accountId: validAccountId, period: validPeriod });

      const [calledAccountId, calledSet] = vi.mocked(categoryLoader.load).mock.calls[0];
      expect(calledAccountId).toBe(validAccountId);
      expect(calledSet).toEqual(new Set([categoryId])); // deduplicado
    });
  });
});
