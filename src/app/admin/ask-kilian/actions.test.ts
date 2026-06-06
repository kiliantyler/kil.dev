import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  api,
  buildAskKilianKnowledgeEntries,
  cookieGet,
  createAskKilianConvexServerClient,
  isAdminTestBypassEnvEnabled,
  repoEntries,
  revalidatePath,
} = vi.hoisted(() => ({
  api: {
    askKilianKnowledge: {
      diffRepoKnowledgeForAdmin: 'diffRepoKnowledgeForAdmin',
      disableAdminKnowledgeEntryForAdmin: 'disableAdminKnowledgeEntryForAdmin',
      getAdminKnowledgeEntryForAdmin: 'getAdminKnowledgeEntryForAdmin',
      listAdminKnowledgeEntriesForAdmin: 'listAdminKnowledgeEntriesForAdmin',
      reenableAdminKnowledgeEntryForAdmin: 'reenableAdminKnowledgeEntryForAdmin',
      saveAdminKnowledgeEntryForAdmin: 'saveAdminKnowledgeEntryForAdmin',
      searchKnowledgeForAdmin: 'searchKnowledgeForAdmin',
      syncRepoKnowledgeForAdmin: 'syncRepoKnowledgeForAdmin',
      verifyRuntimeEnvForAdmin: 'verifyRuntimeEnvForAdmin',
    },
  },
  buildAskKilianKnowledgeEntries: vi.fn(),
  cookieGet: vi.fn(),
  createAskKilianConvexServerClient: vi.fn(),
  isAdminTestBypassEnvEnabled: vi.fn(),
  repoEntries: [
    {
      stableKey: 'project:ask-kilian',
      source: 'repo',
      status: 'active',
      category: 'projects',
      title: 'Ask Kilian',
      text: 'Ask Kilian project source entry for admin sync tests.',
      contentHash: 'repo-hash',
      sourcePath: 'src/lib/ask-kilian/knowledge-sources.ts',
      minTier: 0,
      spoilerLevel: 'none',
      importance: 0.9,
    },
  ],
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/ask-kilian/convex-server-client', () => ({ createAskKilianConvexServerClient }))
vi.mock('@/lib/ask-kilian/knowledge-sources', () => ({ buildAskKilianKnowledgeEntries }))
vi.mock('@/lib/admin-test-bypass', () => ({
  ADMIN_TEST_BYPASS_COOKIE: 'pet-gallery-test-admin',
  ADMIN_TEST_BYPASS_COOKIE_VALUE: '1',
  isAdminTestBypassEnvEnabled,
}))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: cookieGet,
  })),
}))
vi.mock('../../../../convex/_generated/api', () => ({ api }))

describe('Ask Kilian admin server actions', () => {
  beforeEach(() => {
    buildAskKilianKnowledgeEntries.mockReturnValue(repoEntries)
    isAdminTestBypassEnvEnabled.mockReturnValue(false)
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('loads workspace state through protected Convex actions', async () => {
    const convex = { action: vi.fn() }
    convex.action
      .mockResolvedValueOnce({ ok: true, aiGatewayConfigured: true, accessTokenConfigured: true })
      .mockResolvedValueOnce([
        {
          stableKey: 'pet:lux',
          source: 'repo',
          status: 'active',
          category: 'pets',
          title: 'Lux',
          contentHash: 'hash',
          sourcePath: 'src/lib/pets.ts',
          minTier: 0,
          spoilerLevel: 'none',
          importance: 0.8,
          updatedAt: 1,
          ragStatus: 'ready',
        },
      ])
    createAskKilianConvexServerClient.mockResolvedValue(convex)

    const { getAskKilianAdminWorkspaceStateAction } = await import('./actions')
    await expect(getAskKilianAdminWorkspaceStateAction()).resolves.toMatchObject({
      entries: [expect.objectContaining({ stableKey: 'pet:lux' })],
      runtimeStatus: { level: 'ready', label: 'Runtime' },
      ragStatus: { level: 'ready', label: 'RAG' },
    })
  })

  it('returns safe empty state without Convex when the admin test bypass cookie is present', async () => {
    isAdminTestBypassEnvEnabled.mockReturnValue(true)
    cookieGet.mockReturnValue({ value: '1' })

    const { getAskKilianAdminWorkspaceStateAction } = await import('./actions')
    await expect(getAskKilianAdminWorkspaceStateAction()).resolves.toMatchObject({
      entries: [],
      runtimeStatus: { level: 'degraded', label: 'Runtime', reason: 'Admin test bypass state' },
      ragStatus: { level: 'degraded', label: 'RAG', reason: 'Admin test bypass state' },
    })

    expect(createAskKilianConvexServerClient).not.toHaveBeenCalled()
  })

  it('does not expose generation actions', async () => {
    const actions = await import('./actions')
    expect(Object.keys(actions).some(name => /chat|generate|stream/i.test(name))).toBe(false)
  })

  it('retrieval preview calls only the Convex retrieval action and never AI generation routes', async () => {
    const convex = { action: vi.fn(async () => []) }
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { previewAskKilianRetrievalAction } = await import('./actions')

    await previewAskKilianRetrievalAction({
      prompt: 'What should I ask about projects?',
      tier: 1,
      includeSpoilers: false,
      categories: ['projects'],
      limit: 4,
    })

    expect(convex.action).toHaveBeenCalledWith(api.askKilianKnowledge.searchKnowledgeForAdmin, {
      query: 'What should I ask about projects?',
      tier: 1,
      includeSpoilers: false,
      categories: ['projects'],
      limit: 4,
    })
    expect(convex.action).toHaveBeenCalledTimes(1)
  })

  it('rejects create collisions before calling the protected save action', async () => {
    const convex = { action: vi.fn() }
    convex.action
      .mockResolvedValueOnce({ ok: true, aiGatewayConfigured: true, accessTokenConfigured: true })
      .mockResolvedValueOnce([
        {
          stableKey: 'admin:dupe',
          source: 'admin',
          status: 'active',
          category: 'fun',
          title: 'Dupe',
          contentHash: 'hash',
          sourcePath: 'admin:/admin/ask-kilian',
          minTier: 0,
          spoilerLevel: 'none',
          importance: 0.5,
          updatedAt: 1,
          ragStatus: 'ready',
        },
      ])
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { saveAskKilianAdminEntryAction } = await import('./actions')

    await expect(
      saveAskKilianAdminEntryAction({
        mode: 'create',
        slug: 'dupe',
        title: 'Dupe',
        category: 'fun',
        minTier: 0,
        spoilerLevel: 'none',
        text: 'This is enough source text for a duplicate entry.',
        importance: 0.5,
      }),
    ).rejects.toThrow('Ask Kilian admin entry already exists: admin:dupe')

    expect(convex.action).not.toHaveBeenCalledWith(
      api.askKilianKnowledge.saveAdminKnowledgeEntryForAdmin,
      expect.anything(),
    )
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('saves admin entries, revalidates, and returns refreshed state', async () => {
    const refreshedEntry = {
      stableKey: 'admin:new-entry',
      source: 'admin',
      status: 'active',
      category: 'fun',
      title: 'New Entry',
      contentHash: 'saved-hash',
      sourcePath: 'admin:/admin/ask-kilian',
      minTier: 1,
      spoilerLevel: 'hint',
      importance: 0.7,
      updatedAt: 2,
      ragStatus: 'ready',
    }
    const convex = { action: vi.fn() }
    convex.action
      .mockResolvedValueOnce({ ok: true, aiGatewayConfigured: true, accessTokenConfigured: true })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, aiGatewayConfigured: true, accessTokenConfigured: true })
      .mockResolvedValueOnce([refreshedEntry])
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { saveAskKilianAdminEntryAction } = await import('./actions')

    await expect(
      saveAskKilianAdminEntryAction({
        mode: 'create',
        slug: 'new entry',
        title: 'New Entry',
        category: 'fun',
        minTier: 1,
        spoilerLevel: 'hint',
        text: 'This is enough source text for a successful admin entry.',
        importance: 0.7,
      }),
    ).resolves.toMatchObject({
      entries: [expect.objectContaining({ stableKey: 'admin:new-entry' })],
      runtimeStatus: { level: 'ready', label: 'Runtime' },
      ragStatus: { level: 'ready', label: 'RAG' },
    })

    expect(convex.action).toHaveBeenCalledWith(api.askKilianKnowledge.saveAdminKnowledgeEntryForAdmin, {
      entry: expect.objectContaining({
        stableKey: 'admin:new-entry',
        source: 'admin',
        status: 'active',
        title: 'New Entry',
      }),
      originalStableKey: undefined,
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/ask-kilian')
  })

  it('disables admin entries, revalidates, and returns refreshed state', async () => {
    const convex = { action: vi.fn() }
    convex.action
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, aiGatewayConfigured: true, accessTokenConfigured: true })
      .mockResolvedValueOnce([])
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { disableAskKilianAdminEntryAction } = await import('./actions')

    await expect(disableAskKilianAdminEntryAction('admin:old-entry')).resolves.toMatchObject({
      entries: [],
      runtimeStatus: { level: 'ready', label: 'Runtime' },
      ragStatus: { level: 'degraded', label: 'RAG' },
    })

    expect(convex.action).toHaveBeenCalledWith(api.askKilianKnowledge.disableAdminKnowledgeEntryForAdmin, {
      stableKey: 'admin:old-entry',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/ask-kilian')
  })

  it('re-enables admin entries, revalidates, and returns refreshed state', async () => {
    const refreshedEntry = {
      stableKey: 'admin:old-entry',
      source: 'admin',
      status: 'active',
      category: 'fun',
      title: 'Old Entry',
      contentHash: 'hash',
      sourcePath: 'admin:/admin/ask-kilian',
      minTier: 0,
      spoilerLevel: 'none',
      importance: 0.5,
      updatedAt: 3,
      ragStatus: 'ready',
    }
    const convex = { action: vi.fn() }
    convex.action
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, aiGatewayConfigured: true, accessTokenConfigured: true })
      .mockResolvedValueOnce([refreshedEntry])
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { reenableAskKilianAdminEntryAction } = await import('./actions')

    await expect(reenableAskKilianAdminEntryAction('admin:old-entry')).resolves.toMatchObject({
      entries: [expect.objectContaining({ stableKey: 'admin:old-entry' })],
      runtimeStatus: { level: 'ready', label: 'Runtime' },
      ragStatus: { level: 'ready', label: 'RAG' },
    })

    expect(convex.action).toHaveBeenCalledWith(api.askKilianKnowledge.reenableAdminKnowledgeEntryForAdmin, {
      stableKey: 'admin:old-entry',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/ask-kilian')
  })

  it('previews repo sync with built repo entries and a full manifest', async () => {
    const convex = { action: vi.fn(async () => ({ creates: [], updates: [], disables: [] })) }
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { previewAskKilianRepoSyncAction } = await import('./actions')

    await previewAskKilianRepoSyncAction()

    expect(buildAskKilianKnowledgeEntries).toHaveBeenCalledWith()
    expect(convex.action).toHaveBeenCalledWith(api.askKilianKnowledge.diffRepoKnowledgeForAdmin, {
      entries: repoEntries,
      isFullManifest: true,
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('applies repo sync with built repo entries, revalidates, and returns sync plus refreshed state', async () => {
    const refreshedEntry = {
      stableKey: 'project:ask-kilian',
      source: 'repo',
      status: 'active',
      category: 'projects',
      title: 'Ask Kilian',
      contentHash: 'repo-hash',
      sourcePath: 'src/lib/ask-kilian/knowledge-sources.ts',
      minTier: 0,
      spoilerLevel: 'none',
      importance: 0.9,
      updatedAt: 4,
      ragStatus: 'ready',
    }
    const sync = { created: 1, updated: 0, disabled: 0 }
    const convex = { action: vi.fn() }
    convex.action
      .mockResolvedValueOnce(sync)
      .mockResolvedValueOnce({ ok: true, aiGatewayConfigured: true, accessTokenConfigured: true })
      .mockResolvedValueOnce([refreshedEntry])
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { applyAskKilianRepoSyncAction } = await import('./actions')

    await expect(applyAskKilianRepoSyncAction()).resolves.toMatchObject({
      sync,
      state: {
        entries: [expect.objectContaining({ stableKey: 'project:ask-kilian' })],
        runtimeStatus: { level: 'ready', label: 'Runtime' },
        ragStatus: { level: 'ready', label: 'RAG' },
      },
    })

    expect(buildAskKilianKnowledgeEntries).toHaveBeenCalledWith()
    expect(convex.action).toHaveBeenCalledWith(api.askKilianKnowledge.syncRepoKnowledgeForAdmin, {
      entries: repoEntries,
      dryRun: false,
      isFullManifest: true,
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/ask-kilian')
  })
})
