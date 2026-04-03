import { validateSchemaInDomain } from '@application/utils/validateSchemaInDomain';
import { z } from 'zod/mini';

import { Entity } from './core/Entity';

export class Account extends Entity {
  readonly id: string;
  readonly externalId: string;

  private _name: string;
  readonly email: string;

  constructor(id: string, externalId: string, name: string, email: string) {
    super();

    this.id = id;
    this.externalId = externalId;
    this._name = name;
    this.email = email;
  }

  get name() {
    return this._name;
  }

  set name(name: string) {
    validateName(name);
    this._name = name;
  }
}

const nameSchema = z.string().check(z.minLength(2), z.maxLength(200));
const emailSchema = z.email();

const validateName = (name: string) => validateSchemaInDomain(nameSchema, name);
const validateEmail = (email: string) => validateSchemaInDomain(emailSchema, email);
