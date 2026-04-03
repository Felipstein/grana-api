export class DomainError extends Error {
  constructor(
    readonly code: DomainError.Code,
    message: string,
    readonly _details: unknown = null,
  ) {
    super(`[${code}] ${message}`);

    this.name = 'DomainError';
  }
}

export namespace DomainError {
  export enum Code {
    INVALID_VALUE_OBJECT = 'INVALID_VALUE_OBJECT',
  }
}
