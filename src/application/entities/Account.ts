import { z } from 'zod/mini';

import { IDService } from '@application/services/IDService';

import { Entity } from './core/Entity';

const attributesSchema = z.object({
  externalId: z.string().check(z.minLength(1)),
  name: z.string().check(z.minLength(2), z.maxLength(200)),
  email: z.email(),
});

export interface Account extends z.infer<typeof attributesSchema> {}
export class Account extends Entity<typeof attributesSchema> {
  readonly id: string;

  constructor(id: string, attributes: z.input<typeof attributesSchema>) {
    super(attributesSchema, attributes);

    this.id = id;
  }

  static create(attributes: z.input<typeof attributesSchema>) {
    return new Account(IDService.generate(), attributes);
  }
}
