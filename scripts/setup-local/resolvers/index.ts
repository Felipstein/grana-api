import { resolveDynamoDB } from './resolve-dynamodb';

import type { Logger } from '../logger';
import type { Resource, ResourceType } from '../Resource';

type Resolver = (logger: Logger, resource: Resource) => Promise<void>;

export const RESOLVERS: Record<ResourceType, Resolver> = {
  'AWS::DynamoDB::Table': resolveDynamoDB,
} as const;
