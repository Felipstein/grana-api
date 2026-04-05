import { describe, expect, it } from 'vitest';
import { z } from 'zod/mini';

import { ValueObjectError } from '@application/errors/ValueObjectError';

import { validateSchemaInDomain } from './validateSchemaInDomain';

const nameSchema = z.string().check(z.minLength(2), z.maxLength(100));

describe('validateSchemaInDomain', () => {
  it('should return the parsed value when valid', () => {
    const result = validateSchemaInDomain(nameSchema, 'Felipe');
    expect(result).toBe('Felipe');
  });

  it('should throw ValueObjectError when value is invalid', () => {
    expect(() => validateSchemaInDomain(nameSchema, 'A')).toThrow(ValueObjectError);
  });

  it('should throw ValueObjectError with name "ValueObjectError"', () => {
    expect(() => validateSchemaInDomain(nameSchema, 'A')).toThrowError(
      expect.objectContaining({ name: 'ValueObjectError' }),
    );
  });

  it('should throw ValueObjectError for wrong type', () => {
    expect(() => validateSchemaInDomain(nameSchema, 123)).toThrow(ValueObjectError);
  });
});
