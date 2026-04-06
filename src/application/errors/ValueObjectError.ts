import { mapZodIssues } from '../utils/mapZodIssuesToVO';

import { DomainError } from './DomainError';

import type { $ZodIssue } from 'zod/v4/core';

export class ValueObjectError extends DomainError {
  constructor(issues: $ZodIssue[], message?: string) {
    super(
      DomainError.Code.INVALID_VALUE_OBJECT,
      message || createErrorMessage(issues),
      mapZodIssues(issues),
    );

    this.name = 'ValueObjectError';
  }

  get details() {
    return this._details as ValueObjectError;
  }
}

function createErrorMessage(issues: $ZodIssue[]) {
  if (issues.length === 0) {
    return `Some validation failed, but no zod issues are provided.`;
  }

  const fieldNames = issues.map((issue) => issue.path.join('.'));

  let fieldWord = fieldNames.length === 1 ? 'field' : 'fields';

  let fieldNamesFormatted: string;

  if (fieldNames.length === 1) {
    fieldNamesFormatted = `"${fieldNames[0]}"`;
  } else {
    const last = fieldNames.pop();
    fieldNamesFormatted = fieldNames.join(', ').concat(` and ${last}`);
  }

  return `Validation failed at ${fieldWord} ${fieldNamesFormatted}:
${JSON.stringify(mapZodIssues(issues), null, 2)}`;
}
