import { DomainError } from './DomainError';

export class ResourceNotFoundError extends DomainError {
  constructor(message = 'Resource not found') {
    super(DomainError.Code.RESOURCE_NOT_FOUND, message);
  }
}
