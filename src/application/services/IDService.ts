import KSUID from 'ksuid';
import { z } from 'zod/mini';

export class IDService {
  static readonly idSchema = z
    .string()
    .check(z.refine((value) => IDService.isValid(value), { error: 'Invalid ID' }));

  static generate() {
    return KSUID.randomSync().string;
  }

  static isValid(value: unknown) {
    if (typeof value !== 'string') return false;

    try {
      KSUID.parse(value);
      return true;
    } catch {
      return false;
    }
  }
}
