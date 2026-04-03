import { mapZodIssues } from '../utils/mapZodIssuesToVO';

import { DomainError } from './DomainError';

import type { $ZodIssue } from 'zod/v4/core';

export class ValueObjectError extends DomainError {
  constructor(issues: $ZodIssue[], message = 'An error occurred while parsing some value.') {
    super(DomainError.Code.INVALID_VALUE_OBJECT, message, mapZodIssues(issues));

    this.name = 'ValueObjectError';
  }

  get details() {
    return this._details as ValueObjectError;
  }
}
