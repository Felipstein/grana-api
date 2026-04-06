import type { Reserve } from '@application/entities/Reserve';

export interface IReserveRepository {
  findById(accountId: string, reserveId: string): Promise<Reserve | null>;

  create(reserve: Reserve): Promise<void>;

  save(reserve: Reserve): Promise<void>;
}
