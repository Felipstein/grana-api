import { z } from 'zod/mini';

import { IDService } from '@application/services/IDService';
import { validateSchemaInDomain } from '@application/utils/validateSchemaInDomain';

import { Entity } from './core/Entity';

const attrsSchema = z.object({
  externalId: z.string().check(z.minLength(1)),
  name: z.string().check(z.minLength(2), z.maxLength(200)),
  email: z.email(),
});

export class Account extends Entity {
  readonly externalId: string;

  private _name: string;
  readonly email: string;

  constructor(id: string, attrs: Account.CreateParams) {
    super(id);

    const validated = validateSchemaInDomain(attrsSchema, attrs);

    this.externalId = validated.externalId;
    this._name = validated.name;
    this.email = validated.email;
  }

  get name() {
    return this._name;
  }

  set name(name: string) {
    this._name = validateSchemaInDomain(attrsSchema.shape.name, name);
  }

  static create(attrs: Account.CreateParams) {
    return new Account(IDService.generate(), attrs);
  }
}

export namespace Account {
  export type CreateParams = z.input<typeof attrsSchema>;
  export type Attributes = z.output<typeof attrsSchema>;
}
