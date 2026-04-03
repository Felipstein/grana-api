import { Registry } from '@kernel/Registry';

import type { Constructor } from '@typess/Constructor';

export function Injectable(): ClassDecorator {
  return (target) => {
    Registry.register(target as unknown as Constructor);
  };
}
