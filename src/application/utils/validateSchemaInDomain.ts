import { ValueObjectError } from '@application/errors/ValueObjectError';

import type { z, ZodMiniType } from 'zod/mini';

export function validateSchemaInDomain<Z extends ZodMiniType>(
  schema: Z,
  dataToParse: unknown,
): z.output<Z> {
  const { success, error, data } = schema.safeParse(dataToParse);

  if (!success) {
    throw new ValueObjectError(error.issues);
  }

  return data;
}
