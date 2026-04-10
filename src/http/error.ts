import { ZodError } from 'zod';

import { ApplicationError } from '@application/errors/ApplicationError';
import { DomainError } from '@application/errors/DomainError';

import { badRequest, conflict, internalError, notFound, unauthorized } from './response';

import type { APIGatewayProxyResultV2 } from 'aws-lambda';

export function handleError(error: unknown): APIGatewayProxyResultV2 {
  if (error instanceof ZodError) {
    const message = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return badRequest(`Validation error: ${message}`);
  }

  if (error instanceof ApplicationError) {
    const statusCode = error.statusCode ?? 400;
    const response = { code: error.code, message: error.message };

    if (statusCode === 401) return unauthorized(response.message);
    if (statusCode === 404) return notFound(response.message);
    if (statusCode === 409) return conflict(response.message);
    return badRequest(response.message);
  }

  if (error instanceof DomainError) {
    if (error.code === DomainError.Code.RESOURCE_NOT_FOUND) {
      return notFound(error.message);
    }
    return badRequest(error.message);
  }

  console.error('[unhandled error]', error);
  return internalError();
}
