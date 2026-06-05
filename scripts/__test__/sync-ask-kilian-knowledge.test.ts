import type { ConvexHttpClient } from 'convex/browser'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../../convex/_generated/api'
import type { SyncSummary } from '../../convex/askKilianKnowledge'
import type { AskKilianKnowledgeEntry } from '../../src/lib/ask-kilian/types'
import {
  parseSyncAskKilianArgs,
  resolveSyncMode,
  syncAskKilianKnowledge,
  type SyncAskKilianKnowledgeDeps,
} from '../sync-ask-kilian-knowledge'

const entry: AskKilianKnowledgeEntry = {
  stableKey: 'pet:lux',
  source: 'repo',
  status: 'active',
  category: 'pets',
  title: 'Lux',
  text: 'Lux is a Golden Retriever.',
  contentHash: 'hash-lux',
  sourcePath: 'src/lib/pets.ts',
  minTier: 0,
  spoilerLevel: 'none',
  importance: 0.8,
}

function createEntries(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...entry,
    stableKey: `pet:lux-${index}`,
    title: `Lux ${index}`,
    contentHash: `hash-lux-${index}`,
  }))
}

const runtimeEnvStatus = {
  ok: true,
  aiGatewayConfigured: true,
  accessTokenConfigured: true,
}

function createSummary(counts: Partial<SyncSummary['counts']> = {}): SyncSummary {
  const resolvedCounts = {
    created: 0,
    changed: 0,
    unchanged: 0,
    retired: 0,
    ignoredAdmin: 0,
    ...counts,
  }
  return {
    dryRun: true,
    counts: resolvedCounts,
    keys: {
      created: Array.from({ length: resolvedCounts.created }, (_, index) => `created:${index}`),
      changed: Array.from({ length: resolvedCounts.changed }, (_, index) => `changed:${index}`),
      unchanged: Array.from({ length: resolvedCounts.unchanged }, (_, index) => `unchanged:${index}`),
      retired: Array.from({ length: resolvedCounts.retired }, (_, index) => `retired:${index}`),
      ignoredAdmin: Array.from({ length: resolvedCounts.ignoredAdmin }, (_, index) => `ignored-admin:${index}`),
    },
  }
}

function createDeps(
  entries: AskKilianKnowledgeEntry[] = createEntries(10),
  actionImplementation?: Parameters<typeof vi.fn>[0],
) {
  const action = vi.fn(
    actionImplementation ??
      (async () => {
        if (action.mock.calls.length === 1) {
          return runtimeEnvStatus
        }

        return createSummary({ created: 1 })
      }),
  )

  const deps = {
    createClient: vi.fn(() => ({ action: action as unknown as ConvexHttpClient['action'] })),
    buildEntries: vi.fn(() => entries),
  } satisfies SyncAskKilianKnowledgeDeps

  return { deps, action }
}

describe('parseSyncAskKilianArgs', () => {
  it('parses dry-run mode', () => {
    expect(parseSyncAskKilianArgs(['--dry-run'])).toEqual({ mode: 'dryRun' })
  })

  it('parses if-changed mode', () => {
    expect(parseSyncAskKilianArgs(['--if-changed'])).toEqual({ mode: 'ifChanged' })
  })

  it('defaults to live sync mode', () => {
    expect(parseSyncAskKilianArgs([])).toEqual({ mode: 'sync' })
  })

  it.each(['--dryrun', '--dry-run=true', '--live'])('rejects unknown sync options: %s', option => {
    expect(() => parseSyncAskKilianArgs([option])).toThrow(`Unknown Ask Kilian sync option: ${option}`)
  })

  it.each([
    ['--dry-run', '--if-changed'],
    ['--if-changed', '--dry-run'],
    ['--dry-run', '--dry-run'],
  ])('rejects multiple mode options: %s %s', (...args) => {
    expect(() => parseSyncAskKilianArgs(args)).toThrow('Ask Kilian sync accepts only one mode option')
  })
})

describe('resolveSyncMode', () => {
  it('fails closed without a Convex URL', () => {
    expect(() =>
      resolveSyncMode({
        NEXT_PUBLIC_CONVEX_URL: '',
        ASK_KILIAN_CONVEX_ACCESS_TOKEN: 'server-token',
      }),
    ).toThrow('Missing NEXT_PUBLIC_CONVEX_URL')
  })

  it('fails closed without an Ask Kilian Convex access token', () => {
    expect(() =>
      resolveSyncMode({
        NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
        ASK_KILIAN_CONVEX_ACCESS_TOKEN: '',
      }),
    ).toThrow('Missing ASK_KILIAN_CONVEX_ACCESS_TOKEN')
  })

  it.each(['replace-with-ask-kilian-convex-access-token', 'placeholder-ask-kilian-convex-access-token'])(
    'fails closed when the Ask Kilian Convex access token is still a placeholder: %s',
    accessToken => {
      expect(() =>
        resolveSyncMode({
          NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: accessToken,
        }),
      ).toThrow('Replace placeholder ASK_KILIAN_CONVEX_ACCESS_TOKEN')
    },
  )

  it('uses the configured Convex URL and access token', () => {
    expect(
      resolveSyncMode({
        NEXT_PUBLIC_CONVEX_URL: ' https://example.convex.cloud ',
        ASK_KILIAN_CONVEX_ACCESS_TOKEN: ' server-token ',
      }),
    ).toEqual({
      convexUrl: 'https://example.convex.cloud',
      accessToken: 'server-token',
    })
  })
})

describe('syncAskKilianKnowledge', () => {
  it('verifies runtime env before syncing repo knowledge through public server actions', async () => {
    const { deps, action } = createDeps()

    const result = await syncAskKilianKnowledge(
      {
        convexUrl: 'https://example.convex.cloud',
        accessToken: 'server-token',
        mode: 'dryRun',
      },
      deps,
    )

    expect('counts' in result && result.counts.created).toBe(1)
    expect(deps.createClient).toHaveBeenCalledWith('https://example.convex.cloud')
    expect(deps.buildEntries).toHaveBeenCalledOnce()
    expect(action).toHaveBeenCalledTimes(2)
    expect(action).toHaveBeenNthCalledWith(1, api.askKilianKnowledge.verifyRuntimeEnvForServer, {
      accessToken: 'server-token',
    })
    expect(action).toHaveBeenNthCalledWith(2, api.askKilianKnowledge.syncRepoKnowledgeForServer, {
      accessToken: 'server-token',
      entries: createEntries(10),
      dryRun: true,
      isFullManifest: true,
    })
  })

  it('skips runtime verification and sync when if-changed diff has no created, changed, or retired entries', async () => {
    const diff = createSummary({ unchanged: 10, ignoredAdmin: 1 })
    const { deps, action } = createDeps(createEntries(10), async () => diff)

    const result = await syncAskKilianKnowledge(
      {
        convexUrl: 'https://example.convex.cloud',
        accessToken: 'server-token',
        mode: 'ifChanged',
      },
      deps,
    )

    expect(result).toEqual({ skipped: true, diff })
    expect(action).toHaveBeenCalledOnce()
    expect(action).toHaveBeenNthCalledWith(1, api.askKilianKnowledge.diffRepoKnowledgeForServer, {
      accessToken: 'server-token',
      entries: createEntries(10),
      isFullManifest: true,
    })
  })

  it.each([
    ['created', { created: 1 }],
    ['changed', { changed: 1 }],
    ['retired', { retired: 1 }],
  ] satisfies [string, Partial<SyncSummary['counts']>][])(
    'runs live sync after diff and runtime verification when if-changed diff has %s entries',
    async (_label, counts) => {
      const diff = createSummary(counts)
      const sync = createSummary({ changed: 1, unchanged: 9 })
      const { deps, action } = createDeps(createEntries(10), async () => {
        if (action.mock.calls.length === 1) return diff
        if (action.mock.calls.length === 2) return runtimeEnvStatus
        return sync
      })

      const result = await syncAskKilianKnowledge(
        {
          convexUrl: 'https://example.convex.cloud',
          accessToken: 'server-token',
          mode: 'ifChanged',
        },
        deps,
      )

      expect(result).toEqual({ skipped: false, diff, sync })
      expect(action).toHaveBeenCalledTimes(3)
      expect(action).toHaveBeenNthCalledWith(1, api.askKilianKnowledge.diffRepoKnowledgeForServer, {
        accessToken: 'server-token',
        entries: createEntries(10),
        isFullManifest: true,
      })
      expect(action).toHaveBeenNthCalledWith(2, api.askKilianKnowledge.verifyRuntimeEnvForServer, {
        accessToken: 'server-token',
      })
      expect(action).toHaveBeenNthCalledWith(3, api.askKilianKnowledge.syncRepoKnowledgeForServer, {
        accessToken: 'server-token',
        entries: createEntries(10),
        dryRun: false,
        isFullManifest: true,
      })
    },
  )

  it('does not sync when ignoredAdmin is the only if-changed diff count', async () => {
    const diff = createSummary({ unchanged: 10, ignoredAdmin: 2 })
    const { deps, action } = createDeps(createEntries(10), async () => diff)

    const result = await syncAskKilianKnowledge(
      {
        convexUrl: 'https://example.convex.cloud',
        accessToken: 'server-token',
        mode: 'ifChanged',
      },
      deps,
    )

    expect(result).toEqual({ skipped: true, diff })
    expect(action).toHaveBeenCalledOnce()
  })

  it('refuses suspiciously small full manifests before calling Convex', async () => {
    const { deps, action } = createDeps([])

    await expect(
      syncAskKilianKnowledge(
        {
          convexUrl: 'https://example.convex.cloud',
          accessToken: 'server-token',
          mode: 'sync',
        },
        deps,
      ),
    ).rejects.toThrow('refusing full-manifest sync below 10')

    expect(deps.createClient).not.toHaveBeenCalled()
    expect(action).not.toHaveBeenCalled()
  })
})
