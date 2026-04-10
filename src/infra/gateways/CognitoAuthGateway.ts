import {
  AdminConfirmSignUpCommand,
  AdminDeleteUserCommand,
  AliasExistsException,
  CognitoIdentityProviderClient,
  ChangePasswordCommand,
  GetTokensFromRefreshTokenCommand,
  InitiateAuthCommand,
  NotAuthorizedException,
  RefreshTokenReuseException,
  SignUpCommand,
  UsernameExistsException,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';

import { ApplicationError } from '@application/errors/ApplicationError';
import { IAuthGateway } from '@application/interfaces/AuthGateway';
import { AppConfig } from '@config/AppConfig';
import { Injectable } from '@kernel/decorators/Injectable';

const cognitoClient = new CognitoIdentityProviderClient({});

@Injectable()
export class CognitoAuthGateway extends IAuthGateway {
  constructor(private readonly config: AppConfig) {
    super();
  }

  async signUp(
    accountId: string,
    email: string,
    password: string,
  ): Promise<IAuthGateway.SignUpResult> {
    try {
      await cognitoClient.send(
        new SignUpCommand({
          ClientId: this.config.auth.clientId,
          Username: email,
          Password: password,
          UserAttributes: [{ Name: 'custom:accountId', Value: accountId }],
        }),
      );

      await cognitoClient.send(
        new AdminConfirmSignUpCommand({
          UserPoolId: this.config.auth.userPoolId,
          Username: email,
        }),
      );

      return { externalId: email };
    } catch (error) {
      if (error instanceof UsernameExistsException || error instanceof AliasExistsException) {
        throw new ApplicationError(
          ApplicationError.Code.EMAIL_ALREADY_TAKEN,
          'Email already taken.',
          409,
        );
      }
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<IAuthGateway.AuthResult> {
    try {
      const { AuthenticationResult } = await cognitoClient.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: this.config.auth.clientId,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        }),
      );

      return {
        accessToken: AuthenticationResult!.AccessToken!,
        refreshToken: AuthenticationResult!.RefreshToken!,
      };
    } catch (error) {
      if (error instanceof NotAuthorizedException || error instanceof UserNotFoundException) {
        throw new ApplicationError(
          ApplicationError.Code.INVALID_CREDENTIALS,
          'Invalid email or password.',
          401,
        );
      }
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<IAuthGateway.AuthResult> {
    try {
      const { AuthenticationResult } = await cognitoClient.send(
        new GetTokensFromRefreshTokenCommand({
          ClientId: this.config.auth.clientId,
          RefreshToken: refreshToken,
        }),
      );

      return {
        accessToken: AuthenticationResult!.AccessToken!,
        refreshToken: AuthenticationResult!.RefreshToken!,
      };
    } catch (error) {
      if (error instanceof RefreshTokenReuseException) {
        throw new ApplicationError(
          ApplicationError.Code.INVALID_CREDENTIALS,
          'Refresh token reuse detected.',
          401,
        );
      }
      throw error;
    }
  }

  async changePassword(params: IAuthGateway.ChangePasswordParams): Promise<void> {
    await cognitoClient.send(
      new ChangePasswordCommand({
        AccessToken: params.accessToken,
        PreviousPassword: params.oldPassword,
        ProposedPassword: params.newPassword,
      }),
    );
  }

  async deleteUser(externalId: string): Promise<void> {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: this.config.auth.userPoolId,
        Username: externalId,
      }),
    );
  }
}
