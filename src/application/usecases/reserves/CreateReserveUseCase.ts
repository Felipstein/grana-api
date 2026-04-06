import { Reserve } from '@application/entities/Reserve';
import { IReserveRepository } from '@application/interfaces/repositories/ReserveRepository';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = Reserve.CreateParams;

type Output = {
  reserveId: string;
};

@Injectable()
export class CreateReserveUseCase {
  constructor(private readonly reserveRepository: IReserveRepository) {}

  async execute(input: Input): Promise<Output> {
    const reserve = Reserve.create(input);
    await this.reserveRepository.create(reserve);

    return {
      reserveId: reserve.id,
    };
  }
}
