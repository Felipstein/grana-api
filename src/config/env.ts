import { z } from 'zod/mini';

const envSchema = z.object({
  MAIN_TABLE_NAME: z.string().check(z.minLength(1)),
  COGNITO_USER_POOL_ID: z.string().check(z.minLength(1)),
  COGNITO_CLIENT_ID: z.string().check(z.minLength(1)),
  LOCAL_ENDPOINT_URL: z.optional(z.string()),
});

export const env = envSchema.parse(process.env);
