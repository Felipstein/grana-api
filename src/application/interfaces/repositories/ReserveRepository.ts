import type { Reserve } from '@application/entities/Reserve';

export abstract class IReserveRepository {
  abstract findById(accountId: string, reserveId: string): Promise<Reserve | null>;
  abstract create(reserve: Reserve): Promise<void>;
  abstract save(reserve: Reserve): Promise<void>;
  abstract delete(accountId: string, reserveId: string): Promise<void>;
}
