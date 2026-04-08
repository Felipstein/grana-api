import { describe, expect, it } from 'vitest';

import { Transaction } from '@application/entities/Transaction';

import { TransactionSummaryService } from './TransactionSummaryService';

const service = new TransactionSummaryService();

const income = (value: number) => ({ type: Transaction.Type.INCOME, value });
const expense = (value: number) => ({ type: Transaction.Type.EXPENSE, value });

describe('TransactionSummaryService', () => {
  it('should return zeroes for an empty list', () => {
    expect(service.calculate([])).toEqual({ totalIncome: 0, totalExpense: 0, total: 0 });
  });

  it('should sum income correctly', () => {
    const { totalIncome } = service.calculate([income(100), income(200), income(50)]);
    expect(totalIncome).toBe(350);
  });

  it('should sum expenses correctly', () => {
    const { totalExpense } = service.calculate([expense(80), expense(120)]);
    expect(totalExpense).toBe(200);
  });

  it('should calculate total as totalIncome - totalExpense', () => {
    const { total } = service.calculate([income(500), expense(200)]);
    expect(total).toBe(300);
  });

  it('should return negative total when expenses exceed income', () => {
    const { total } = service.calculate([income(100), expense(300)]);
    expect(total).toBe(-200);
  });

  it('should not include income in totalExpense', () => {
    const { totalExpense } = service.calculate([income(500), expense(100)]);
    expect(totalExpense).toBe(100);
  });

  it('should not include expense in totalIncome', () => {
    const { totalIncome } = service.calculate([income(500), expense(100)]);
    expect(totalIncome).toBe(500);
  });

  it('should handle only income with zero totalExpense', () => {
    const result = service.calculate([income(300)]);
    expect(result).toEqual({ totalIncome: 300, totalExpense: 0, total: 300 });
  });

  it('should handle only expenses with zero totalIncome', () => {
    const result = service.calculate([expense(150)]);
    expect(result).toEqual({ totalIncome: 0, totalExpense: 150, total: -150 });
  });
});
