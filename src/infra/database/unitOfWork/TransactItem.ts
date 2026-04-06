import type { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

export type TransactItem = NonNullable<
  ConstructorParameters<typeof TransactWriteCommand>[0]['TransactItems']
>[number];
