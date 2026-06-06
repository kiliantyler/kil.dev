import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetAuthUser = vi.hoisted(() => vi.fn())

vi.mock('../auth', () => ({
  getAuthKit: () => ({
    getAuthUser: mockGetAuthUser,
  }),
}))

import {
  ASK_KILIAN_CATEGORIES,
  ASK_KILIAN_SOURCES,
  ASK_KILIAN_SPOILER_LEVELS,
  ASK_KILIAN_STATUSES,
  ASK_KILIAN_TIERS,
} from '../../src/lib/ask-kilian/types'
import { api, internal } from '../_generated/api'
import {
  clearPendingRagEntryCleanupId,
  createDiffRepoKnowledgeHandler,
  createPreviewKnowledgeHandler,
  createSearchKnowledgeHandler,
  createSyncRepoKnowledgeHandler,
  diffRepoKnowledgeEntries,
  diffRepoKnowledgeForServer,
  filterSearchEntriesForTier,
  searchKnowledgeForServer,
  shapeSearchKnowledgeResults,
  syncRepoKnowledgeForServer,
  upsertSyncedKnowledgeEntry,
  verifyRuntimeEnvForServer,
  type AskKilianKnowledgeEntry,
  type ExistingKnowledgeEntry,
} from '../askKilianKnowledge'
import {
  ASK_KILIAN_RAG_FILTER_VERSION,
  ASK_KILIAN_CATEGORIES as CONVEX_ASK_KILIAN_CATEGORIES,
  ASK_KILIAN_SOURCES as CONVEX_ASK_KILIAN_SOURCES,
  ASK_KILIAN_SPOILER_LEVELS as CONVEX_ASK_KILIAN_SPOILER_LEVELS,
  ASK_KILIAN_STATUSES as CONVEX_ASK_KILIAN_STATUSES,
  ASK_KILIAN_TIERS as CONVEX_ASK_KILIAN_TIERS,
} from '../askKilianValidators'

function emptyRagSearchResult() {
  return {
    results: [],
    entries: [],
    text: '',
    usage: { tokens: 0 },
  }
}

type ActionForTest = {
  _handler: (ctx: unknown, args: Record<string, unknown>) => Promise<unknown>
}

const getActionHandler = (action: unknown) => (action as ActionForTest)._handler

const baseEntry = {
  source: 'repo',
  status: 'active',
  category: 'pets',
  sourcePath: 'src/lib/pets.ts',
  minTier: 0,
  spoilerLevel: 'none',
  importance: 0.8,
} satisfies Partial<AskKilianKnowledgeEntry>

function incomingEntry(stableKey: string, overrides: Partial<AskKilianKnowledgeEntry> = {}): AskKilianKnowledgeEntry {
  return {
    ...baseEntry,
    stableKey,
    title: stableKey,
    text: `${stableKey} text`,
    contentHash: `${stableKey}:hash`,
    ...overrides,
  } as AskKilianKnowledgeEntry
}

function askKilianAdminIdentity(overrides: Record<string, unknown> = {}) {
  return {
    subject: 'user_admin',
    name: 'Admin User',
    token: {
      claims: {
        org_id: 'org_good',
      },
    },
    ...overrides,
  }
}

function askKilianAdminCtx({
  identity = askKilianAdminIdentity(),
  authUser = { id: 'user_admin', email: 'Admin@Example.com', firstName: 'Admin', lastName: 'User' },
  runQuery = vi.fn(async () => []),
  runMutation = vi.fn(),
  runAction = vi.fn(),
}: {
  identity?: unknown
  authUser?: unknown
  runQuery?: ReturnType<typeof vi.fn>
  runMutation?: ReturnType<typeof vi.fn>
  runAction?: ReturnType<typeof vi.fn>
} = {}) {
  mockGetAuthUser.mockResolvedValue(authUser)
  return {
    auth: {
      getUserIdentity: vi.fn(async () => identity),
    },
    runQuery,
    runMutation,
    runAction,
  }
}

function existingEntry(stableKey: string, overrides: Partial<ExistingKnowledgeEntry> = {}): ExistingKnowledgeEntry {
  return {
    ...incomingEntry(stableKey),
    ragEntryId: `rag:${stableKey}`,
    ragStatus: 'ready',
    ragFilterVersion: ASK_KILIAN_RAG_FILTER_VERSION,
    ...overrides,
  }
}

describe('admin-managed knowledge lifecycle', () => {
  it('rejects non-admin rows in the admin save handler', async () => {
    const { createSaveAdminKnowledgeEntryHandler } = await import('../askKilianKnowledge')
    const ctx = {
      runQuery: vi.fn(async () => []),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = { add: vi.fn(), delete: vi.fn() }
    const handler = createSaveAdminKnowledgeEntryHandler({ rag: rag as never, now: () => 123 })

    await expect(
      handler(ctx, {
        entry: incomingEntry('pet:lux'),
      }),
    ).rejects.toThrow('Only admin: stable keys can be saved through Ask Kilian admin')
    expect(rag.add).not.toHaveBeenCalled()
    expect(ctx.runMutation).not.toHaveBeenCalled()
  })

  it('saves active admin rows to RAG and patches metadata', async () => {
    const { createSaveAdminKnowledgeEntryHandler } = await import('../askKilianKnowledge')
    const adminEntry = incomingEntry('admin:manual', {
      source: 'admin',
      sourcePath: 'admin:/admin/ask-kilian',
      category: 'fun',
    })
    const ctx = {
      runQuery: vi.fn(async () => []),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(async () => ({ entryId: 'rag:admin:manual', status: 'ready' })),
      delete: vi.fn(),
    }
    const handler = createSaveAdminKnowledgeEntryHandler({ rag: rag as never, now: () => 123 })

    await expect(handler(ctx, { entry: adminEntry })).resolves.toEqual({
      stableKey: 'admin:manual',
      ragEntryId: 'rag:admin:manual',
      ragStatus: 'ready',
    })
    expect(rag.add).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        namespace: 'public-site',
        key: 'admin:manual',
        title: 'admin:manual',
        text: 'admin:manual text',
      }),
    )
    expect(ctx.runMutation).toHaveBeenCalled()
  })

  it('disables and re-enables admin rows without deleting the metadata row', async () => {
    const { createDisableAdminKnowledgeEntryHandler, createReenableAdminKnowledgeEntryHandler } =
      await import('../askKilianKnowledge')
    const existing = existingEntry('admin:manual', { source: 'admin', sourcePath: 'admin:/admin/ask-kilian' })
    const ctx = {
      runQuery: vi.fn(async () => [existing]),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(async () => ({ entryId: 'rag:admin:manual:new', status: 'ready' })),
      delete: vi.fn(async () => null),
    }

    await expect(
      createDisableAdminKnowledgeEntryHandler({ rag: rag as never, now: () => 200 })(ctx, {
        stableKey: 'admin:manual',
      }),
    ).resolves.toEqual({ stableKey: 'admin:manual', status: 'disabled' })

    await expect(
      createReenableAdminKnowledgeEntryHandler({ rag: rag as never, now: () => 300 })(ctx, {
        stableKey: 'admin:manual',
      }),
    ).resolves.toEqual({
      stableKey: 'admin:manual',
      ragEntryId: 'rag:admin:manual:new',
      ragStatus: 'ready',
    })
  })

  it('edits a disabled admin row without making it searchable until explicit re-enable', async () => {
    const { createSaveAdminKnowledgeEntryHandler } = await import('../askKilianKnowledge')
    const disabledEntry = existingEntry('admin:manual', {
      source: 'admin',
      status: 'disabled',
      sourcePath: 'admin:/admin/ask-kilian',
      ragEntryId: undefined,
      ragStatus: 'deleted',
    })
    const edited = incomingEntry('admin:manual', {
      source: 'admin',
      status: 'disabled',
      sourcePath: 'admin:/admin/ask-kilian',
      text: 'Edited disabled text',
      contentHash: 'edited-disabled-hash',
    })
    const ctx = {
      runQuery: vi.fn(async () => [disabledEntry]),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(),
      delete: vi.fn(),
    }

    await expect(
      createSaveAdminKnowledgeEntryHandler({ rag: rag as never, now: () => 400 })(ctx, {
        entry: edited,
        originalStableKey: 'admin:manual',
      }),
    ).resolves.toEqual({ stableKey: 'admin:manual', status: 'disabled' })
    expect(rag.add).not.toHaveBeenCalled()
  })

  it('rejects stale admin edits when the stored status changed after the editor opened', async () => {
    const { createSaveAdminKnowledgeEntryHandler } = await import('../askKilianKnowledge')
    const reenabledEntry = existingEntry('admin:manual', {
      source: 'admin',
      status: 'active',
      sourcePath: 'admin:/admin/ask-kilian',
      ragEntryId: 'rag:admin:manual:active',
      ragStatus: 'ready',
    })
    const staleDisabledEdit = incomingEntry('admin:manual', {
      source: 'admin',
      status: 'disabled',
      sourcePath: 'admin:/admin/ask-kilian',
      text: 'Edited stale disabled text',
      contentHash: 'edited-stale-disabled-hash',
    })
    const ctx = {
      runQuery: vi.fn(async () => [reenabledEntry]),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(),
      delete: vi.fn(),
    }

    await expect(
      createSaveAdminKnowledgeEntryHandler({ rag: rag as never, now: () => 450 })(ctx, {
        entry: staleDisabledEdit,
        originalStableKey: 'admin:manual',
      }),
    ).rejects.toThrow('Ask Kilian admin entry status changed; reload before saving')
    expect(rag.add).not.toHaveBeenCalled()
    expect(rag.delete).not.toHaveBeenCalled()
    expect(ctx.runMutation).not.toHaveBeenCalled()
  })

  it('retires the original disabled admin row when a disabled edit renames its stable key', async () => {
    const { createSaveAdminKnowledgeEntryHandler } = await import('../askKilianKnowledge')
    const disabledEntry = existingEntry('admin:manual', {
      source: 'admin',
      status: 'disabled',
      sourcePath: 'admin:/admin/ask-kilian',
      ragEntryId: undefined,
      ragStatus: 'deleted',
    })
    const renamed = incomingEntry('admin:renamed-manual', {
      source: 'admin',
      status: 'disabled',
      sourcePath: 'admin:/admin/ask-kilian',
      text: 'Renamed disabled text',
      contentHash: 'renamed-disabled-hash',
    })
    const ctx = {
      runQuery: vi.fn(async () => [disabledEntry]),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(),
      delete: vi.fn(),
    }

    await expect(
      createSaveAdminKnowledgeEntryHandler({ rag: rag as never, now: () => 500 })(ctx, {
        entry: renamed,
        originalStableKey: 'admin:manual',
      }),
    ).resolves.toEqual({ stableKey: 'admin:renamed-manual', status: 'disabled' })
    expect(rag.add).not.toHaveBeenCalled()
    const mutationPayloads = ctx.runMutation.mock.calls.map(([, payload]) => payload)
    expect(mutationPayloads).toContainEqual({
      entry: expect.objectContaining({
        stableKey: 'admin:renamed-manual',
        status: 'disabled',
      }),
      ragEntryId: undefined,
      ragStatus: 'deleted',
      pendingRagEntryCleanupIds: [],
      now: 500,
    })
    expect(mutationPayloads).toContainEqual({
      stableKey: 'admin:manual',
      status: 'retired',
      ragEntryId: undefined,
      ragStatus: 'deleted',
      pendingRagEntryCleanupIds: [],
      now: 500,
    })
  })

  it('rejects edits to retired admin rows', async () => {
    const { createSaveAdminKnowledgeEntryHandler } = await import('../askKilianKnowledge')
    const retiredEntry = existingEntry('admin:manual', {
      source: 'admin',
      status: 'retired',
      sourcePath: 'admin:/admin/ask-kilian',
      ragStatus: 'deleted',
    })
    const edited = incomingEntry('admin:manual', {
      source: 'admin',
      sourcePath: 'admin:/admin/ask-kilian',
      text: 'Edited retired text',
    })
    const ctx = {
      runQuery: vi.fn(async () => [retiredEntry]),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = { add: vi.fn(), delete: vi.fn() }

    await expect(
      createSaveAdminKnowledgeEntryHandler({ rag: rag as never })(ctx, {
        entry: edited,
        originalStableKey: 'admin:manual',
      }),
    ).rejects.toThrow('Retired Ask Kilian admin entries are inspect-only')
    expect(rag.add).not.toHaveBeenCalled()
    expect(ctx.runMutation).not.toHaveBeenCalled()
  })

  it('rejects disable and re-enable actions for retired admin rows', async () => {
    const { createDisableAdminKnowledgeEntryHandler, createReenableAdminKnowledgeEntryHandler } =
      await import('../askKilianKnowledge')
    const retiredEntry = existingEntry('admin:manual', {
      source: 'admin',
      status: 'retired',
      sourcePath: 'admin:/admin/ask-kilian',
      ragStatus: 'deleted',
    })
    const ctx = {
      runQuery: vi.fn(async () => [retiredEntry]),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = { add: vi.fn(), delete: vi.fn() }

    await expect(
      createDisableAdminKnowledgeEntryHandler({ rag: rag as never })(ctx, { stableKey: 'admin:manual' }),
    ).rejects.toThrow('Retired Ask Kilian admin entries are inspect-only')
    await expect(
      createReenableAdminKnowledgeEntryHandler({ rag: rag as never })(ctx, { stableKey: 'admin:manual' }),
    ).rejects.toThrow('Retired Ask Kilian admin entries are inspect-only')
    expect(rag.add).not.toHaveBeenCalled()
    expect(rag.delete).not.toHaveBeenCalled()
    expect(ctx.runMutation).not.toHaveBeenCalled()
  })
})

describe('Ask Kilian admin auth guard', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')
    vi.stubEnv('WORKOS_ORG_ID', 'org_good')
    vi.stubEnv('VERCEL_PROJECT_ID', 'prj_test')
    vi.stubEnv('AI_GATEWAY_API_KEY', 'ai-gateway-key')
    vi.stubEnv('ASK_KILIAN_CONVEX_ACCESS_TOKEN', '')
    mockGetAuthUser.mockReset()
  })

  it('rejects missing Convex identity', async () => {
    const { requireAskKilianAdmin } = await import('../askKilianKnowledge')
    const ctx = askKilianAdminCtx({ identity: null })

    await expect(requireAskKilianAdmin(ctx as never)).rejects.toThrow('Ask Kilian admin access denied')
    expect(mockGetAuthUser).not.toHaveBeenCalled()
  })

  it('rejects an AuthKit user id different from the Convex identity subject', async () => {
    const { requireAskKilianAdmin } = await import('../askKilianKnowledge')
    const ctx = askKilianAdminCtx({ authUser: { id: 'user_other', email: 'admin@example.com' } })

    await expect(requireAskKilianAdmin(ctx as never)).rejects.toThrow('Ask Kilian admin access denied')
  })

  it('rejects the wrong admin email', async () => {
    const { requireAskKilianAdmin } = await import('../askKilianKnowledge')
    const ctx = askKilianAdminCtx({ authUser: { id: 'user_admin', email: 'other@example.com' } })

    await expect(requireAskKilianAdmin(ctx as never)).rejects.toThrow('Ask Kilian admin access denied')
  })

  it('rejects the wrong WorkOS organization', async () => {
    const { requireAskKilianAdmin } = await import('../askKilianKnowledge')
    const ctx = askKilianAdminCtx({
      identity: askKilianAdminIdentity({ token: { claims: { org_id: 'org_bad' } } }),
    })

    await expect(requireAskKilianAdmin(ctx as never)).rejects.toThrow('Ask Kilian admin access denied')
  })

  it('rejects when the configured admin email or organization env is missing', async () => {
    const { requireAskKilianAdmin } = await import('../askKilianKnowledge')

    vi.stubEnv('ADMIN_EMAIL', '')
    await expect(requireAskKilianAdmin(askKilianAdminCtx() as never)).rejects.toThrow('Ask Kilian admin access denied')

    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')
    vi.stubEnv('WORKOS_ORG_ID', '')
    await expect(requireAskKilianAdmin(askKilianAdminCtx() as never)).rejects.toThrow('Ask Kilian admin access denied')
  })

  it('allows a valid Convex identity plus matching AuthKit user', async () => {
    const { requireAskKilianAdmin } = await import('../askKilianKnowledge')

    await expect(requireAskKilianAdmin(askKilianAdminCtx() as never)).resolves.toEqual({
      workosUserId: 'user_admin',
      workosOrgId: 'org_good',
      email: 'admin@example.com',
    })
  })

  it('admin UI ForAdmin action args omit accessToken and do not require ASK_KILIAN_CONVEX_ACCESS_TOKEN', async () => {
    const { listAdminKnowledgeEntriesForAdmin } = await import('../askKilianKnowledge')
    const projectedManualEntry = existingEntry('admin:manual', {
      source: 'admin',
      sourcePath: 'admin:/admin/ask-kilian',
    })
    delete (projectedManualEntry as Partial<typeof projectedManualEntry>).text
    const ctx = askKilianAdminCtx({
      runQuery: vi.fn(async () => [
        {
          ...projectedManualEntry,
          textSummary: 'admin:manual text',
          createdAt: 100,
          updatedAt: 200,
          retiredAt: undefined,
        },
      ]),
    })

    await expect(getActionHandler(listAdminKnowledgeEntriesForAdmin)(ctx, {})).resolves.toEqual([
      expect.objectContaining({
        stableKey: 'admin:manual',
        textSummary: 'admin:manual text',
        createdAt: 100,
        updatedAt: 200,
      }),
    ])
    const [row] = (await getActionHandler(listAdminKnowledgeEntriesForAdmin)(ctx, {})) as Array<Record<string, unknown>>
    expect(row).not.toHaveProperty('text')
    expect(ctx.runQuery).toHaveBeenCalled()
  })

  it('projects internal admin list rows with bounded summaries and without source text', async () => {
    const { listKnowledgeEntries } = await import('../askKilianKnowledge')
    const longText = `${'summary '.repeat(80)}tail`
    const collect = vi.fn(async () => [
      {
        ...existingEntry('admin:manual', {
          source: 'admin',
          sourcePath: 'admin:/admin/ask-kilian',
          text: longText,
        }),
        createdAt: 100,
        updatedAt: 200,
      },
    ])
    const ctx = {
      db: {
        query: vi.fn(() => ({ collect })),
      },
    }

    const result = (await getActionHandler(listKnowledgeEntries)(ctx, {})) as Array<Record<string, unknown>>
    expect(result).toHaveLength(1)
    const row = result[0]
    expect(row).toBeDefined()

    expect(row).not.toHaveProperty('text')
    expect(row?.textSummary).toEqual(longText.trim().replaceAll(/\s+/g, ' ').slice(0, 240))
    expect((row?.textSummary as string).length).toBeLessThanOrEqual(240)
  })

  it('runs the admin preview action without AI Gateway configuration', async () => {
    const { previewKnowledgeForAdmin } = await import('../askKilianKnowledge')
    vi.stubEnv('AI_GATEWAY_API_KEY', '')
    const ctx = askKilianAdminCtx({
      runQuery: vi.fn(async () => [
        incomingEntry('project:ask-kilian', {
          category: 'projects',
          title: 'Ask Kilian',
          text: 'Ask Kilian admin cockpit and retrieval preview context.',
        }),
      ]),
    })

    await expect(
      getActionHandler(previewKnowledgeForAdmin)(ctx, {
        query: 'admin cockpit',
        tier: 0,
        includeSpoilers: false,
        categories: ['projects'],
        limit: 4,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        stableKey: 'project:ask-kilian',
        score: 0.82,
      }),
    ])
  })

  it('rejects every public ForAdmin wrapper before Convex work when the admin identity is unauthorized', async () => {
    const {
      diffRepoKnowledgeForAdmin,
      disableAdminKnowledgeEntryForAdmin,
      getAdminKnowledgeEntryForAdmin,
      listAdminKnowledgeEntriesForAdmin,
      previewKnowledgeForAdmin,
      reenableAdminKnowledgeEntryForAdmin,
      saveAdminKnowledgeEntryForAdmin,
      searchKnowledgeForAdmin,
      syncRepoKnowledgeForAdmin,
      verifyRuntimeEnvForAdmin,
    } = await import('../askKilianKnowledge')
    const ctx = askKilianAdminCtx({ identity: null })
    const adminEntry = incomingEntry('admin:manual', {
      source: 'admin',
      sourcePath: 'admin:/admin/ask-kilian',
      category: 'fun',
    })
    const previewArgs = {
      query: 'hello',
      tier: 0,
      includeSpoilers: false,
      categories: ['fun'],
      limit: 4,
    }
    const cases = [
      [listAdminKnowledgeEntriesForAdmin, {}],
      [getAdminKnowledgeEntryForAdmin, { stableKey: 'admin:manual' }],
      [saveAdminKnowledgeEntryForAdmin, { entry: adminEntry }],
      [disableAdminKnowledgeEntryForAdmin, { stableKey: 'admin:manual' }],
      [reenableAdminKnowledgeEntryForAdmin, { stableKey: 'admin:manual' }],
      [diffRepoKnowledgeForAdmin, { entries: [incomingEntry('pet:lux')], isFullManifest: true }],
      [syncRepoKnowledgeForAdmin, { entries: [incomingEntry('pet:lux')], dryRun: false, isFullManifest: true }],
      [searchKnowledgeForAdmin, previewArgs],
      [previewKnowledgeForAdmin, previewArgs],
      [verifyRuntimeEnvForAdmin, {}],
    ] as const

    for (const [actionForAdmin, args] of cases) {
      await expect(getActionHandler(actionForAdmin)(ctx, args)).rejects.toThrow('Ask Kilian admin access denied')
    }

    expect(ctx.runQuery).not.toHaveBeenCalled()
    expect(ctx.runMutation).not.toHaveBeenCalled()
    expect(ctx.runAction).not.toHaveBeenCalled()
  })
})

describe('diffRepoKnowledgeEntries', () => {
  it('separates created, changed, unchanged, retired, and ignored admin rows', () => {
    const unchangedIncoming = incomingEntry('pet:lux', { contentHash: 'same-hash' })
    const changedIncoming = incomingEntry('pet:gwen', { contentHash: 'new-hash' })
    const reactivatedIncoming = incomingEntry('pet:gozer', { contentHash: 'inactive-hash' })
    const createdIncoming = incomingEntry('pet:new')
    const missingRagIncoming = incomingEntry('pet:missing-rag', { contentHash: 'same-hash' })
    const pendingRagIncoming = incomingEntry('pet:pending-rag', { contentHash: 'same-hash' })
    const oldFilterVersionIncoming = incomingEntry('pet:old-filter-version', { contentHash: 'same-hash' })
    const existing = [
      existingEntry('pet:lux', { contentHash: 'same-hash' }),
      existingEntry('pet:gwen', { contentHash: 'old-hash' }),
      existingEntry('pet:gozer', { contentHash: 'inactive-hash', status: 'disabled' }),
      existingEntry('pet:filter-migration', { contentHash: 'same-hash', ragFilterVersion: undefined }),
      existingEntry('pet:missing-rag', { contentHash: 'same-hash', ragEntryId: undefined }),
      existingEntry('pet:pending-rag', { contentHash: 'same-hash', ragStatus: 'pending' }),
      existingEntry('pet:old-filter-version', { contentHash: 'same-hash', ragFilterVersion: 1 }),
      existingEntry('pet:old'),
      existingEntry('admin:manual', { source: 'admin' }),
    ]
    const filterMigrationIncoming = incomingEntry('pet:filter-migration', { contentHash: 'same-hash' })

    const diff = diffRepoKnowledgeEntries(existing, [
      unchangedIncoming,
      changedIncoming,
      reactivatedIncoming,
      filterMigrationIncoming,
      missingRagIncoming,
      pendingRagIncoming,
      oldFilterVersionIncoming,
      createdIncoming,
    ])

    expect(diff.created).toEqual([createdIncoming])
    expect(diff.changed).toEqual([
      expect.objectContaining(changedIncoming),
      expect.objectContaining(reactivatedIncoming),
      expect.objectContaining(filterMigrationIncoming),
      expect.objectContaining(missingRagIncoming),
      expect.objectContaining(pendingRagIncoming),
      expect.objectContaining({
        ...oldFilterVersionIncoming,
        previousRagEntryId: 'rag:pet:old-filter-version',
        previousRagFilterVersion: 1,
      }),
    ])
    expect(diff.unchanged).toEqual([unchangedIncoming])
    expect(diff.retired).toEqual([existing[7]])
    expect(diff.ignoredAdmin).toEqual([existing[8]])
  })

  it('ignores admin rows and never retires them', () => {
    const adminRow = existingEntry('admin:manual', { source: 'admin' })

    const diff = diffRepoKnowledgeEntries([adminRow], [])

    expect(diff.retired).toEqual([])
    expect(diff.ignoredAdmin).toEqual([adminRow])
  })
})

describe('filterSearchEntriesForTier', () => {
  const entries = [
    incomingEntry('career:draftkings', { category: 'career', minTier: 0, spoilerLevel: 'none' }),
    incomingEntry('achievement:console-commander', {
      category: 'achievements',
      minTier: 1,
      spoilerLevel: 'hint',
    }),
    incomingEntry('fun:fake-private-facts', { category: 'fun', minTier: 2, spoilerLevel: 'none' }),
    incomingEntry('fun:spoiler', { category: 'fun', minTier: 1, spoilerLevel: 'spoiler' }),
    incomingEntry('pet:disabled', { status: 'disabled' }),
    incomingEntry('pet:retired', { status: 'retired' }),
  ]

  it('filters inactive and retired entries, tier gates, and spoiler-only entries', () => {
    expect(
      filterSearchEntriesForTier(entries, { tier: 0, includeSpoilers: false }).map(entry => entry.stableKey),
    ).toEqual(['career:draftkings'])
    expect(
      filterSearchEntriesForTier(entries, { tier: 1, includeSpoilers: false }).map(entry => entry.stableKey),
    ).toEqual(['career:draftkings', 'achievement:console-commander'])
    expect(
      filterSearchEntriesForTier(entries, { tier: 2, includeSpoilers: false }).map(entry => entry.stableKey),
    ).toEqual(['career:draftkings', 'achievement:console-commander', 'fun:fake-private-facts'])
  })

  it('includes spoiler entries only when includeSpoilers is true', () => {
    expect(
      filterSearchEntriesForTier(entries, { tier: 1, includeSpoilers: true }).map(entry => entry.stableKey),
    ).toEqual(['career:draftkings', 'achievement:console-commander', 'fun:spoiler'])
  })
})

describe('createSyncRepoKnowledgeHandler', () => {
  it('returns counts and keys without mutations or RAG calls in dry-run mode', async () => {
    const existing = [
      existingEntry('pet:lux', { contentHash: 'same-hash' }),
      existingEntry('pet:old'),
      existingEntry('admin:manual', { source: 'admin' }),
    ]
    const incoming = [incomingEntry('pet:lux', { contentHash: 'same-hash' }), incomingEntry('pet:gwen')]
    const ctx = {
      runQuery: vi.fn(async () => existing),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(),
      delete: vi.fn(),
    }

    const handler = createSyncRepoKnowledgeHandler({ rag })
    const result = await handler(ctx, { entries: incoming, dryRun: true })

    expect(result).toEqual({
      dryRun: true,
      counts: {
        created: 1,
        changed: 0,
        unchanged: 1,
        retired: 0,
        ignoredAdmin: 1,
      },
      keys: {
        created: ['pet:gwen'],
        changed: [],
        unchanged: ['pet:lux'],
        retired: [],
        ignoredAdmin: ['admin:manual'],
      },
    })
    expect(rag.add).not.toHaveBeenCalled()
    expect(rag.delete).not.toHaveBeenCalled()
    expect(ctx.runMutation).not.toHaveBeenCalled()
  })

  it('reports omitted repo entries in dry-run mode only when full-manifest deletion is asserted', async () => {
    const existing = [existingEntry('pet:lux', { contentHash: 'same-hash' }), existingEntry('pet:old')]
    const incoming = [incomingEntry('pet:lux', { contentHash: 'same-hash' })]
    const ctx = {
      runQuery: vi.fn(async () => existing),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(),
      delete: vi.fn(),
    }

    const handler = createSyncRepoKnowledgeHandler({ rag })
    const result = await handler(ctx, { entries: incoming, dryRun: true, isFullManifest: true })

    expect(result).toMatchObject({
      dryRun: true,
      counts: { created: 0, changed: 0, unchanged: 1, retired: 1 },
      keys: { unchanged: ['pet:lux'], retired: ['pet:old'] },
    })
    expect(rag.add).not.toHaveBeenCalled()
    expect(rag.delete).not.toHaveBeenCalled()
    expect(ctx.runMutation).not.toHaveBeenCalled()
  })

  it('does not retire omitted repo entries during non-dry-run partial syncs unless deletion is asserted', async () => {
    const existing = [
      existingEntry('pet:lux', { contentHash: 'same-hash' }),
      existingEntry('pet:old', { ragEntryId: 'rag-old' }),
    ]
    const incoming = [incomingEntry('pet:lux', { contentHash: 'same-hash' })]
    const ctx = {
      runQuery: vi.fn(async () => existing),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(),
      delete: vi.fn(),
    }

    const handler = createSyncRepoKnowledgeHandler({ rag: rag as never, now: () => 123 })
    const result = await handler(ctx, { entries: incoming, dryRun: false })

    expect(result).toMatchObject({
      dryRun: false,
      counts: { created: 0, changed: 0, unchanged: 1, retired: 0, ignoredAdmin: 0 },
      keys: { unchanged: ['pet:lux'], retired: [] },
    })
    expect(rag.add).not.toHaveBeenCalled()
    expect(rag.delete).not.toHaveBeenCalled()
    expect(ctx.runMutation).not.toHaveBeenCalledWith(expect.anything(), {
      stableKey: 'pet:old',
      now: 123,
      ragStatus: 'cleanupPending',
      pendingRagEntryCleanupIds: ['rag-old'],
    })
  })

  it('adds changed entries, cleans replaced RAG entries, and retires removed repo entries', async () => {
    const existing = [
      existingEntry('pet:lux', { contentHash: 'old-hash' }),
      existingEntry('pet:old', { ragEntryId: 'rag-old' }),
      existingEntry('admin:manual', { source: 'admin' }),
    ]
    const incoming = [incomingEntry('pet:lux', { contentHash: 'new-hash' })]
    const ctx = {
      runQuery: vi.fn(async () => existing),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(async () => ({
        entryId: 'rag-new',
        status: 'ready',
        created: true,
        replacedEntry: { entryId: 'rag-replaced' },
        usage: { tokens: 1 },
      })),
      delete: vi.fn(),
    }

    const handler = createSyncRepoKnowledgeHandler({ rag: rag as never, now: () => 123 })
    const result = await handler(ctx, { entries: incoming, dryRun: false, isFullManifest: true })

    expect(result).toMatchObject({
      dryRun: false,
      counts: { created: 0, changed: 1, unchanged: 0, retired: 1, ignoredAdmin: 1 },
      keys: { changed: ['pet:lux'], retired: ['pet:old'], ignoredAdmin: ['admin:manual'] },
    })
    expect(rag.add).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        namespace: 'public-site',
        key: 'pet:lux',
        title: 'pet:lux',
        text: 'pet:lux text',
        contentHash: 'new-hash',
        filterValues: [
          { name: 'category', value: 'pets' },
          { name: 'categoryStatus', value: 'pets:active' },
          { name: 'status', value: 'active' },
        ],
        metadata: expect.objectContaining({
          stableKey: 'pet:lux',
          source: 'repo',
          status: 'active',
          category: 'pets',
          contentHash: 'new-hash',
        }),
      }),
    )
    expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
      entry: incoming[0],
      ragEntryId: 'rag-new',
      ragStatus: 'ready',
      pendingRagEntryCleanupIds: ['rag-replaced'],
      now: 123,
    })
    expect(rag.delete).toHaveBeenCalledWith(ctx, { entryId: 'rag-replaced' })
    expect(rag.delete).toHaveBeenCalledWith(ctx, { entryId: 'rag-old' })
    const upsertCallOrder = ctx.runMutation.mock.invocationCallOrder[0]
    const replacedDeleteCallOrder = rag.delete.mock.invocationCallOrder[0]
    expect(upsertCallOrder).toBeDefined()
    expect(replacedDeleteCallOrder).toBeDefined()
    expect(upsertCallOrder ?? 0).toBeLessThan(replacedDeleteCallOrder ?? 0)
    expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
      stableKey: 'pet:lux',
      entryId: 'rag-replaced',
    })
    expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
      stableKey: 'pet:old',
      now: 123,
      ragStatus: 'cleanupPending',
      pendingRagEntryCleanupIds: ['rag-old'],
    })
    expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
      stableKey: 'pet:old',
      entryId: 'rag-old',
    })
    const markRetiredCallIndex = ctx.runMutation.mock.calls.findIndex(
      ([, args]) => args.stableKey === 'pet:old' && args.ragStatus === 'cleanupPending',
    )
    const retiredDeleteCallIndex = rag.delete.mock.calls.findIndex(([, args]) => args.entryId === 'rag-old')
    const markRetiredCallOrder = ctx.runMutation.mock.invocationCallOrder[markRetiredCallIndex]
    const retiredDeleteCallOrder = rag.delete.mock.invocationCallOrder[retiredDeleteCallIndex]
    expect(markRetiredCallOrder).toBeDefined()
    expect(retiredDeleteCallOrder).toBeDefined()
    expect(markRetiredCallOrder ?? 0).toBeLessThan(retiredDeleteCallOrder ?? 0)
  })

  it('does not mark non-ready RAG add results as synced', async () => {
    const incoming = [incomingEntry('pet:lux')]
    const ctx = {
      runQuery: vi.fn(async () => []),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(async () => ({
        entryId: 'rag-replaced',
        status: 'replaced',
        created: false,
        replacedEntry: null,
        usage: { tokens: 1 },
      })),
      delete: vi.fn(),
    }

    const handler = createSyncRepoKnowledgeHandler({ rag: rag as never })

    await expect(handler(ctx, { entries: incoming, dryRun: false })).rejects.toThrow(
      'Ask Kilian RAG entry pet:lux was not ready after sync; status=replaced',
    )
    expect(ctx.runMutation).not.toHaveBeenCalled()
  })

  it.each([1, undefined] as const)(
    'forces stale filter-version RAG rewrites before cleanup for version %s',
    async ragFilterVersion => {
      const existing = [existingEntry('pet:lux', { contentHash: 'same-hash', ragEntryId: 'rag-old', ragFilterVersion })]
      const incoming = [incomingEntry('pet:lux', { contentHash: 'same-hash' })]
      const ctx = {
        runQuery: vi.fn(async () => existing),
        runMutation: vi.fn(),
        runAction: vi.fn(),
      }
      const rag = {
        add: vi.fn(async () => ({
          entryId: 'rag-new',
          status: 'ready',
          created: true,
          replacedEntry: null,
          usage: { tokens: 1 },
        })),
        delete: vi.fn(),
      }

      const handler = createSyncRepoKnowledgeHandler({ rag: rag as never, now: () => 123 })
      await handler(ctx, { entries: incoming, dryRun: false })

      expect(rag.add).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({
          contentHash: 'same-hash:rag-filter-v2',
        }),
      )
      expect(rag.delete).toHaveBeenCalledWith(ctx, { entryId: 'rag-old' })
      expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
        entry: incoming[0],
        ragEntryId: 'rag-new',
        ragStatus: 'ready',
        pendingRagEntryCleanupIds: ['rag-old'],
        now: 123,
      })
      expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
        stableKey: 'pet:lux',
        entryId: 'rag-old',
      })
      const mutationCallOrder = ctx.runMutation.mock.invocationCallOrder[0]
      const deleteCallOrder = rag.delete.mock.invocationCallOrder[0]
      expect(mutationCallOrder).toBeDefined()
      expect(deleteCallOrder).toBeDefined()
      expect(mutationCallOrder ?? 0).toBeLessThan(deleteCallOrder ?? 0)
    },
  )

  it('persists and retries pending RAG cleanup ids when deletion fails after upsert', async () => {
    const existing = [
      existingEntry('pet:lux', {
        contentHash: 'same-hash',
        ragEntryId: 'rag-current',
        pendingRagEntryCleanupIds: ['rag-pending'],
      }),
    ]
    const incoming = [incomingEntry('pet:lux', { contentHash: 'same-hash' })]
    const ctx = {
      runQuery: vi.fn(async () => existing),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(),
      delete: vi.fn(async () => {
        throw new Error('delete failed')
      }),
    }

    const handler = createSyncRepoKnowledgeHandler({ rag: rag as never, now: () => 123 })

    await expect(handler(ctx, { entries: incoming, dryRun: false })).rejects.toThrow('delete failed')
    expect(rag.add).not.toHaveBeenCalled()
    expect(rag.delete).toHaveBeenCalledWith(ctx, { entryId: 'rag-pending' })
    expect(ctx.runMutation).not.toHaveBeenCalled()
  })

  it('records replacement cleanup ids before delete so failed post-upsert cleanup can retry', async () => {
    const existing = [existingEntry('pet:lux', { contentHash: 'old-hash' })]
    const incoming = [incomingEntry('pet:lux', { contentHash: 'new-hash' })]
    const ctx = {
      runQuery: vi.fn(async () => existing),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(async () => ({
        entryId: 'rag-new',
        status: 'ready',
        created: true,
        replacedEntry: { entryId: 'rag-replaced' },
        usage: { tokens: 1 },
      })),
      delete: vi.fn(async () => {
        throw new Error('delete failed')
      }),
    }

    const handler = createSyncRepoKnowledgeHandler({ rag: rag as never, now: () => 123 })

    await expect(handler(ctx, { entries: incoming, dryRun: false })).rejects.toThrow('delete failed')
    expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
      entry: incoming[0],
      ragEntryId: 'rag-new',
      ragStatus: 'ready',
      pendingRagEntryCleanupIds: ['rag-replaced'],
      now: 123,
    })
    expect(rag.delete).toHaveBeenCalledWith(ctx, { entryId: 'rag-replaced' })
  })

  it('does not cleanup the current RAG entry when replacement metadata points at the new entry', async () => {
    const existing = [existingEntry('pet:lux', { contentHash: 'old-hash' })]
    const incoming = [incomingEntry('pet:lux', { contentHash: 'new-hash' })]
    const ctx = {
      runQuery: vi.fn(async () => existing),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(async () => ({
        entryId: 'rag-new',
        status: 'ready',
        created: true,
        replacedEntry: { entryId: 'rag-new' },
        usage: { tokens: 1 },
      })),
      delete: vi.fn(),
    }

    const handler = createSyncRepoKnowledgeHandler({ rag: rag as never, now: () => 123 })
    await handler(ctx, { entries: incoming, dryRun: false })

    expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
      entry: incoming[0],
      ragEntryId: 'rag-new',
      ragStatus: 'ready',
      pendingRagEntryCleanupIds: [],
      now: 123,
    })
    expect(rag.delete).not.toHaveBeenCalledWith(ctx, { entryId: 'rag-new' })
  })

  it('clears pending cleanup ids when retry finds the RAG entry already deleted', async () => {
    const existing = [
      existingEntry('pet:lux', {
        contentHash: 'same-hash',
        ragEntryId: 'rag-current',
        pendingRagEntryCleanupIds: ['rag-pending'],
      }),
    ]
    const incoming = [incomingEntry('pet:lux', { contentHash: 'same-hash' })]
    const ctx = {
      runQuery: vi.fn(async () => existing),
      runMutation: vi.fn().mockRejectedValueOnce(new Error('clear failed')).mockResolvedValueOnce(null),
      runAction: vi.fn(),
    }
    const rag = {
      add: vi.fn(),
      delete: vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('entry not found')),
    }

    const handler = createSyncRepoKnowledgeHandler({ rag: rag as never, now: () => 123 })

    await expect(handler(ctx, { entries: incoming, dryRun: false })).rejects.toThrow('clear failed')
    await handler(ctx, { entries: incoming, dryRun: false })

    expect(rag.add).not.toHaveBeenCalled()
    expect(ctx.runMutation).toHaveBeenLastCalledWith(expect.anything(), {
      stableKey: 'pet:lux',
      entryId: 'rag-pending',
    })
  })
})

describe('createDiffRepoKnowledgeHandler', () => {
  it('returns a full-manifest dry-run diff without mutations or RAG dependencies', async () => {
    const existing = [
      existingEntry('pet:lux', { contentHash: 'same-hash' }),
      existingEntry('pet:gwen', { contentHash: 'old-hash' }),
      existingEntry('pet:old'),
      existingEntry('admin:manual', { source: 'admin' }),
    ]
    const incoming = [
      incomingEntry('pet:lux', { contentHash: 'same-hash' }),
      incomingEntry('pet:gwen', { contentHash: 'new-hash' }),
      incomingEntry('pet:new'),
    ]
    const ctx = {
      runQuery: vi.fn(async () => existing),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }

    const handler = createDiffRepoKnowledgeHandler()
    const result = await handler(ctx, { entries: incoming, isFullManifest: true })

    expect(result).toEqual({
      dryRun: true,
      counts: {
        created: 1,
        changed: 1,
        unchanged: 1,
        retired: 1,
        ignoredAdmin: 1,
      },
      keys: {
        created: ['pet:new'],
        changed: ['pet:gwen'],
        unchanged: ['pet:lux'],
        retired: ['pet:old'],
        ignoredAdmin: ['admin:manual'],
      },
    })
    expect(ctx.runQuery).toHaveBeenCalledOnce()
    expect(ctx.runMutation).not.toHaveBeenCalled()
    expect(ctx.runAction).not.toHaveBeenCalled()
  })

  it('does not report retired entries for partial no-embedding diffs', async () => {
    const existing = [existingEntry('pet:lux', { contentHash: 'same-hash' }), existingEntry('pet:old')]
    const incoming = [incomingEntry('pet:lux', { contentHash: 'same-hash' })]
    const ctx = {
      runQuery: vi.fn(async () => existing),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }

    const handler = createDiffRepoKnowledgeHandler()
    const result = await handler(ctx, { entries: incoming })

    expect(result).toMatchObject({
      dryRun: true,
      counts: { created: 0, changed: 0, unchanged: 1, retired: 0, ignoredAdmin: 0 },
      keys: { unchanged: ['pet:lux'], retired: [] },
    })
    expect(ctx.runQuery).toHaveBeenCalledOnce()
    expect(ctx.runMutation).not.toHaveBeenCalled()
    expect(ctx.runAction).not.toHaveBeenCalled()
  })
})

describe('upsertSyncedKnowledgeEntry', () => {
  it('persists the current RAG filter version and pending cleanup ids on insert and patch', async () => {
    const entry = incomingEntry('pet:lux')
    const unique = vi.fn()
    const query = vi.fn(() => ({
      withIndex: vi.fn((_name, callback) => {
        callback({ eq: vi.fn() })
        return { unique }
      }),
    }))
    const insert = vi.fn()
    const patch = vi.fn()
    const ctx = { db: { query, insert, patch } }
    const handler = getActionHandler(upsertSyncedKnowledgeEntry)

    unique.mockResolvedValueOnce(null)
    await handler(ctx, {
      entry,
      ragEntryId: 'rag-new',
      ragStatus: 'ready',
      pendingRagEntryCleanupIds: ['rag-old'],
      now: 123,
    })

    expect(insert).toHaveBeenCalledWith(
      'askKilianKnowledgeEntries',
      expect.objectContaining({
        stableKey: 'pet:lux',
        ragEntryId: 'rag-new',
        ragStatus: 'ready',
        ragFilterVersion: ASK_KILIAN_RAG_FILTER_VERSION,
        pendingRagEntryCleanupIds: ['rag-old'],
        createdAt: 123,
        updatedAt: 123,
      }),
    )

    unique.mockResolvedValueOnce({
      _id: 'row-id',
      ...entry,
      pendingRagEntryCleanupIds: ['rag-existing'],
    })
    await handler(ctx, {
      entry,
      ragEntryId: 'rag-newer',
      ragStatus: 'ready',
      pendingRagEntryCleanupIds: ['rag-old'],
      now: 456,
    })

    expect(patch).toHaveBeenCalledWith(
      'row-id',
      expect.objectContaining({
        ragEntryId: 'rag-newer',
        ragStatus: 'ready',
        ragFilterVersion: ASK_KILIAN_RAG_FILTER_VERSION,
        pendingRagEntryCleanupIds: ['rag-existing', 'rag-old'],
        updatedAt: 456,
      }),
    )
  })
})

describe('clearPendingRagEntryCleanupId', () => {
  it('marks disabled entries deleted after the final pending cleanup id is cleared', async () => {
    const unique = vi.fn(async () => ({
      _id: 'row-id',
      ...existingEntry('admin:manual', {
        source: 'admin',
        status: 'disabled',
        ragEntryId: undefined,
        ragStatus: 'cleanupPending',
      }),
      pendingRagEntryCleanupIds: ['rag-old'],
    }))
    const query = vi.fn(() => ({
      withIndex: vi.fn((_name, callback) => {
        callback({ eq: vi.fn() })
        return { unique }
      }),
    }))
    const patch = vi.fn()
    const ctx = { db: { query, patch } }
    const handler = getActionHandler(clearPendingRagEntryCleanupId)

    await handler(ctx, { stableKey: 'admin:manual', entryId: 'rag-old' })

    expect(patch).toHaveBeenCalledWith('row-id', {
      pendingRagEntryCleanupIds: [],
      ragStatus: 'deleted',
    })
  })
})

describe('knowledge entry projections', () => {
  it('includes lifecycle timestamps in admin list and detail projections', async () => {
    const { listKnowledgeEntries, listKnowledgeEntriesByStableKey } = await import('../askKilianKnowledge')
    const row = {
      _id: 'row-id',
      _creationTime: 1,
      ...existingEntry('admin:manual', {
        source: 'admin',
        sourcePath: 'admin:/admin/ask-kilian',
        status: 'retired',
      }),
      createdAt: 100,
      updatedAt: 200,
      retiredAt: 300,
    }
    const query = vi.fn(() => ({
      collect: vi.fn(async () => [row]),
      withIndex: vi.fn((_name, callback) => {
        callback({ eq: vi.fn() })
        return { unique: vi.fn(async () => row) }
      }),
    }))
    const ctx = { db: { query } }

    await expect(getActionHandler(listKnowledgeEntries)(ctx, {})).resolves.toEqual([
      expect.objectContaining({
        stableKey: 'admin:manual',
        createdAt: 100,
        updatedAt: 200,
        retiredAt: 300,
      }),
    ])
    await expect(
      getActionHandler(listKnowledgeEntriesByStableKey)(ctx, { stableKeys: ['admin:manual'] }),
    ).resolves.toEqual([
      expect.objectContaining({
        stableKey: 'admin:manual',
        text: 'admin:manual text',
        createdAt: 100,
        updatedAt: 200,
        retiredAt: 300,
      }),
    ])
  })
})

describe('shapeSearchKnowledgeResults', () => {
  it('applies tier and category filters after RAG search results', () => {
    const rows = [
      incomingEntry('career:draftkings', { category: 'career', title: 'DraftKings', text: 'SRE at DraftKings' }),
      incomingEntry('pet:lux', { category: 'pets', title: 'Lux', text: 'Golden Retriever' }),
      incomingEntry('fun:fake-private-facts', { category: 'fun', minTier: 2, title: 'Fake lore' }),
    ]
    const ragEntries = [
      { metadata: { stableKey: 'pet:lux' }, text: 'rag pet text', score: 0.91 },
      { metadata: { stableKey: 'career:draftkings' }, text: 'rag career text', score: 0.89 },
      { metadata: { stableKey: 'fun:fake-private-facts' }, text: 'rag fun text', score: 0.88 },
    ]

    expect(
      shapeSearchKnowledgeResults(ragEntries, rows, {
        tier: 1,
        includeSpoilers: false,
        categories: ['pets'],
      }),
    ).toEqual([
      {
        stableKey: 'pet:lux',
        title: 'Lux',
        category: 'pets',
        score: 0.91,
        text: 'rag pet text',
      },
    ])
  })

  it('deduplicates repeated RAG entries by best score', () => {
    const rows = [
      incomingEntry('pet:lux', { category: 'pets', title: 'Lux', text: 'Golden Retriever' }),
      incomingEntry('career:draftkings', { category: 'career', title: 'DraftKings', text: 'SRE at DraftKings' }),
    ]
    const ragEntries = [
      { metadata: { stableKey: 'pet:lux' }, score: 0.4 },
      { metadata: { stableKey: 'career:draftkings' }, score: 0.9 },
      { metadata: { stableKey: 'pet:lux' }, score: 0.95 },
    ]

    expect(
      shapeSearchKnowledgeResults(ragEntries, rows, {
        tier: 1,
        includeSpoilers: false,
      }),
    ).toEqual([
      {
        stableKey: 'pet:lux',
        title: 'Lux',
        category: 'pets',
        score: 0.95,
        text: 'Golden Retriever',
      },
      {
        stableKey: 'career:draftkings',
        title: 'DraftKings',
        category: 'career',
        score: 0.9,
        text: 'SRE at DraftKings',
      },
    ])
  })

  it('returns bounded RAG context text instead of the full stored entry text', () => {
    const fullText = 'stored '.repeat(500)
    const ragContext = 'rag context '.repeat(200)
    const rows = [incomingEntry('pet:lux', { category: 'pets', title: 'Lux', text: fullText })]
    const ragEntries = [{ metadata: { stableKey: 'pet:lux' }, text: ragContext, score: 0.95 }]

    expect(
      shapeSearchKnowledgeResults(ragEntries, rows, {
        tier: 1,
        includeSpoilers: false,
      }),
    ).toEqual([
      {
        stableKey: 'pet:lux',
        title: 'Lux',
        category: 'pets',
        score: 0.95,
        text: ragContext.slice(0, 1600),
      },
    ])
  })

  it('ignores stale RAG entries for the same stable key while cleanup is pending', () => {
    const rows = [
      {
        ...incomingEntry('pet:lux', {
          category: 'pets',
          title: 'Lux',
          text: 'current stored text',
        }),
        ragEntryId: 'rag-current',
      },
    ]
    const ragEntries = [
      { entryId: 'rag-old', metadata: { stableKey: 'pet:lux' }, text: 'stale higher score', score: 0.99 },
      { entryId: 'rag-current', metadata: { stableKey: 'pet:lux' }, text: 'current lower score', score: 0.5 },
    ]

    expect(
      shapeSearchKnowledgeResults(ragEntries, rows, {
        tier: 1,
        includeSpoilers: false,
      }),
    ).toEqual([
      {
        stableKey: 'pet:lux',
        title: 'Lux',
        category: 'pets',
        score: 0.5,
        text: 'current lower score',
      },
    ])
  })
})

describe('createSearchKnowledgeHandler', () => {
  it('runs one category-scoped RAG search and post-filters metadata rows', async () => {
    const rows = [
      incomingEntry('pet:lux', { category: 'pets', title: 'Lux', text: 'Golden Retriever' }),
      incomingEntry('career:draftkings', { category: 'career', title: 'DraftKings', text: 'SRE at DraftKings' }),
      incomingEntry('pet:hidden-spoiler', {
        category: 'pets',
        title: 'Hidden',
        text: 'Spoiler',
        spoilerLevel: 'spoiler',
      }),
      incomingEntry('pet:disabled', { category: 'pets', title: 'Disabled', text: 'Disabled', status: 'disabled' }),
    ]
    const search = vi.fn().mockResolvedValueOnce({
      results: [
        { entryId: 'rag-pet', score: 0.93 },
        { entryId: 'rag-career', score: 0.9 },
      ],
      entries: [
        { entryId: 'rag-pet', metadata: { stableKey: 'pet:lux' } },
        { entryId: 'rag-disabled', metadata: { stableKey: 'pet:disabled' }, score: 0.92 },
        { entryId: 'rag-career', metadata: { stableKey: 'career:draftkings' } },
      ],
    })
    const ctx = {
      runQuery: vi.fn(async () => rows),
    }

    const handler = createSearchKnowledgeHandler({ rag: { search } })
    const result = await handler(ctx, {
      query: 'tell me about pets and work',
      tier: 0,
      includeSpoilers: false,
      categories: ['pets', 'career'],
      limit: 8,
    })

    expect(search).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        filters: [
          { name: 'categoryStatus', value: 'pets:active' },
          { name: 'categoryStatus', value: 'career:active' },
        ],
      }),
    )
    expect(search.mock.calls.flatMap(([, args]) => args.filters)).not.toContainEqual({
      name: 'status',
      value: 'active',
    })
    expect(result).toEqual([
      {
        stableKey: 'pet:lux',
        title: 'Lux',
        category: 'pets',
        score: 0.93,
        text: 'Golden Retriever',
      },
      {
        stableKey: 'career:draftkings',
        title: 'DraftKings',
        category: 'career',
        score: 0.9,
        text: 'SRE at DraftKings',
      },
    ])
  })

  it('normalizes search input before calling RAG', async () => {
    const categories = [
      'pets',
      'pets',
      'career',
      'projects',
      'quickfacts',
      'site',
      'achievements',
      'themes',
      'persona',
      'fun',
    ] as const
    const longQuery = `  ${'x'.repeat(1200)}  `
    const search = vi.fn(async () => emptyRagSearchResult())
    const ctx = { runQuery: vi.fn(async () => []) }
    const handler = createSearchKnowledgeHandler({ rag: { search } })

    await handler(ctx, {
      query: longQuery,
      tier: 0,
      categories: [...categories],
      limit: 99,
    })

    expect(search).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        query: 'x'.repeat(1000),
        limit: 36,
        filters: [
          { name: 'categoryStatus', value: 'pets:active' },
          { name: 'categoryStatus', value: 'career:active' },
          { name: 'categoryStatus', value: 'projects:active' },
          { name: 'categoryStatus', value: 'quickfacts:active' },
          { name: 'categoryStatus', value: 'site:active' },
          { name: 'categoryStatus', value: 'achievements:active' },
          { name: 'categoryStatus', value: 'themes:active' },
          { name: 'categoryStatus', value: 'persona:active' },
          { name: 'categoryStatus', value: 'fun:active' },
        ],
      }),
    )
  })

  it('short-circuits blank queries and clamps non-positive limits before RAG search', async () => {
    const search = vi.fn(async () => emptyRagSearchResult())
    const ctx = { runQuery: vi.fn(async () => []) }
    const handler = createSearchKnowledgeHandler({ rag: { search } })

    await expect(handler(ctx, { query: '   ', tier: 0, limit: -10 })).resolves.toEqual([])
    expect(search).not.toHaveBeenCalled()

    await handler(ctx, { query: 'hello', tier: 0, limit: -10 })
    expect(search).toHaveBeenCalledWith(ctx, expect.objectContaining({ limit: 3 }))
  })

  it('supplements RAG results with lexical matches for proper-name queries', async () => {
    const rows = [
      incomingEntry('career:draftkings', {
        category: 'career',
        title: 'DraftKings',
        text: 'Senior Site Reliability Engineer at DraftKings',
      }),
      incomingEntry('persona:ask-kilian-voice', {
        category: 'persona',
        title: 'Ask Kilian voice',
        text: 'Talks like Kilian without knowing private facts.',
      }),
    ]
    const search = vi.fn(async () => emptyRagSearchResult())
    const ctx = { runQuery: vi.fn(async () => rows) }
    const handler = createSearchKnowledgeHandler({ rag: { search } })

    const result = await handler(ctx, {
      query: 'What did Kilian do at DraftKings?',
      tier: 0,
      includeSpoilers: false,
      limit: 8,
    })

    expect(result.map(entry => entry.stableKey)).toEqual(['career:draftkings'])
  })

  it('applies tier gates to lexical-only matches', async () => {
    const rows = [
      incomingEntry('fun:fake-private-facts', {
        category: 'fun',
        minTier: 2,
        title: 'Fake private facts',
        text: 'Use obvious fake answers for private facts.',
      }),
    ]
    const search = vi.fn(async () => emptyRagSearchResult())
    const ctx = { runQuery: vi.fn(async () => rows) }
    const handler = createSearchKnowledgeHandler({ rag: { search } })
    const args = {
      query: 'What fake answer should be used for private facts?',
      includeSpoilers: false,
      limit: 8,
    }

    await expect(handler(ctx, { ...args, tier: 0 })).resolves.toEqual([])
    await expect(handler(ctx, { ...args, tier: 2 })).resolves.toEqual([
      expect.objectContaining({ stableKey: 'fun:fake-private-facts' }),
    ])
  })

  it('caps returned results to the caller limit after overfetching', async () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      incomingEntry(`pet:${index}`, { category: 'pets', title: `Pet ${index}`, text: `Pet ${index}` }),
    )
    const search = vi.fn(async () => ({
      results: rows.map((row, index) => ({
        entryId: `rag-${index}`,
        order: index,
        content: [{ text: row.text }],
        startOrder: index,
        score: 1 - index / 10,
      })),
      entries: rows.map((row, index) => ({ entryId: `rag-${index}`, metadata: { stableKey: row.stableKey } })),
      text: '',
      usage: { tokens: 0 },
    }))
    const ctx = { runQuery: vi.fn(async () => rows) }
    const handler = createSearchKnowledgeHandler({ rag: { search: search as never } })

    const result = await handler(ctx, { query: 'pets', tier: 0, limit: 2 })

    expect(search).toHaveBeenCalledWith(ctx, expect.objectContaining({ limit: 6 }))
    expect(result.map(entry => entry.stableKey)).toEqual(['pet:0', 'pet:1'])
  })
})

describe('createPreviewKnowledgeHandler', () => {
  it('uses lexical stored-row matching without calling RAG search', async () => {
    const rows = [
      incomingEntry('project:ask-kilian', {
        category: 'projects',
        title: 'Ask Kilian',
        text: 'Ask Kilian admin cockpit and retrieval preview context.',
      }),
      incomingEntry('pet:lux', { category: 'pets', title: 'Lux', text: 'Golden Retriever' }),
    ]
    const ctx = { runQuery: vi.fn(async () => rows) }
    const handler = createPreviewKnowledgeHandler()

    await expect(
      handler(ctx, {
        query: 'admin cockpit',
        tier: 0,
        includeSpoilers: false,
        categories: ['projects'],
        limit: 8,
      }),
    ).resolves.toEqual([
      {
        stableKey: 'project:ask-kilian',
        title: 'Ask Kilian',
        category: 'projects',
        score: 0.82,
        text: 'Ask Kilian admin cockpit and retrieval preview context.',
      },
    ])
    expect(ctx.runQuery).toHaveBeenCalledWith(internal.askKilianKnowledge.listSearchableKnowledgeEntries, {})
  })
})

describe('generated API exposure', () => {
  it('keeps raw sync, search, and metadata listing internal-only behind guarded public wrappers', () => {
    expect(internal.askKilianKnowledge.syncRepoKnowledge).toBeDefined()
    expect(internal.askKilianKnowledge.searchKnowledge).toBeDefined()
    expect(internal.askKilianKnowledge.listKnowledgeEntries).toBeDefined()
    expect(internal.askKilianKnowledge.listSearchableKnowledgeEntries).toBeDefined()
    expect(api.askKilianKnowledge.syncRepoKnowledgeForServer).toBeDefined()
    expect(api.askKilianKnowledge.diffRepoKnowledgeForServer).toBeDefined()
    expect(api.askKilianKnowledge.searchKnowledgeForServer).toBeDefined()
    expect(api.askKilianKnowledge.verifyRuntimeEnvForServer).toBeDefined()
    expect(api.askKilianKnowledge.listAdminKnowledgeEntriesForAdmin).toBeDefined()
    expect(api.askKilianKnowledge.getAdminKnowledgeEntryForAdmin).toBeDefined()
    expect(api.askKilianKnowledge.saveAdminKnowledgeEntryForAdmin).toBeDefined()
    expect(api.askKilianKnowledge.disableAdminKnowledgeEntryForAdmin).toBeDefined()
    expect(api.askKilianKnowledge.reenableAdminKnowledgeEntryForAdmin).toBeDefined()
    expect(api.askKilianKnowledge.diffRepoKnowledgeForAdmin).toBeDefined()
    expect(api.askKilianKnowledge.syncRepoKnowledgeForAdmin).toBeDefined()
    expect(api.askKilianKnowledge.searchKnowledgeForAdmin).toBeDefined()
    expect(api.askKilianKnowledge.previewKnowledgeForAdmin).toBeDefined()
    expect(api.askKilianKnowledge.verifyRuntimeEnvForAdmin).toBeDefined()
  })
})

describe('server action guards', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_PROJECT_ID', 'prj_test')
  })

  it('blocks guarded public wrappers before touching Convex work when token is invalid', async () => {
    vi.stubEnv('ASK_KILIAN_CONVEX_ACCESS_TOKEN', 'server-token')
    vi.stubEnv('AI_GATEWAY_API_KEY', 'ai-gateway-key')
    const syncCtx = { runQuery: vi.fn(), runMutation: vi.fn(), runAction: vi.fn() }
    const diffCtx = { runQuery: vi.fn(), runMutation: vi.fn(), runAction: vi.fn() }
    const searchCtx = { runQuery: vi.fn() }

    await expect(
      getActionHandler(syncRepoKnowledgeForServer)(syncCtx, {
        accessToken: 'wrong-token',
        entries: [],
        dryRun: true,
      }),
    ).rejects.toThrow('Invalid Ask Kilian server action access token')
    await expect(
      getActionHandler(diffRepoKnowledgeForServer)(diffCtx, {
        accessToken: 'wrong-token',
        entries: [],
      }),
    ).rejects.toThrow('Invalid Ask Kilian server action access token')
    await expect(
      getActionHandler(searchKnowledgeForServer)(searchCtx, {
        accessToken: 'wrong-token',
        query: 'hello',
        tier: 0,
      }),
    ).rejects.toThrow('Invalid Ask Kilian server action access token')

    expect(syncCtx.runQuery).not.toHaveBeenCalled()
    expect(syncCtx.runMutation).not.toHaveBeenCalled()
    expect(diffCtx.runQuery).not.toHaveBeenCalled()
    expect(diffCtx.runMutation).not.toHaveBeenCalled()
    expect(searchCtx.runQuery).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('rejects guarded public wrappers when the deployment token is missing or placeholder', async () => {
    const ctx = { runQuery: vi.fn(), runMutation: vi.fn(), runAction: vi.fn() }
    vi.stubEnv('AI_GATEWAY_API_KEY', 'ai-gateway-key')

    vi.stubEnv('ASK_KILIAN_CONVEX_ACCESS_TOKEN', '')
    await expect(
      getActionHandler(syncRepoKnowledgeForServer)(ctx, {
        accessToken: 'server-token',
        entries: [],
        dryRun: true,
      }),
    ).rejects.toThrow('Missing ASK_KILIAN_CONVEX_ACCESS_TOKEN for Ask Kilian server actions')

    vi.stubEnv('ASK_KILIAN_CONVEX_ACCESS_TOKEN', 'replace-with-ask-kilian-token')
    await expect(
      getActionHandler(syncRepoKnowledgeForServer)(ctx, {
        accessToken: 'replace-with-ask-kilian-token',
        entries: [],
        dryRun: true,
      }),
    ).rejects.toThrow('Replace placeholder ASK_KILIAN_CONVEX_ACCESS_TOKEN for Ask Kilian server actions')

    expect(ctx.runQuery).not.toHaveBeenCalled()
    expect(ctx.runMutation).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('allows the guarded public sync wrapper with the configured token', async () => {
    vi.stubEnv('ASK_KILIAN_CONVEX_ACCESS_TOKEN', 'server-token')
    vi.stubEnv('AI_GATEWAY_API_KEY', 'ai-gateway-key')
    const ctx = { runQuery: vi.fn(async () => []), runMutation: vi.fn(), runAction: vi.fn() }

    const result = await getActionHandler(syncRepoKnowledgeForServer)(ctx, {
      accessToken: 'server-token',
      entries: [],
      dryRun: true,
    })

    expect(result).toMatchObject({ dryRun: true, counts: { created: 0 } })
    expect(ctx.runQuery).toHaveBeenCalled()
    expect(ctx.runMutation).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('allows the guarded public diff wrapper without an AI Gateway key and only runs queries', async () => {
    vi.stubEnv('ASK_KILIAN_CONVEX_ACCESS_TOKEN', 'server-token')
    vi.stubEnv('AI_GATEWAY_API_KEY', '')
    vi.stubEnv('VERCEL_PROJECT_ID', '')
    const ctx = {
      runQuery: vi.fn(async () => [existingEntry('pet:lux', { contentHash: 'same-hash' })]),
      runMutation: vi.fn(),
      runAction: vi.fn(),
    }

    const result = await getActionHandler(diffRepoKnowledgeForServer)(ctx, {
      accessToken: 'server-token',
      entries: [incomingEntry('pet:lux', { contentHash: 'same-hash' })],
    })

    expect(result).toMatchObject({
      dryRun: true,
      counts: { created: 0, changed: 0, unchanged: 1, retired: 0, ignoredAdmin: 0 },
      keys: { unchanged: ['pet:lux'], retired: [] },
    })
    expect(ctx.runQuery).toHaveBeenCalledOnce()
    expect(ctx.runMutation).not.toHaveBeenCalled()
    expect(ctx.runAction).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('rejects unsafe public full-manifest syncs before Convex work', async () => {
    vi.stubEnv('ASK_KILIAN_CONVEX_ACCESS_TOKEN', 'server-token')
    vi.stubEnv('AI_GATEWAY_API_KEY', 'ai-gateway-key')
    const ctx = { runQuery: vi.fn(), runMutation: vi.fn(), runAction: vi.fn() }

    await expect(
      getActionHandler(syncRepoKnowledgeForServer)(ctx, {
        accessToken: 'server-token',
        entries: [incomingEntry('pet:lux')],
        dryRun: false,
        isFullManifest: true,
      }),
    ).rejects.toThrow('Ask Kilian full-manifest sync built only 1 entries; refusing sync below 10')

    expect(ctx.runQuery).not.toHaveBeenCalled()
    expect(ctx.runMutation).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('rejects unsafe public full-manifest diffs before Convex work', async () => {
    vi.stubEnv('ASK_KILIAN_CONVEX_ACCESS_TOKEN', 'server-token')
    const ctx = { runQuery: vi.fn(), runMutation: vi.fn(), runAction: vi.fn() }

    await expect(
      getActionHandler(diffRepoKnowledgeForServer)(ctx, {
        accessToken: 'server-token',
        entries: [incomingEntry('pet:lux')],
        isFullManifest: true,
      }),
    ).rejects.toThrow('Ask Kilian full-manifest diff built only 1 entries; refusing diff below 10')

    expect(ctx.runQuery).not.toHaveBeenCalled()
    expect(ctx.runMutation).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('blocks guarded public RAG wrappers when Gateway project attribution is missing', async () => {
    vi.stubEnv('ASK_KILIAN_CONVEX_ACCESS_TOKEN', 'server-token')
    vi.stubEnv('AI_GATEWAY_API_KEY', 'ai-gateway-key')
    vi.stubEnv('VERCEL_PROJECT_ID', '')
    const syncCtx = { runQuery: vi.fn(), runMutation: vi.fn(), runAction: vi.fn() }
    const searchCtx = { runQuery: vi.fn() }

    await expect(
      getActionHandler(syncRepoKnowledgeForServer)(syncCtx, {
        accessToken: 'server-token',
        entries: [],
        dryRun: true,
      }),
    ).rejects.toThrow('Missing VERCEL_PROJECT_ID for Ask Kilian Gateway project attribution')
    await expect(
      getActionHandler(searchKnowledgeForServer)(searchCtx, {
        accessToken: 'server-token',
        query: 'hello',
        tier: 0,
      }),
    ).rejects.toThrow('Missing VERCEL_PROJECT_ID for Ask Kilian Gateway project attribution')

    expect(syncCtx.runQuery).not.toHaveBeenCalled()
    expect(syncCtx.runMutation).not.toHaveBeenCalled()
    expect(searchCtx.runQuery).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('blocks guarded public RAG wrappers before Convex work when the AI Gateway key is missing or placeholder', async () => {
    vi.stubEnv('ASK_KILIAN_CONVEX_ACCESS_TOKEN', 'server-token')
    const syncCtx = { runQuery: vi.fn(), runMutation: vi.fn(), runAction: vi.fn() }
    const searchCtx = { runQuery: vi.fn() }

    vi.stubEnv('AI_GATEWAY_API_KEY', '')
    await expect(
      getActionHandler(syncRepoKnowledgeForServer)(syncCtx, {
        accessToken: 'server-token',
        entries: [],
        dryRun: true,
      }),
    ).rejects.toThrow('Missing AI_GATEWAY_API_KEY for Ask Kilian runtime verification')
    await expect(
      getActionHandler(searchKnowledgeForServer)(searchCtx, {
        accessToken: 'server-token',
        query: 'hello',
        tier: 0,
      }),
    ).rejects.toThrow('Missing AI_GATEWAY_API_KEY for Ask Kilian runtime verification')

    vi.stubEnv('AI_GATEWAY_API_KEY', 'replace-with-ai-gateway-api-key')
    await expect(
      getActionHandler(syncRepoKnowledgeForServer)(syncCtx, {
        accessToken: 'server-token',
        entries: [],
        dryRun: true,
      }),
    ).rejects.toThrow('Replace placeholder AI_GATEWAY_API_KEY for Ask Kilian runtime verification')

    expect(syncCtx.runQuery).not.toHaveBeenCalled()
    expect(syncCtx.runMutation).not.toHaveBeenCalled()
    expect(searchCtx.runQuery).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('verifies Convex runtime env through a guarded public wrapper', async () => {
    vi.stubEnv('ASK_KILIAN_CONVEX_ACCESS_TOKEN', 'server-token')
    vi.stubEnv('AI_GATEWAY_API_KEY', 'ai-gateway-key')

    await expect(getActionHandler(verifyRuntimeEnvForServer)({}, { accessToken: 'wrong-token' })).rejects.toThrow(
      'Invalid Ask Kilian server action access token',
    )

    await expect(getActionHandler(verifyRuntimeEnvForServer)({}, { accessToken: 'server-token' })).resolves.toEqual({
      ok: true,
      aiGatewayConfigured: true,
      accessTokenConfigured: true,
    })

    vi.stubEnv('AI_GATEWAY_API_KEY', '')
    await expect(getActionHandler(verifyRuntimeEnvForServer)({}, { accessToken: 'server-token' })).rejects.toThrow(
      'Missing AI_GATEWAY_API_KEY for Ask Kilian runtime verification',
    )

    vi.stubEnv('AI_GATEWAY_API_KEY', 'replace-with-ai-gateway-api-key')
    await expect(getActionHandler(verifyRuntimeEnvForServer)({}, { accessToken: 'server-token' })).rejects.toThrow(
      'Replace placeholder AI_GATEWAY_API_KEY for Ask Kilian runtime verification',
    )

    vi.unstubAllEnvs()
  })
})

describe('validator contracts', () => {
  it('keeps Convex Ask Kilian literal values synchronized with shared source types', () => {
    expect(CONVEX_ASK_KILIAN_CATEGORIES).toEqual(ASK_KILIAN_CATEGORIES)
    expect(CONVEX_ASK_KILIAN_SOURCES).toEqual(ASK_KILIAN_SOURCES)
    expect(CONVEX_ASK_KILIAN_SPOILER_LEVELS).toEqual(ASK_KILIAN_SPOILER_LEVELS)
    expect(CONVEX_ASK_KILIAN_STATUSES).toEqual(ASK_KILIAN_STATUSES)
    expect(CONVEX_ASK_KILIAN_TIERS).toEqual(ASK_KILIAN_TIERS)
  })
})
