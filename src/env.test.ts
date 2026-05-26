import { afterEach, describe, expect, it, vi } from 'vitest'

const BASE_ENV = {
  NODE_ENV: 'test',
  NEXT_PUBLIC_POSTHOG_KEY: 'test-posthog-key',
  NEXT_PUBLIC_POSTHOG_HOST: 'https://example.test',
  NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
  WORKOS_API_KEY: 'sk_test_valid_test_value',
  WORKOS_CLIENT_ID: 'client_test_valid_value',
  WORKOS_WEBHOOK_SECRET: 'whsec_test_valid_value',
  WORKOS_ACTION_SECRET: 'action_secret_test_valid_value',
  WORKOS_COOKIE_PASSWORD: 'a'.repeat(32),
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'http://localhost:3000/auth/callback',
  PET_GALLERY_WORKOS_ORG_ID: 'org_test_valid_value',
  PET_GALLERY_ADMIN_EMAIL: 'admin@example.test',
  UPLOADTHING_TOKEN: 'uploadthing-token-valid-value',
}

async function importEnvWith(overrides: Partial<typeof BASE_ENV> = {}) {
  vi.resetModules()
  for (const [key, value] of Object.entries({ ...BASE_ENV, ...overrides })) {
    vi.stubEnv(key, value)
  }

  return import('./env.js')
}

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns configured pet gallery admin values', async () => {
    const { requirePetGalleryAdminEnv } = await importEnvWith()

    expect(requirePetGalleryAdminEnv()).toEqual({
      WORKOS_API_KEY: 'sk_test_valid_test_value',
      WORKOS_CLIENT_ID: 'client_test_valid_value',
      WORKOS_COOKIE_PASSWORD: 'a'.repeat(32),
      NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'http://localhost:3000/auth/callback',
      PET_GALLERY_WORKOS_ORG_ID: 'org_test_valid_value',
      PET_GALLERY_ADMIN_EMAIL: 'admin@example.test',
      UPLOADTHING_TOKEN: 'uploadthing-token-valid-value',
    })
  })

  it('fails closed when a required admin auth env var is missing', async () => {
    for (const key of [
      'WORKOS_API_KEY',
      'WORKOS_CLIENT_ID',
      'WORKOS_COOKIE_PASSWORD',
      'NEXT_PUBLIC_WORKOS_REDIRECT_URI',
      'PET_GALLERY_WORKOS_ORG_ID',
      'PET_GALLERY_ADMIN_EMAIL',
    ] as const) {
      const { requireAdminAuthEnv } = await importEnvWith({ [key]: '' })

      expect(() => requireAdminAuthEnv()).toThrow(`Missing admin auth environment variables: ${key}`)
    }
  })

  it('fails closed when pet gallery upload storage env is missing', async () => {
    const { requirePetGalleryAdminEnv } = await importEnvWith({ UPLOADTHING_TOKEN: '' })

    expect(() => requirePetGalleryAdminEnv()).toThrow(
      'Missing pet gallery admin environment variables: UPLOADTHING_TOKEN',
    )
  })

  it('validates admin auth env separately from upload storage env', async () => {
    const { requireAdminAuthEnv } = await importEnvWith({ UPLOADTHING_TOKEN: '' })

    expect(requireAdminAuthEnv()).toEqual({
      WORKOS_API_KEY: 'sk_test_valid_test_value',
      WORKOS_CLIENT_ID: 'client_test_valid_value',
      WORKOS_COOKIE_PASSWORD: 'a'.repeat(32),
      NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'http://localhost:3000/auth/callback',
      PET_GALLERY_WORKOS_ORG_ID: 'org_test_valid_value',
      PET_GALLERY_ADMIN_EMAIL: 'admin@example.test',
    })
  })

  it('exposes the WorkOS Convex AuthKit secrets for deployment setup', async () => {
    const { env } = await importEnvWith({
      WORKOS_WEBHOOK_SECRET: 'whsec_test_other_value',
      WORKOS_ACTION_SECRET: 'action_secret_test_other_value',
    })

    expect(env.WORKOS_WEBHOOK_SECRET).toBe('whsec_test_other_value')
    expect(env.WORKOS_ACTION_SECRET).toBe('action_secret_test_other_value')
  })

  it('fails closed when a required admin auth env var still has a placeholder', async () => {
    const { requireAdminAuthEnv } = await importEnvWith({
      WORKOS_COOKIE_PASSWORD: 'replace-with-at-least-32-characters',
    })

    expect(() => requireAdminAuthEnv()).toThrow(
      'Replace admin auth placeholder environment variables: WORKOS_COOKIE_PASSWORD',
    )
  })

  it.each([
    ['WORKOS_COOKIE_PASSWORD', 'short'],
    ['PET_GALLERY_ADMIN_EMAIL', 'not-an-email'],
    ['NEXT_PUBLIC_WORKOS_REDIRECT_URI', 'not-a-url'],
  ] as const)('rejects invalid %s values', async (key, value) => {
    await expect(importEnvWith({ [key]: value })).rejects.toThrow()
  })
})
