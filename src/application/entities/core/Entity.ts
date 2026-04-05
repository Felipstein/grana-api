import { validateSchemaInDomain } from '@application/utils/validateSchemaInDomain';

import type { z, ZodMiniObject, ZodMiniType } from 'zod/mini';

export abstract class Entity<Z extends ZodMiniObject> {
  constructor(schema: Z, attrs: z.input<Z>) {
    const validated = validateSchemaInDomain(schema, attrs);

    for (const [key, fieldSchema] of Object.entries(schema.shape)) {
      let value = validated[key];

      Object.defineProperty(this, key, {
        get: () => value,
        set: (newVal) => {
          value = validateSchemaInDomain(fieldSchema as ZodMiniType, newVal);
        },
        enumerable: true,
        configurable: true,
      });
    }
  }
}
