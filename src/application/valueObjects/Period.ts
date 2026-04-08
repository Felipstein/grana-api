import { z } from 'zod/mini';

import { validateSchemaInDomain } from '@application/utils/validateSchemaInDomain';

const periodAsStrSchema = z
  .string()
  .check(z.refine((value) => /^\d{4}-\d{2}$/.test(value), { error: 'Period must be `YYYY-MM`' }));

export class Period {
  readonly value: Period.AsString;

  constructor(rawValue: Period.AsString) {
    this.value = validateSchemaInDomain(periodAsStrSchema, rawValue) as Period.AsString;
  }

  toDate() {
    const [yearStr, monthStr] = this.value.split('-');
    const monthIndex = Number(monthStr) - 1;
    const year = Number(yearStr);

    return new Date(year, monthIndex);
  }
}

export namespace Period {
  export type AsString = `${number}-${number}`;
}
