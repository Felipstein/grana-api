import type { Constructor } from '@typess/Constructor';

export type Provider = {
  impl: Constructor;
  deps: Constructor[];
};

export class Registry {
  private static readonly providers = new Map<string, Provider>();
  private static readonly values = new Map<string, unknown>();

  private constructor() {}

  static register(impl: Constructor) {
    const token = impl.name;

    if (this.providers.has(token)) {
      throw new Error(`"${token}" is already registered in the registry.`);
    }

    const deps = Reflect.getMetadata('design:paramtypes', impl) ?? [];

    this.providers.set(token, { impl, deps });
  }

  /**
   * Register a concrete impl under an alternative token (e.g. an abstract class name).
   * No-op if the token is already taken — first registration wins.
   */
  static alias(token: string, impl: Constructor) {
    if (this.providers.has(token)) return;

    const deps = Reflect.getMetadata('design:paramtypes', impl) ?? [];
    this.providers.set(token, { impl, deps });
  }

  /**
   * Provide a pre-built value for a given constructor token (e.g. DynamoDBDocumentClient).
   * Overrides any registered provider for that token.
   */
  static provide<T>(token: { name: string }, value: T) {
    this.values.set(token.name, value);
  }

  static resolve<TImpl extends Constructor>(impl: TImpl): InstanceType<TImpl> {
    const token = impl.name;

    // Pre-built values take precedence (e.g. SDK client singletons)
    if (this.values.has(token)) {
      return this.values.get(token) as InstanceType<TImpl>;
    }

    const provider = this.providers.get(token);

    if (!provider) {
      throw new Error(`"${token}" is not registered.`);
    }

    const deps = provider.deps.map((dep) => this.resolve(dep));
    return new provider.impl(...deps);
  }

  static reset() {
    this.providers.clear();
    this.values.clear();
  }
}
