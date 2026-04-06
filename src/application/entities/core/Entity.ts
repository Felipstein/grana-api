import { IDService } from '@application/services/IDService';
import { validateSchemaInDomain } from '@application/utils/validateSchemaInDomain';

export abstract class Entity {
  readonly id: string;

  constructor(id: string) {
    this.id = validateSchemaInDomain(IDService.idSchema, id);
  }

  equals(entity: unknown) {
    if (entity === this) {
      return true;
    }

    if (!entity || typeof entity !== 'object') {
      return false;
    }

    return (entity as Entity).id === this.id;
  }
}
