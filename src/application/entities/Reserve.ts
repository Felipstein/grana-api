import { z } from 'zod/mini';

import { IDService } from '@application/services/IDService';
import { validateSchemaInDomain } from '@application/utils/validateSchemaInDomain';

import { Entity } from './core/Entity';

const attrsSchema = z.object({
  accountId: IDService.idSchema,
  name: z.string().check(z.minLength(2), z.maxLength(200)),
  platform: z.string().check(z.minLength(2), z.maxLength(200)),
  value: z.number().check(z.minimum(0), z.maximum(1_000_000_000)),
});

export class Reserve extends Entity {
  readonly accountId: string;
  private _name: string;
  private _platform: string;
  private _value: number;

  constructor(id: string, attrs: Reserve.CreateParams) {
    super(id);

    const validated = validateSchemaInDomain(attrsSchema, attrs);

    this.accountId = validated.accountId;
    this._name = validated.name;
    this._platform = validated.platform;
    this._value = validated.value;
  }

  get name() {
    return this._name;
  }

  set name(name: string) {
    this._name = validateSchemaInDomain(attrsSchema.shape.name, name);
  }

  get platform() {
    return this._platform;
  }

  set platform(platform: string) {
    this._platform = validateSchemaInDomain(attrsSchema.shape.platform, platform);
  }

  get value() {
    return this._value;
  }

  set value(value: number) {
    this._value = validateSchemaInDomain(attrsSchema.shape.value, value);
  }

  static create(attrs: Reserve.CreateParams) {
    return new Reserve(IDService.generate(), attrs);
  }
}

export namespace Reserve {
  export type CreateParams = z.input<typeof attrsSchema>;
  export type Attributes = z.output<typeof attrsSchema>;
}
