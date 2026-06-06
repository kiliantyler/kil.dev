import { describe, expect, it, vi } from 'vitest'

import type { SyncSummary } from '../../convex/askKilianKnowledge'
import { deploySyncAskKilianRag, type DeploySyncAskKilianRagDeps } from '../deploy-sync-ask-kilian-rag'

function baseEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    VERCEL: '1',
    VERCEL_ENV: 'preview',
    ASK_KILIAN_GATEWAY_ENV: 'preview',
    NEXT_PUBLIC_CONVEX_URL: 'https://preview-123.convex.cloud',
    ASK_KILIAN_CONVEX_ACCESS_TOKEN: 'preview-access-token',
    ...overrides,
  }
}

function createDeps(overrides: Partial<DeploySyncAskKilianRagDeps> = {}) {
  const calls: string[] = []
  const diff: SyncSummary = {
    dryRun: true,
    counts: {
      created: 0,
      changed: 0,
      unchanged: 10,
      retired: 0,
      ignoredAdmin: 0,
    },
    keys: {
      created: [],
      changed: [],
      unchanged: ['pet:lux'],
      retired: [],
      ignoredAdmin: [],
    },
  }
  const result = { skipped: true as const, diff }
  const deps = {
    hydratePreview: vi.fn(async () => {
      calls.push('hydrate')
      return { hydrated: true as const, targetDeployment: 'preview-123' }
    }),
    syncIfChanged: vi.fn(async () => {
      calls.push('sync')
      return result
    }),
    log: vi.fn(),
    ...overrides,
  } satisfies DeploySyncAskKilianRagDeps

  return { deps, calls, result }
}

describe('deploySyncAskKilianRag', () => {
  it('hydrates preview before running if-changed sync against preview Convex', async () => {
    const { deps, calls, result } = createDeps()

    await expect(deploySyncAskKilianRag({ env: baseEnv() }, deps)).resolves.toEqual({
      skipped: false,
      environment: 'preview',
      result,
    })

    expect(calls).toEqual(['hydrate', 'sync'])
    expect(deps.hydratePreview).toHaveBeenCalledWith({ env: baseEnv() })
    expect(deps.syncIfChanged).toHaveBeenCalledWith({
      convexUrl: 'https://preview-123.convex.cloud',
      accessToken: 'preview-access-token',
      mode: 'ifChanged',
    })
    expect(deps.log).toHaveBeenCalledWith(
      '[ask-kilian:deploy-sync] starting preview deploy sync against https://preview-123.convex.cloud',
    )
    expect(deps.log).toHaveBeenCalledWith('[ask-kilian:deploy-sync] preview RAG hydration completed for preview-123')
    expect(deps.log).toHaveBeenCalledWith('[ask-kilian:deploy-sync] checking repo knowledge changes')
    expect(deps.log).toHaveBeenCalledWith(
      '[ask-kilian:deploy-sync] preview sync skipped; no repo knowledge changes detected (created=0, changed=0, retired=0, unchanged=10, ignoredAdmin=0)',
    )
    expect(deps.log).toHaveBeenCalledWith('[ask-kilian:deploy-sync] preview deploy sync completed')
  })

  it('logs when if-changed sync applies repo knowledge changes', async () => {
    const diff: SyncSummary = {
      dryRun: true,
      counts: {
        created: 1,
        changed: 2,
        unchanged: 7,
        retired: 3,
        ignoredAdmin: 4,
      },
      keys: {
        created: ['project:new'],
        changed: ['pet:lux', 'pet:tali'],
        unchanged: ['career:qgenda'],
        retired: ['pet:old'],
        ignoredAdmin: ['admin:note'],
      },
    }
    const sync: SyncSummary = {
      ...diff,
      dryRun: false,
      counts: {
        created: 1,
        changed: 2,
        unchanged: 7,
        retired: 3,
        ignoredAdmin: 4,
      },
    }
    const result = { skipped: false as const, diff, sync }
    const { deps } = createDeps({
      syncIfChanged: vi.fn(async () => result),
    })

    await expect(deploySyncAskKilianRag({ env: baseEnv() }, deps)).resolves.toEqual({
      skipped: false,
      environment: 'preview',
      result,
    })

    expect(deps.log).toHaveBeenCalledWith(
      '[ask-kilian:deploy-sync] preview sync applied repo knowledge changes (created=1, changed=2, retired=3, unchanged=7, ignoredAdmin=4)',
    )
  })

  it('runs production sync without hydration or source key leakage', async () => {
    const sourceKey = 'dev:test-source|source-secret'
    const { deps, result } = createDeps()

    await expect(
      deploySyncAskKilianRag(
        {
          env: baseEnv({
            VERCEL_ENV: 'production',
            ASK_KILIAN_GATEWAY_ENV: 'production',
            NEXT_PUBLIC_CONVEX_URL: 'https://prod.convex.cloud',
            ASK_KILIAN_CONVEX_ACCESS_TOKEN: 'production-access-token',
            ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY: sourceKey,
          }),
        },
        deps,
      ),
    ).resolves.toEqual({
      skipped: false,
      environment: 'production',
      result,
    })

    expect(deps.hydratePreview).not.toHaveBeenCalled()
    expect(deps.syncIfChanged).toHaveBeenCalledWith({
      convexUrl: 'https://prod.convex.cloud',
      accessToken: 'production-access-token',
      mode: 'ifChanged',
    })
    expect(JSON.stringify(vi.mocked(deps.syncIfChanged).mock.calls)).not.toContain(sourceKey)
    expect(JSON.stringify(vi.mocked(deps.log).mock.calls)).not.toContain(sourceKey)
    expect(JSON.stringify(vi.mocked(deps.log).mock.calls)).not.toContain('source-secret')
  })

  it.each([
    ['preview', 'production', 'ASK_KILIAN_GATEWAY_ENV must be preview for Vercel preview deploy sync'],
    ['production', 'preview', 'ASK_KILIAN_GATEWAY_ENV must be production for Vercel production deploy sync'],
  ] as const)('fails closed when %s deploy has gateway env %s', async (vercelEnv, gatewayEnv, message) => {
    const { deps } = createDeps()

    await expect(
      deploySyncAskKilianRag(
        {
          env: baseEnv({
            VERCEL_ENV: vercelEnv,
            ASK_KILIAN_GATEWAY_ENV: gatewayEnv,
          }),
        },
        deps,
      ),
    ).rejects.toThrow(message)

    expect(deps.hydratePreview).not.toHaveBeenCalled()
    expect(deps.syncIfChanged).not.toHaveBeenCalled()
  })

  it('skips outside Vercel unless explicitly enabled', async () => {
    const { deps } = createDeps()

    await expect(deploySyncAskKilianRag({ env: baseEnv({ VERCEL: undefined }) }, deps)).resolves.toEqual({
      skipped: true,
      reason: 'outside-vercel',
    })

    expect(deps.hydratePreview).not.toHaveBeenCalled()
    expect(deps.syncIfChanged).not.toHaveBeenCalled()
  })

  it('allows explicit local deploy-sync override for tests and development', async () => {
    const { deps, result } = createDeps()

    await expect(
      deploySyncAskKilianRag(
        {
          env: baseEnv({
            VERCEL: undefined,
            KIL_DEV_ENABLE_DEPLOY_SYNC: '1',
          }),
        },
        deps,
      ),
    ).resolves.toEqual({
      skipped: false,
      environment: 'preview',
      result,
    })

    expect(deps.hydratePreview).toHaveBeenCalledOnce()
    expect(deps.syncIfChanged).toHaveBeenCalledOnce()
  })

  it.each([
    ['missing Convex URL', { NEXT_PUBLIC_CONVEX_URL: undefined, CONVEX_URL: undefined }, 'Missing Convex URL'],
    ['missing access token', { ASK_KILIAN_CONVEX_ACCESS_TOKEN: undefined }, 'Missing ASK_KILIAN_CONVEX_ACCESS_TOKEN'],
    [
      'placeholder access token',
      { ASK_KILIAN_CONVEX_ACCESS_TOKEN: 'replace-with-ask-kilian-convex-access-token' },
      'Replace placeholder ASK_KILIAN_CONVEX_ACCESS_TOKEN',
    ],
  ] as const)('fails closed before deploy sync for %s', async (_label, overrides, message) => {
    const { deps } = createDeps()

    await expect(deploySyncAskKilianRag({ env: baseEnv(overrides) }, deps)).rejects.toThrow(message)

    expect(deps.hydratePreview).not.toHaveBeenCalled()
    expect(deps.syncIfChanged).not.toHaveBeenCalled()
  })

  it('falls back to CONVEX_URL when NEXT_PUBLIC_CONVEX_URL is missing', async () => {
    const { deps } = createDeps()

    await deploySyncAskKilianRag(
      {
        env: baseEnv({
          NEXT_PUBLIC_CONVEX_URL: undefined,
          CONVEX_URL: 'https://fallback.convex.cloud',
        }),
      },
      deps,
    )

    expect(deps.syncIfChanged).toHaveBeenCalledWith({
      convexUrl: 'https://fallback.convex.cloud',
      accessToken: 'preview-access-token',
      mode: 'ifChanged',
    })
  })

  it('skips unsupported Vercel environments', async () => {
    const { deps } = createDeps()

    await expect(deploySyncAskKilianRag({ env: baseEnv({ VERCEL_ENV: 'development' }) }, deps)).resolves.toEqual({
      skipped: true,
      reason: 'unsupported-vercel-env',
    })

    expect(deps.hydratePreview).not.toHaveBeenCalled()
    expect(deps.syncIfChanged).not.toHaveBeenCalled()
  })
})
