import { describe, expect, it } from 'vitest';

import { mapZodIssues } from './mapZodIssuesToVO';

import type { $ZodIssue } from 'zod/v4/core';

describe('mapZodIssues', () => {
  it('should map a single issue to key/message', () => {
    const issues: $ZodIssue[] = [
      {
        path: ['name'],
        message: 'too short',
        code: 'too_small',
        input: '',
        minimum: 2,
        origin: 'string',
      },
    ];

    expect(mapZodIssues(issues)).toEqual({ name: 'too short' });
  });

  it('should map multiple issues to distinct keys', () => {
    const issues: $ZodIssue[] = [
      {
        path: ['name'],
        message: 'too short',
        code: 'too_small',
        input: '',
        minimum: 2,
        origin: 'string',
      },
      {
        path: ['email'],
        message: 'invalid email',
        code: 'invalid_format',
        input: '',
        format: 'email',
      },
    ];

    expect(mapZodIssues(issues)).toEqual({
      name: 'too short',
      email: 'invalid email',
    });
  });

  it('should join nested path with dot notation', () => {
    const issues: $ZodIssue[] = [
      {
        path: ['address', 'street'],
        message: 'required',
        code: 'invalid_type',
        input: undefined,
        expected: 'string',
      },
    ];

    expect(mapZodIssues(issues)).toEqual({ 'address.street': 'required' });
  });

  it('should return an empty object when there are no issues', () => {
    expect(mapZodIssues([])).toEqual({});
  });
});
