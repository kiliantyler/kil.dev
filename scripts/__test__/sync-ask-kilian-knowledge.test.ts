import type { ConvexHttpClient } from 'convex/browser'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../../convex/_generated/api'
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

function createDeps(entries: AskKilianKnowledgeEntry[] = createEntries(10)) {
  const action = vi.fn(async () => {
    if (action.mock.calls.length === 1) {
      return {
        ok: true,
        aiGatewayConfigured: true,
        accessTokenConfigured: true,
      }
    }

    return {
      dryRun: true,
      counts: { created: 1, changed: 0, unchanged: 0, retired: 0, ignoredAdmin: 0 },
      keys: { created: ['pet:lux'], changed: [], unchanged: [], retired: [], ignoredAdmin: [] },
    }
  })

  const deps = {
    createClient: vi.fn(() => ({ action: action as unknown as ConvexHttpClient['action'] })),
    buildEntries: vi.fn(() => entries),
  } satisfies SyncAskKilianKnowledgeDeps

  return { deps, action }
}

describe('parseSyncAskKilianArgs', () => {
  it('parses dry-run mode', () => {
    expect(parseSyncAskKilianArgs(['--dry-run'])).toEqual({ dryRun: true })
  })

  it('defaults to live sync mode', () => {
    expect(parseSyncAskKilianArgs([])).toEqual({ dryRun: false })
  })

  it.each(['--dryrun', '--dry-run=true', '--live'])('rejects unknown sync options: %s', option => {
    expect(() => parseSyncAskKilianArgs([option])).toThrow(`Unknown Ask Kilian sync option: ${option}`)
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
        dryRun: true,
      },
      deps,
    )

    expect(result.counts.created).toBe(1)
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

  it('refuses suspiciously small full manifests before calling Convex', async () => {
    const { deps, action } = createDeps([])

    await expect(
      syncAskKilianKnowledge(
        {
          convexUrl: 'https://example.convex.cloud',
          accessToken: 'server-token',
          dryRun: false,
        },
        deps,
      ),
    ).rejects.toThrow('refusing full-manifest sync below 10')

    expect(deps.createClient).not.toHaveBeenCalled()
    expect(action).not.toHaveBeenCalled()
  })
})
