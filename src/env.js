import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    UPSTASH_REDIS_REST_API_URL: z.string(),
    UPSTASH_REDIS_REST_API_TOKEN: z.string(),
  },
  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    UPSTASH_REDIS_REST_API_URL: process.env.KV_REST_API_URL,
    UPSTASH_REDIS_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
