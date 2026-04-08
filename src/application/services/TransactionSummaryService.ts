import { Transaction } from '@application/entities/Transaction';
import { Injectable } from '@kernel/decorators/Injectable';

type SummaryInput = {
  type: Transaction.Type;
  value: number;
};

@Injectable()
export class TransactionSummaryService {
  calculate(transactions: SummaryInput[]): TransactionSummaryService.Summary {
    const summary = transactions.reduce(
      (summary, transaction) => {
        if (transaction.type === Transaction.Type.INCOME) summary.totalIncome += transaction.value;
        else summary.totalExpense += transaction.value;

        return summary;
      },
      { totalIncome: 0, totalExpense: 0, total: 0 },
    );

    summary.total = summary.totalIncome - summary.totalExpense;

    return summary;
  }
}

export namespace TransactionSummaryService {
  export type Summary = {
    totalIncome: number;
    totalExpense: number;
    total: number;
  };
}
