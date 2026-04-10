import { Injectable } from '@kernel/decorators/Injectable';

import { env } from './env';

@Injectable()
export class AppConfig {
  readonly database: AppConfig.Database;
  readonly auth: AppConfig.Auth;

  constructor() {
    this.database = {
      mainTable: env.MAIN_TABLE_NAME,
    };
    this.auth = {
      userPoolId: env.COGNITO_USER_POOL_ID,
      clientId: env.COGNITO_CLIENT_ID,
    };
  }
}

export namespace AppConfig {
  export type Database = {
    mainTable: string;
  };

  export type Auth = {
    userPoolId: string;
    clientId: string;
  };
}
