import { Account } from '@application/entities/Account';
import { ApplicationError } from '@application/errors/ApplicationError';
import { IAuthGateway } from '@application/interfaces/AuthGateway';
import { IUnitOfWork } from '@application/interfaces/UnitOfWork';
import { Saga } from '@application/utils/Saga';
import { Injectable } from '@kernel/decorators/Injectable';

type Input = {
  name: string;
  email: string;
  password: string;
};

type Output = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class SignUpUseCase {
  constructor(
    private readonly saga: Saga,
    private readonly uow: IUnitOfWork,
    private readonly authGateway: IAuthGateway,
  ) {}

  async execute(input: Input): Promise<Output> {
    return this.saga.run(async () =>
      this.uow.run(async ({ accountRepository }) => {
        const emailAlreadyTaken = await accountRepository.findByEmail(input.email);

        if (emailAlreadyTaken) {
          throw new ApplicationError(
            ApplicationError.Code.EMAIL_ALREADY_TAKEN,
            'Email already taken.',
            409,
          );
        }

        const accountBuilder = Account.Builder.init({
          name: input.name,
          email: input.email,
        });

        let externalId: string | null = null;
        this.saga.addCompensation(() =>
          externalId ? this.authGateway.deleteUser(externalId) : Promise.resolve(),
        );

        ({ externalId } = await this.authGateway.signUp(
          accountBuilder.id,
          input.email,
          input.password,
        ));

        const account = accountBuilder.create(externalId);

        const [{ accessToken, refreshToken }] = await Promise.all([
          this.authGateway.signIn(input.email, input.password),
          accountRepository.create(account),
        ]);

        return {
          accessToken,
          refreshToken,
        };
      }),
    );
  }
}
