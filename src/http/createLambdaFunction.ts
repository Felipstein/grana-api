import { handleError } from './error';

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

type Handler<TEvent extends APIGatewayProxyEventV2 = APIGatewayProxyEventV2> = (
  event: TEvent,
) => Promise<APIGatewayProxyResultV2>;

export function createLambdaFunction<TEvent extends APIGatewayProxyEventV2 = APIGatewayProxyEventV2>(
  fn: Handler<TEvent>,
): Handler<TEvent> {
  return async (event) => {
    try {
      return await fn(event);
    } catch (error) {
      return handleError(error);
    }
  };
}
