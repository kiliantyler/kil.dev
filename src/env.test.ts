import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS, ASK_KILIAN_DEFAULT_EMBEDDING_MODEL } from './lib/ask-kilian/config'

const BASE_ENV = {
  NODE_ENV: 'test',
  NEXT_PUBLIC_POSTHOG_KEY: 'test-posthog-key',
  NEXT_PUBLIC_POSTHOG_HOST: 'https://example.test',
  NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
  VERCEL_PROJECT_ID: 'prj_test',
  AI_GATEWAY_API_KEY: 'ai-gateway-test-key',
  ASK_KILIAN_CONVEX_ACCESS_TOKEN: 'ask-kilian-access-token-test-value',
  ASK_KILIAN_GATEWAY_ENV: 'development',
  ASK_KILIAN_EMBEDDING_MODEL: 'alibaba/qwen3-embedding-4b',
  ASK_KILIAN_EMBEDDING_DIMENSIONS: '2048',
  WORKOS_API_KEY: 'sk_test_valid_test_value',
  WORKOS_CLIENT_ID: 'client_test_valid_value',
  WORKOS_WEBHOOK_SECRET: 'whsec_test_valid_value',
  WORKOS_ACTION_SECRET: 'action_secret_test_valid_value',
  WORKOS_COOKIE_PASSWORD: 'a'.repeat(32),
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'http://localhost:3000/auth/callback',
  CONVEX_GAME_WRITE_SECRET: 'game-write-secret-test-value',
  WORKOS_ORG_ID: 'org_test_valid_value',
  ADMIN_EMAIL: 'admin@example.test',
  UPLOADTHING_TOKEN: 'uploadthing-token-valid-value',
}

async function importEnvWith(overrides: Record<string, string> = {}) {
  vi.resetModules()
  vi.unstubAllEnvs()
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
      WORKOS_ORG_ID: 'org_test_valid_value',
      ADMIN_EMAIL: 'admin@example.test',
      UPLOADTHING_TOKEN: 'uploadthing-token-valid-value',
    })
  })

  it('fails closed when a required admin auth env var is missing', async () => {
    for (const key of [
      'WORKOS_API_KEY',
      'WORKOS_CLIENT_ID',
      'WORKOS_COOKIE_PASSWORD',
      'WORKOS_ORG_ID',
      'ADMIN_EMAIL',
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
      WORKOS_ORG_ID: 'org_test_valid_value',
      ADMIN_EMAIL: 'admin@example.test',
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

  it('exposes the Convex game write secret for server-only write actions', async () => {
    const { env, requireConvexGameWriteSecret } = await importEnvWith({
      CONVEX_GAME_WRITE_SECRET: 'game-write-secret-test-value',
    })

    expect(env.CONVEX_GAME_WRITE_SECRET).toBe('game-write-secret-test-value')
    expect(requireConvexGameWriteSecret()).toBe('game-write-secret-test-value')
  })

  it('exposes Ask Kilian AI Gateway env values when all provided', async () => {
    const envModule = await importEnvWith({
      AI_GATEWAY_API_KEY: 'ai-gateway-test-key',
      ASK_KILIAN_EMBEDDING_MODEL: '  custom-embedding-model  ',
      ASK_KILIAN_EMBEDDING_DIMENSIONS: '2048',
    })

    const { env, getAskKilianAiEnv } = envModule

    expect(env.AI_GATEWAY_API_KEY).toBe('ai-gateway-test-key')
    expect(env.VERCEL_PROJECT_ID).toBe('prj_test')
    expect(envModule.ASK_KILIAN_DEFAULT_EMBEDDING_MODEL).toBe(ASK_KILIAN_DEFAULT_EMBEDDING_MODEL)
    expect(envModule.ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS).toBe(ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS)
    expect(getAskKilianAiEnv()).toEqual({
      AI_GATEWAY_API_KEY: 'ai-gateway-test-key',
      VERCEL_PROJECT_ID: 'prj_test',
      ASK_KILIAN_EMBEDDING_MODEL: 'custom-embedding-model',
      ASK_KILIAN_EMBEDDING_DIMENSIONS: 2048,
    })
  })

  it('exposes the optional Ask Kilian RAG source Convex deploy key only when present', async () => {
    const omitted = await importEnvWith()

    expect(omitted.env.ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY).toBeUndefined()

    const empty = await importEnvWith({
      ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY: '',
    })

    expect(empty.env.ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY).toBeUndefined()

    const present = await importEnvWith({
      ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY: 'source-deploy-key-test-value',
    })

    expect(present.env.ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY).toBe('source-deploy-key-test-value')
  })

  it('uses defaults when optional Ask Kilian embedding env values are omitted or empty', async () => {
    const { ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS, ASK_KILIAN_DEFAULT_EMBEDDING_MODEL, getAskKilianAiEnv } =
      await importEnvWith({
        AI_GATEWAY_API_KEY: '',
        ASK_KILIAN_EMBEDDING_MODEL: '',
        ASK_KILIAN_EMBEDDING_DIMENSIONS: '',
      })

    expect(getAskKilianAiEnv()).toEqual({
      AI_GATEWAY_API_KEY: '',
      VERCEL_PROJECT_ID: 'prj_test',
      ASK_KILIAN_EMBEDDING_MODEL: ASK_KILIAN_DEFAULT_EMBEDDING_MODEL,
      ASK_KILIAN_EMBEDDING_DIMENSIONS: ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS,
    })
  })

  it('requires Ask Kilian AI Gateway env values for sync work', async () => {
    const { requireAskKilianAiEnv } = await importEnvWith({
      AI_GATEWAY_API_KEY: '  ai-gateway-test-key  ',
      ASK_KILIAN_EMBEDDING_MODEL: '',
      ASK_KILIAN_EMBEDDING_DIMENSIONS: '',
    })

    expect(requireAskKilianAiEnv()).toEqual({
      AI_GATEWAY_API_KEY: 'ai-gateway-test-key',
      VERCEL_PROJECT_ID: 'prj_test',
      ASK_KILIAN_CONVEX_ACCESS_TOKEN: 'ask-kilian-access-token-test-value',
      ASK_KILIAN_EMBEDDING_MODEL: 'alibaba/qwen3-embedding-4b',
      ASK_KILIAN_EMBEDDING_DIMENSIONS: 2048,
    })
  })

  it('fails closed when Ask Kilian AI Gateway key is missing', async () => {
    const { requireAskKilianAiEnv } = await importEnvWith({
      AI_GATEWAY_API_KEY: '',
    })

    expect(() => requireAskKilianAiEnv()).toThrow('Missing Ask Kilian AI environment variables: AI_GATEWAY_API_KEY')
  })

  it('fails closed when Ask Kilian AI Gateway key is only whitespace', async () => {
    const { requireAskKilianAiEnv } = await importEnvWith({
      AI_GATEWAY_API_KEY: '   ',
    })

    expect(() => requireAskKilianAiEnv()).toThrow('Missing Ask Kilian AI environment variables: AI_GATEWAY_API_KEY')
  })

  it('fails closed when Ask Kilian Convex access token is missing', async () => {
    const { requireAskKilianAiEnv } = await importEnvWith({
      ASK_KILIAN_CONVEX_ACCESS_TOKEN: '',
    })

    expect(() => requireAskKilianAiEnv()).toThrow(
      'Missing Ask Kilian AI environment variables: ASK_KILIAN_CONVEX_ACCESS_TOKEN',
    )
  })

  it('fails closed when Ask Kilian Gateway project attribution is missing', async () => {
    const { requireAskKilianAiEnv } = await importEnvWith({
      VERCEL_PROJECT_ID: '',
    })

    expect(() => requireAskKilianAiEnv()).toThrow('Missing Ask Kilian AI environment variables: VERCEL_PROJECT_ID')
  })

  it('fails closed when Ask Kilian AI Gateway key still has a placeholder', async () => {
    const { requireAskKilianAiEnv } = await importEnvWith({
      AI_GATEWAY_API_KEY: 'replace-with-ai-gateway-api-key',
    })

    expect(() => requireAskKilianAiEnv()).toThrow(
      'Replace Ask Kilian AI placeholder environment variables: AI_GATEWAY_API_KEY',
    )
  })

  it('fails closed when Ask Kilian Convex access token still has a placeholder', async () => {
    const { requireAskKilianAiEnv } = await importEnvWith({
      ASK_KILIAN_CONVEX_ACCESS_TOKEN: 'replace-with-ask-kilian-access-token',
    })

    expect(() => requireAskKilianAiEnv()).toThrow(
      'Replace Ask Kilian AI placeholder environment variables: ASK_KILIAN_CONVEX_ACCESS_TOKEN',
    )
  })

  it('keeps Ask Kilian embedding defaults synchronized with .env.example', async () => {
    const { ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS, ASK_KILIAN_DEFAULT_EMBEDDING_MODEL } = await importEnvWith()
    const envExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8')

    expect(envExample).toContain('AI_GATEWAY_API_KEY=')
    expect(envExample).toContain('VERCEL_PROJECT_ID=')
    expect(envExample).toContain('ASK_KILIAN_CONVEX_ACCESS_TOKEN=')
    expect(envExample).toContain('ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY=')
    expect(envExample).toContain('ASK_KILIAN_GATEWAY_ENV=')
    expect(envExample).toContain(`ASK_KILIAN_EMBEDDING_MODEL=${ASK_KILIAN_DEFAULT_EMBEDDING_MODEL}`)
    expect(envExample).toContain(`ASK_KILIAN_EMBEDDING_DIMENSIONS=${ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS}`)
  })

  it('fails closed when the Convex game write secret is missing', async () => {
    const { requireConvexGameWriteSecret } = await importEnvWith({
      CONVEX_GAME_WRITE_SECRET: '',
    })

    expect(() => requireConvexGameWriteSecret()).toThrow(
      'Missing Convex game write environment variables: CONVEX_GAME_WRITE_SECRET',
    )
  })

  it('fails closed when the Convex game write secret still has a placeholder', async () => {
    const { requireConvexGameWriteSecret } = await importEnvWith({
      CONVEX_GAME_WRITE_SECRET: 'replace-with-game-write-secret',
    })

    expect(() => requireConvexGameWriteSecret()).toThrow(
      'Replace Convex game write placeholder environment variables: CONVEX_GAME_WRITE_SECRET',
    )
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
    ['ADMIN_EMAIL', 'not-an-email'],
  ] as const)('rejects invalid %s values', async (key, value) => {
    await expect(importEnvWith({ [key]: value })).rejects.toThrow()
  })

  it.each(['0', '1.5', '2048abc', 'not-a-number'] as const)(
    'rejects invalid ASK_KILIAN_EMBEDDING_DIMENSIONS=%s values',
    async value => {
      await expect(importEnvWith({ ASK_KILIAN_EMBEDDING_DIMENSIONS: value })).rejects.toThrow()
    },
  )

  it.each(['999', '2560'] as const)('rejects unsupported ASK_KILIAN_EMBEDDING_DIMENSIONS=%s values', async value => {
    await expect(importEnvWith({ ASK_KILIAN_EMBEDDING_DIMENSIONS: value })).rejects.toThrow()
  })
})
