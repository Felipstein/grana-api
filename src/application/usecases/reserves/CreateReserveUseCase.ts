import { Reserve } from '@application/entities/Reserve';
import { IUnitOfWork } from '@application/interfaces/IUnitOfWork';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = Reserve.CreateParams;

type Output = {
  reserveId: string;
};

@Injectable()
export class CreateReserveUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: Input): Promise<Output> {
    return this.uow.run(async ({ reserveRepository }) => {
      const reserve = Reserve.create(input);
      await reserveRepository.create(reserve);

      return {
        reserveId: reserve.id,
      };
    });
  }
}
