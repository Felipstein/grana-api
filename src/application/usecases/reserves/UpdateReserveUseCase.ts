import { ResourceNotFoundError } from '@application/errors/ResourceNotFoundError';
import { IReserveRepository } from '@application/interfaces/repositories/ReserveRepository';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = {
  reserveId: string;
  accountId: string;
  data: {
    name?: string;
    platform?: string;
  };
};

type Output = void;

@Injectable()
export class UpdateReserveUseCase {
  constructor(private readonly reserveRepository: IReserveRepository) {}

  async execute(input: Input): Promise<Output> {
    const reserve = await this.reserveRepository.findById(input.accountId, input.reserveId);

    if (!reserve) {
      throw new ResourceNotFoundError('Reserve not found.');
    }

    if (input.data.name !== undefined) reserve.name = input.data.name;
    if (input.data.platform !== undefined) reserve.platform = input.data.platform;

    await this.reserveRepository.save(reserve);
  }
}
