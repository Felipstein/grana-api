export interface IAuthGateway {
  signUp(accountId: string, email: string, password: string): Promise<IAuthGateway.SignUpResult>;

  signIn(email: string, password: string): Promise<IAuthGateway.AuthResult>;

  refreshToken(refreshToken: string): Promise<IAuthGateway.AuthResult>;

  changePassword(params: IAuthGateway.ChangePasswordParams): Promise<void>;

  deleteUser(externalId: string): Promise<void>;
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
