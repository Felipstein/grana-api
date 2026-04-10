export abstract class IAuthGateway {
  abstract signUp(
    accountId: string,
    email: string,
    password: string,
  ): Promise<IAuthGateway.SignUpResult>;

  abstract signIn(email: string, password: string): Promise<IAuthGateway.AuthResult>;

  abstract refreshToken(refreshToken: string): Promise<IAuthGateway.AuthResult>;

  abstract changePassword(params: IAuthGateway.ChangePasswordParams): Promise<void>;

  abstract deleteUser(externalId: string): Promise<void>;
}

export namespace IAuthGateway {
  export type AuthResult = {
    accessToken: string;
    refreshToken: string;
  };

  export type SignUpResult = {
    externalId: string;
  };

  export type ChangePasswordParams = {
    accessToken: string;
    oldPassword: string;
    newPassword: string;
  };
}
