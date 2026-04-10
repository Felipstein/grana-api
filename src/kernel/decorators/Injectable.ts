import { Registry } from '@kernel/Registry';

import type { Constructor } from '@typess/Constructor';

export function Injectable(): ClassDecorator {
  return (target) => {
    const ctor = target as unknown as Constructor;
    Registry.register(ctor);

    // Auto-register under the direct parent abstract class so that
    // emitDecoratorMetadata-based dep resolution works for abstract class tokens.
    // e.g. DynamoUnitOfWork extends IUnitOfWork → also registers as 'IUnitOfWork'
    const parent = Object.getPrototypeOf(ctor) as Constructor | null;
    if (parent && parent.name && parent !== (Function as unknown as Constructor)) {
      Registry.alias(parent.name, ctor);
    }
  };
}
