export class ApplicationError extends Error {
  constructor(
    readonly code: ApplicationError.Code,
    message: string,
    readonly statusCode?: number | undefined,
  ) {
    super(`[${code}] ${message}`);

    this.name = 'ApplicationError';
  }
}

export namespace ApplicationError {
  export enum Code {
    EMAIL_ALREADY_TAKEN = 'EMAIL_ALREADY_TAKEN',
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  }
}
