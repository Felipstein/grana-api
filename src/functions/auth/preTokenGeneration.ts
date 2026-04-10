import type { PreTokenGenerationV2TriggerEvent } from 'aws-lambda';

export const handler = async (
  event: PreTokenGenerationV2TriggerEvent,
): Promise<PreTokenGenerationV2TriggerEvent> => {
  const accountId = event.request.userAttributes['custom:accountId'];

  event.response = {
    claimsAndScopeOverrideDetails: {
      accessTokenGeneration: {
        claimsToAddOrOverride: {
          accountId,
        },
      },
    },
  };

  return event;
};
