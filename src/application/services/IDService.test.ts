import { describe, expect, it } from 'vitest';

import { IDService } from './IDService';

describe('IDService', () => {
  describe('generate', () => {
    it('should return a non-empty string', () => {
      expect(typeof IDService.generate()).toBe('string');
      expect(IDService.generate().length).toBeGreaterThan(0);
    });

    it('should return a valid KSUID', () => {
      const id = IDService.generate();
      expect(IDService.isValid(id)).toBe(true);
    });

    it('should generate unique ids on each call', () => {
      const ids = Array.from({ length: 10 }, () => IDService.generate());
      const unique = new Set(ids);
      expect(unique.size).toBe(10);
    });
  });

  describe('isValid', () => {
    it('should return true for a valid KSUID', () => {
      const id = IDService.generate();
      expect(IDService.isValid(id)).toBe(true);
    });

    it('should return false for a random string', () => {
      expect(IDService.isValid('not-a-ksuid')).toBe(false);
    });

    it('should return false for an empty string', () => {
      expect(IDService.isValid('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(IDService.isValid(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(IDService.isValid(undefined)).toBe(false);
    });

    it('should return false for a number', () => {
      expect(IDService.isValid(123)).toBe(false);
    });
  });
});
