export class MethodNotAllowedError extends Error {
  constructor(methodName: string) {
    super(`${methodName} is not allowed on DynamoDB transactions`);

    this.name = 'MethodNotAllowedError';
  }
}
