import type { APIGatewayProxyResultV2 } from 'aws-lambda';

function json(statusCode: number, body?: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : '',
  };
}

export const ok = (body: unknown): APIGatewayProxyResultV2 => json(200, body);
export const created = (body: unknown): APIGatewayProxyResultV2 => json(201, body);
export const noContent = (): APIGatewayProxyResultV2 => ({ statusCode: 204, body: '' });
export const badRequest = (message: string): APIGatewayProxyResultV2 =>
  json(400, { message });
export const unauthorized = (message: string): APIGatewayProxyResultV2 =>
  json(401, { message });
export const forbidden = (message: string): APIGatewayProxyResultV2 =>
  json(403, { message });
export const notFound = (message: string): APIGatewayProxyResultV2 =>
  json(404, { message });
export const conflict = (message: string): APIGatewayProxyResultV2 =>
  json(409, { message });
export const internalError = (message = 'Internal server error'): APIGatewayProxyResultV2 =>
  json(500, { message });
