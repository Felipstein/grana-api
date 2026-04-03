import { Injectable } from '@kernel/decorators/Injectable';

import { env } from './env';

@Injectable()
export class AppConfig {
  readonly database: AppConfig.Database;

  constructor() {
    this.database = {
      mainTable: env.MAIN_TABLE_NAME,
    };
  }
}

export namespace AppConfig {
  export type Database = {
    mainTable: string;
  };
}
