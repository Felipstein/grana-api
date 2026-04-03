import type { Constructor } from '@typess/Constructor';

export type Provider = {
  impl: Constructor;
  deps: Constructor[];
};

export class Registry {
  private static readonly providers = new Map<string, Provider>();

  private constructor() {}

  static register(impl: Constructor) {
    const token = impl.name;

    if (this.providers.has(token)) {
      throw new Error(`"${token}" is already registered in the registry.`);
    }

    const deps = Reflect.getMetadata('design:paramtypes', impl) ?? [];

    this.providers.set(token, { impl, deps });
  }

  static resolve<TImpl extends Constructor>(impl: TImpl): InstanceType<TImpl> {
    const token = impl.name;
    const provider = this.providers.get(token);

    if (!provider) {
      throw new Error(`"${token}" is not registered.`);
    }

    const deps = provider.deps.map((dep) => this.resolve(dep));
    return new provider.impl(...deps);
  }

  static reset() {
    this.providers.clear();
  }
}
