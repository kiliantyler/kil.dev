import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    CONVEX_DEPLOYMENT: z.string().optional(),
    CONVEX_DEPLOY_KEY: z.string().optional(),
    PET_GALLERY_CONVEX_ACCESS_TOKEN: z.string().optional(),
    WORKOS_API_KEY: z.string().optional(),
    WORKOS_CLIENT_ID: z.string().optional(),
    WORKOS_WEBHOOK_SECRET: z.string().optional(),
    WORKOS_ACTION_SECRET: z.string().optional(),
    WORKOS_COOKIE_PASSWORD: z.string().min(32).optional(),
    PET_GALLERY_WORKOS_ORG_ID: z.string().optional(),
    PET_GALLERY_ADMIN_EMAIL: z.string().email().optional(),
    UPLOADTHING_TOKEN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string(),
    // Allow empty string for test environments where Convex might not be configured
    NEXT_PUBLIC_CONVEX_URL: z.string().or(z.literal('')).optional(),
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
    CONVEX_DEPLOY_KEY: process.env.CONVEX_DEPLOY_KEY,
    PET_GALLERY_CONVEX_ACCESS_TOKEN: process.env.PET_GALLERY_CONVEX_ACCESS_TOKEN,
    WORKOS_API_KEY: process.env.WORKOS_API_KEY,
    WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID,
    WORKOS_WEBHOOK_SECRET: process.env.WORKOS_WEBHOOK_SECRET,
    WORKOS_ACTION_SECRET: process.env.WORKOS_ACTION_SECRET,
    WORKOS_COOKIE_PASSWORD: process.env.WORKOS_COOKIE_PASSWORD,
    PET_GALLERY_WORKOS_ORG_ID: process.env.PET_GALLERY_WORKOS_ORG_ID,
    PET_GALLERY_ADMIN_EMAIL: process.env.PET_GALLERY_ADMIN_EMAIL,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})

export function requireAdminAuthEnv() {
  const required = {
    WORKOS_API_KEY: env.WORKOS_API_KEY,
    WORKOS_CLIENT_ID: env.WORKOS_CLIENT_ID,
    WORKOS_COOKIE_PASSWORD: env.WORKOS_COOKIE_PASSWORD,
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
    PET_GALLERY_WORKOS_ORG_ID: env.PET_GALLERY_WORKOS_ORG_ID,
    PET_GALLERY_ADMIN_EMAIL: env.PET_GALLERY_ADMIN_EMAIL,
  }
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key)
  const placeholders = Object.entries(required)
    .filter(([, value]) => value?.includes('placeholder') || value?.startsWith('replace-with-'))
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Missing admin auth environment variables: ${missing.join(', ')}`)
  }
  if (placeholders.length > 0) {
    throw new Error(`Replace admin auth placeholder environment variables: ${placeholders.join(', ')}`)
  }

  return {
    WORKOS_API_KEY: required.WORKOS_API_KEY ?? '',
    WORKOS_CLIENT_ID: required.WORKOS_CLIENT_ID ?? '',
    WORKOS_COOKIE_PASSWORD: required.WORKOS_COOKIE_PASSWORD ?? '',
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: required.NEXT_PUBLIC_WORKOS_REDIRECT_URI ?? '',
    PET_GALLERY_WORKOS_ORG_ID: required.PET_GALLERY_WORKOS_ORG_ID ?? '',
    PET_GALLERY_ADMIN_EMAIL: required.PET_GALLERY_ADMIN_EMAIL ?? '',
  }
}

export function requirePetGalleryAdminEnv() {
  const authEnv = requireAdminAuthEnv()
  const required = {
    UPLOADTHING_TOKEN: env.UPLOADTHING_TOKEN,
  }
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key)
  const placeholders = Object.entries(required)
    .filter(([, value]) => value?.includes('placeholder') || value?.startsWith('replace-with-'))
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Missing pet gallery admin environment variables: ${missing.join(', ')}`)
  }
  if (placeholders.length > 0) {
    throw new Error(`Replace pet gallery admin placeholder environment variables: ${placeholders.join(', ')}`)
  }

  return {
    ...authEnv,
    UPLOADTHING_TOKEN: required.UPLOADTHING_TOKEN ?? '',
  }
}
