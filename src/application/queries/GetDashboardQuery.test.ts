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

import { GetDashboardQuery } from './GetDashboardQuery';

import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { ReserveItem } from '@infra/database/items/ReserveItem';
import type { TransactionItem } from '@infra/database/items/TransactionItem';
import type { CategoryLoader, CategoryData } from '@infra/database/services/CategoryLoader';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeTransactionItem = (
  overrides: Partial<TransactionItem.Attributes> = {},
): TransactionItem.Type => {
  const id = IDService.generate();
  const categoryId = IDService.generate();
  return {
    PK: `ACCOUNT#${IDService.generate()}`,
    SK: `TRANSACTION#2026-04#${id}`,
    GSI1PK: `TRANSACTION#${id}`,
    GSI1SK: `TRANSACTION#${id}`,
    entityType: 'Transaction',
    id,
    accountId: IDService.generate(),
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

const makeReserveItem = (overrides: Partial<ReserveItem.Attributes> = {}): ReserveItem.Type => {
  const id = IDService.generate();
  return {
    PK: `ACCOUNT#${IDService.generate()}`,
    SK: `RESERVE#${id}`,
    entityType: 'Reserve',
    id,
    accountId: IDService.generate(),
    name: 'Reserva de Emergência',
    platform: 'Nubank',
    value: 15000,
    categoryId: IDService.generate(),
    ...overrides,
  };
};

const makeCategoryData = (): CategoryData => ({
  name: 'Alimentação',
  color: '#DC2626',
  bgColor: '#FEF2F2',
});

const makeQuery = () => {
  const dynamoClient = {
    send: vi.fn<(cmd: any) => Promise<any>>(),
  } as unknown as DynamoDBDocumentClient;
  const config = new AppConfig();
  const categoryLoader = { load: vi.fn() } as unknown as CategoryLoader;
  const summaryService = new TransactionSummaryService();
  const paginationService = new PaginationService();
  const query = new GetDashboardQuery(
    dynamoClient,
    config,
    categoryLoader,
    summaryService,
    paginationService,
  );
  return {
    dynamoClient,
    sendMock: dynamoClient.send as ReturnType<typeof vi.fn>,
    categoryLoader,
    query,
  };
};

const validAccountId = IDService.generate();
const validPeriod = new Period('2026-04');

// mockSend retorna 3 respostas em sequência: current, commitments, reserves
const mockSend = (
  sendMock: ReturnType<typeof vi.fn>,
  opts: {
    current?: TransactionItem.Type[];
    commitments?: TransactionItem.Type[];
    reserves?: ReserveItem.Type[];
    currentLastKey?: Record<string, string>;
  } = {},
) => {
  sendMock
    .mockResolvedValueOnce({
      Items: opts.current ?? [],
      LastEvaluatedKey: opts.currentLastKey,
    })
    .mockResolvedValueOnce({ Items: opts.commitments ?? [] })
    .mockResolvedValueOnce({ Items: opts.reserves ?? [] });
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GetDashboardQuery', () => {
  describe('current transactions', () => {
    it('should return empty currentTransactions when none exist', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      mockSend(sendMock);
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      const { currentTransactions } = await query.execute({
        accountId: validAccountId,
        period: validPeriod,
      });

      expect(currentTransactions).toHaveLength(0);
    });

    it('should map transaction fields correctly', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const item = makeTransactionItem({
        value: 500,
        description: 'Salário',
        type: Transaction.Type.INCOME,
      });
      const category = makeCategoryData();

      mockSend(sendMock, { current: [item] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map([[item.categoryId, category]]));

      const { currentTransactions } = await query.execute({
        accountId: validAccountId,
        period: validPeriod,
      });

      expect(currentTransactions[0]).toMatchObject({
        id: item.id,
        value: 500,
        description: 'Salário',
        type: Transaction.Type.INCOME,
        category,
      });
      expect(currentTransactions[0].date).toBeInstanceOf(Date);
    });
  });

  describe('commitments (next period)', () => {
    it('should return commitments for the next period', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const commitment = makeTransactionItem({
        recurrenceType: Transaction.RecurrenceType.RECURRING,
      });

      mockSend(sendMock, { commitments: [commitment] });
      vi.mocked(categoryLoader.load).mockResolvedValue(
        new Map([[commitment.categoryId, makeCategoryData()]]),
      );

      const { commitments } = await query.execute({
        accountId: validAccountId,
        period: validPeriod,
      });

      expect(commitments).toHaveLength(1);
      expect(commitments[0].id).toBe(commitment.id);
    });

    it('should query next period SK for commitments', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      mockSend(sendMock);
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      await query.execute({ accountId: validAccountId, period: validPeriod });

      const calls = sendMock.mock.calls;
      const commitmentCmd = calls[1][0] as any;
      expect(commitmentCmd.input.ExpressionAttributeValues[':SK']).toBe('TRANSACTION#2026-05#');
    });

    it('should handle year rollover for next period (December → January)', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      mockSend(sendMock);
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      await query.execute({ accountId: validAccountId, period: new Period('2026-12') });

      const calls = sendMock.mock.calls;
      const commitmentCmd = calls[1][0] as any;
      expect(commitmentCmd.input.ExpressionAttributeValues[':SK']).toBe('TRANSACTION#2027-01#');
    });
  });

  describe('reserves', () => {
    it('should return reserves', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const reserve = makeReserveItem({ name: 'Viagem Japão', platform: 'XP', value: 4250 });

      mockSend(sendMock, { reserves: [reserve] });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      const { reserves } = await query.execute({ accountId: validAccountId, period: validPeriod });

      expect(reserves).toHaveLength(1);
      expect(reserves[0]).toEqual({
        id: reserve.id,
        name: 'Viagem Japão',
        platform: 'XP',
        value: 4250,
      });
    });
  });

  describe('summary', () => {
    it('should calculate summary from current transactions', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const income = makeTransactionItem({ type: Transaction.Type.INCOME, value: 12000 });
      const expense = makeTransactionItem({ type: Transaction.Type.EXPENSE, value: 3000 });

      mockSend(sendMock, { current: [income, expense] });
      vi.mocked(categoryLoader.load).mockResolvedValue(
        new Map([
          [income.categoryId, makeCategoryData()],
          [expense.categoryId, makeCategoryData()],
        ]),
      );

      const { summary } = await query.execute({ accountId: validAccountId, period: validPeriod });

      expect(summary.totalIncome).toBe(12000);
      expect(summary.totalExpense).toBe(3000);
      expect(summary.total).toBe(9000);
    });

    it('should calculate nextTotal from next period expenses only', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const nextExpense1 = makeTransactionItem({ type: Transaction.Type.EXPENSE, value: 1500 });
      const nextExpense2 = makeTransactionItem({ type: Transaction.Type.EXPENSE, value: 600 });
      const nextIncome = makeTransactionItem({ type: Transaction.Type.INCOME, value: 5000 });

      mockSend(sendMock, { commitments: [nextExpense1, nextExpense2, nextIncome] });
      vi.mocked(categoryLoader.load).mockResolvedValue(
        new Map([
          [nextExpense1.categoryId, makeCategoryData()],
          [nextExpense2.categoryId, makeCategoryData()],
          [nextIncome.categoryId, makeCategoryData()],
        ]),
      );

      const { summary } = await query.execute({ accountId: validAccountId, period: validPeriod });

      expect(summary.nextTotal).toBe(2100);
    });

    it('should return zero summary when no transactions', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      mockSend(sendMock);
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      const { summary } = await query.execute({ accountId: validAccountId, period: validPeriod });

      expect(summary).toEqual({ totalIncome: 0, totalExpense: 0, total: 0, nextTotal: 0 });
    });
  });

  describe('category loading', () => {
    it('should load categories for both current and next period in a single call', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const currentItem = makeTransactionItem();
      const commitmentItem = makeTransactionItem();

      mockSend(sendMock, { current: [currentItem], commitments: [commitmentItem] });
      vi.mocked(categoryLoader.load).mockResolvedValue(
        new Map([
          [currentItem.categoryId, makeCategoryData()],
          [commitmentItem.categoryId, makeCategoryData()],
        ]),
      );

      await query.execute({ accountId: validAccountId, period: validPeriod });

      expect(categoryLoader.load).toHaveBeenCalledOnce();
      const [, calledSet] = vi.mocked(categoryLoader.load).mock.calls[0];
      expect(calledSet.has(currentItem.categoryId)).toBe(true);
      expect(calledSet.has(commitmentItem.categoryId)).toBe(true);
    });

    it('should deduplicate categoryIds across current and commitments', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const sharedCategoryId = IDService.generate();
      const item1 = makeTransactionItem({ categoryId: sharedCategoryId });
      const item2 = makeTransactionItem({ categoryId: sharedCategoryId });

      mockSend(sendMock, { current: [item1], commitments: [item2] });
      vi.mocked(categoryLoader.load).mockResolvedValue(
        new Map([[sharedCategoryId, makeCategoryData()]]),
      );

      await query.execute({ accountId: validAccountId, period: validPeriod });

      const [, calledSet] = vi.mocked(categoryLoader.load).mock.calls[0];
      expect(calledSet.size).toBe(1);
    });
  });

  describe('pagination', () => {
    it('should return exclusiveStartSignature when more pages exist', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const lastKey = { PK: `ACCOUNT#${validAccountId}`, SK: 'TRANSACTION#2026-04#xyz' };
      mockSend(sendMock, { currentLastKey: lastKey });
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      const { exclusiveStartSignature } = await query.execute({
        accountId: validAccountId,
        period: validPeriod,
      });

      expect(exclusiveStartSignature).toBeTruthy();
    });

    it('should not return exclusiveStartSignature on last page', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      mockSend(sendMock);
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      const { exclusiveStartSignature } = await query.execute({
        accountId: validAccountId,
        period: validPeriod,
      });

      expect(exclusiveStartSignature).toBeUndefined();
    });

    it('should decode and forward startSignature to DynamoDB', async () => {
      const { sendMock, categoryLoader, query } = makeQuery();
      const lastKey = { PK: `ACCOUNT#${validAccountId}`, SK: 'TRANSACTION#2026-04#xyz' };
      const signature = new PaginationService().encode(lastKey);
      mockSend(sendMock);
      vi.mocked(categoryLoader.load).mockResolvedValue(new Map());

      await query.execute({
        accountId: validAccountId,
        period: validPeriod,
        startSignature: signature,
      });

      const currentCmd = sendMock.mock.calls[0][0] as any;
      expect(currentCmd.input.ExclusiveStartKey).toEqual(lastKey);
    });
  });
});
