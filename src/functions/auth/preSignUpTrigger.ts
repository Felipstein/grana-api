import type { PreSignUpTriggerEvent } from 'aws-lambda';

export const handler = async (event: PreSignUpTriggerEvent) => (
  (event.response.autoConfirmUser = event.response.autoVerifyEmail = true),
  event
);
