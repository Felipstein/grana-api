import { z } from 'zod/mini';

const envSchema = z.object({
  LOCAL_ENDPOINT_URL: z.pipe(
    z.string(),
    z.transform((val) => val || undefined),
  ),
  MAIN_TABLE_NAME: z.string().check(z.minLength(1)),
});

export const env = envSchema.parse(process.env);
