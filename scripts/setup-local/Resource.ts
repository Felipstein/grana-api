import type { CreateTableCommandInput } from '@aws-sdk/client-dynamodb';

export type ResourceType = `AWS::${string}::${string}`;

export type Resource = Resource.DynamoDB.Table;

export namespace Resource {
  export namespace DynamoDB {
    export type Table = {
      Type: 'AWS::DynamoDB::Table';
      Properties: CreateTableCommandInput;
    };
  }
}
