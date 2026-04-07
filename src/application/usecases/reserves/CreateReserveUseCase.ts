import { Category } from '@application/entities/Category';
import { Reserve } from '@application/entities/Reserve';
import { IUnitOfWork } from '@application/interfaces/UnitOfWork';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = Omit<Reserve.CreateParams, 'categoryId'>;

type Output = {
  reserveId: string;
};

@Injectable()
export class CreateReserveUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: Input): Promise<Output> {
    return this.uow.run(async ({ reserveRepository, categoryRepository }) => {
      const category = Category.create({
        accountId: input.accountId,
        name: input.name,
      });

      const reserve = Reserve.create({
        ...input,
        categoryId: category.id,
      });

      await Promise.all([categoryRepository.create(category), reserveRepository.create(reserve)]);

      return {
        reserveId: reserve.id,
      };
    });
  }
}
