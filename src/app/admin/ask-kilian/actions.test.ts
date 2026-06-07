import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  api,
  buildAskKilianKnowledgeEntries,
  cookieGet,
  createAskKilianConvexServerClient,
  isAdminTestBypassEnvEnabled,
  repoEntries,
  requireAdminAuthContext,
  revalidatePath,
  runAskKilianChatForAdmin,
} = vi.hoisted(() => ({
  api: {
    askKilianChat: {
      savePromptRevisionForAdmin: 'savePromptRevisionForAdmin',
      saveRuntimeConfigForAdmin: 'saveRuntimeConfigForAdmin',
    },
    askKilianKnowledge: {
      diffRepoKnowledgeForAdmin: 'diffRepoKnowledgeForAdmin',
      disableAdminKnowledgeEntryForAdmin: 'disableAdminKnowledgeEntryForAdmin',
      getAdminKnowledgeEntryForAdmin: 'getAdminKnowledgeEntryForAdmin',
      listAdminKnowledgeEntriesForAdmin: 'listAdminKnowledgeEntriesForAdmin',
      previewKnowledgeForAdmin: 'previewKnowledgeForAdmin',
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
  requireAdminAuthContext: vi.fn(),
  revalidatePath: vi.fn(),
  runAskKilianChatForAdmin: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({ requireAdminAuthContext }))
vi.mock('@/lib/ask-kilian/chat-runtime', () => ({ runAskKilianChatForAdmin }))
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
    requireAdminAuthContext.mockResolvedValue({ email: 'admin@example.com', accessToken: 'workos-token' })
    runAskKilianChatForAdmin.mockResolvedValue({
      ok: true,
      status: 'completed',
      text: 'Admin chat result',
      traceId: 'trace-action-chat',
      diagnostics: {},
    })
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
      .mockResolvedValueOnce({
        id: 'prompt-1',
        title: 'Active prompt',
        promptText: 'Answer as Ask Kilian.',
        createdBy: 'admin@example.com',
        createdAt: 1,
      })
      .mockResolvedValueOnce({
        id: 'runtime-1',
        modelId: 'test/generation-model',
        maxOutputTokens: 900,
        temperature: 0.7,
        conversationWindow: 8,
        ragLimit: 6,
        quota: {
          adminTestDailyRequests: 100,
          publicDailyRequests: 40,
          publicDailyEstimatedTokens: 60_000,
        },
        createdBy: 'admin@example.com',
        createdAt: 1,
      })
    createAskKilianConvexServerClient.mockResolvedValue(convex)

    const { getAskKilianAdminWorkspaceStateAction } = await import('./actions')
    await expect(getAskKilianAdminWorkspaceStateAction()).resolves.toMatchObject({
      entries: [expect.objectContaining({ stableKey: 'pet:lux' })],
      runtimeStatus: { level: 'ready', label: 'Runtime' },
      ragStatus: { level: 'ready', label: 'RAG' },
      activePromptConfig: expect.objectContaining({ id: 'prompt-1' }),
      activeRuntimeConfig: expect.objectContaining({ id: 'runtime-1' }),
    })
  })

  it('returns safe seeded state without Convex when the admin test bypass cookie is present', async () => {
    isAdminTestBypassEnvEnabled.mockReturnValue(true)
    cookieGet.mockReturnValue({ value: '1' })

    const { getAskKilianAdminWorkspaceStateAction } = await import('./actions')
    await expect(getAskKilianAdminWorkspaceStateAction()).resolves.toMatchObject({
      entries: [
        expect.objectContaining({ minTier: 0, ragStatus: 'ready', stableKey: 'test:public-project' }),
        expect.objectContaining({ minTier: 1, ragStatus: 'ready', stableKey: 'test:access-one-note' }),
        expect.objectContaining({ minTier: 2, ragStatus: 'ready', stableKey: 'test:private-note' }),
      ],
      runtimeStatus: { level: 'degraded', label: 'Runtime', reason: 'Admin test bypass state' },
      ragStatus: { level: 'degraded', label: 'RAG', reason: 'Admin test bypass state' },
    })

    expect(createAskKilianConvexServerClient).not.toHaveBeenCalled()
  })

  it('returns safe fixture detail without Convex when the admin test bypass cookie is present', async () => {
    isAdminTestBypassEnvEnabled.mockReturnValue(true)
    cookieGet.mockReturnValue({ value: '1' })

    const { getAskKilianKnowledgeEntryAction } = await import('./actions')
    await expect(getAskKilianKnowledgeEntryAction('test:public-project')).resolves.toMatchObject({
      stableKey: 'test:public-project',
      text: 'Safe fixture detail for a public project entry in the Ask Kilian admin test harness.',
      ragStatus: 'ready',
    })
    await expect(getAskKilianKnowledgeEntryAction('test:missing')).resolves.toBeNull()

    expect(createAskKilianConvexServerClient).not.toHaveBeenCalled()
  })

  it('exports prompt/runtime config actions and the Task 8 admin generation action', async () => {
    const actions = await import('./actions')
    expect(actions.saveAskKilianPromptConfigAction).toEqual(expect.any(Function))
    expect(actions.saveAskKilianRuntimeConfigAction).toEqual(expect.any(Function))
    expect(actions.generateAskKilianChatAction).toEqual(expect.any(Function))
  })

  it('runs admin chat generation with the authenticated admin distinct id', async () => {
    const { generateAskKilianChatAction } = await import('./actions')

    await expect(
      generateAskKilianChatAction({
        messages: [{ role: 'user', content: 'What should I ask about Kilian projects?' }],
        tier: 2,
        includeSpoilers: true,
        categories: ['projects'],
        promptOverride: 'Answer from this admin prompt.',
        runtimeModelOverride: 'test/generation-model',
      }),
    ).resolves.toEqual({
      ok: true,
      status: 'completed',
      text: 'Admin chat result',
      traceId: 'trace-action-chat',
      diagnostics: {},
    })

    expect(requireAdminAuthContext).toHaveBeenCalledWith()
    expect(runAskKilianChatForAdmin).toHaveBeenCalledWith({
      distinctId: 'admin@example.com',
      messages: [{ role: 'user', content: 'What should I ask about Kilian projects?' }],
      tier: 2,
      includeSpoilers: true,
      categories: ['projects'],
      promptOverride: 'Answer from this admin prompt.',
      runtimeModelOverride: 'test/generation-model',
    })
  })

  it('saves prompt config through the protected Ask Kilian chat action and revalidates admin state', async () => {
    const convex = { action: vi.fn(async () => ({ promptRevisionId: 'prompt-new' })) }
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { saveAskKilianPromptConfigAction } = await import('./actions')

    await expect(
      saveAskKilianPromptConfigAction({
        title: 'Admin prompt',
        promptText: 'Answer as Kilian using only retrieved context.',
        notes: 'Initial live chat prompt.',
      }),
    ).resolves.toEqual({ promptRevisionId: 'prompt-new' })

    expect(requireAdminAuthContext).toHaveBeenCalledWith()
    expect(convex.action).toHaveBeenCalledWith(api.askKilianChat.savePromptRevisionForAdmin, {
      title: 'Admin prompt',
      promptText: 'Answer as Kilian using only retrieved context.',
      notes: 'Initial live chat prompt.',
      actor: 'admin@example.com',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/ask-kilian')
  })

  it('saves runtime config through the protected Ask Kilian chat action and revalidates admin state', async () => {
    const convex = { action: vi.fn(async () => ({ runtimeConfigVersionId: 'runtime-new' })) }
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { saveAskKilianRuntimeConfigAction } = await import('./actions')

    await expect(
      saveAskKilianRuntimeConfigAction({
        modelId: 'test/generation-model',
        maxOutputTokens: 900,
        temperature: 0.7,
        conversationWindow: 8,
        ragLimit: 5,
        quota: {
          adminTestDailyRequests: 100,
          publicDailyRequests: 40,
          publicDailyEstimatedTokens: 60_000,
        },
      }),
    ).resolves.toEqual({ runtimeConfigVersionId: 'runtime-new' })

    expect(requireAdminAuthContext).toHaveBeenCalledWith()
    expect(convex.action).toHaveBeenCalledWith(api.askKilianChat.saveRuntimeConfigForAdmin, {
      modelId: 'test/generation-model',
      maxOutputTokens: 900,
      temperature: 0.7,
      conversationWindow: 8,
      ragLimit: 5,
      quota: {
        adminTestDailyRequests: 100,
        publicDailyRequests: 40,
        publicDailyEstimatedTokens: 60_000,
      },
      actor: 'admin@example.com',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/ask-kilian')
  })

  it('retrieval preview calls the Convex preview action and never AI generation routes', async () => {
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

    expect(convex.action).toHaveBeenCalledWith(api.askKilianKnowledge.previewKnowledgeForAdmin, {
      query: 'What should I ask about projects?',
      tier: 1,
      includeSpoilers: false,
      categories: ['projects'],
      limit: 4,
    })
    expect(convex.action).not.toHaveBeenCalledWith(api.askKilianKnowledge.searchKnowledgeForAdmin, expect.anything())
    expect(convex.action).toHaveBeenCalledTimes(1)
  })

  it('rejects edit rename collisions before calling the protected save action', async () => {
    const convex = { action: vi.fn() }
    convex.action
      .mockResolvedValueOnce({ ok: true, aiGatewayConfigured: true, accessTokenConfigured: true })
      .mockResolvedValueOnce([
        {
          stableKey: 'admin:existing-entry',
          source: 'admin',
          status: 'active',
          category: 'fun',
          title: 'Existing entry',
          contentHash: 'hash-existing',
          sourcePath: 'admin:/admin/ask-kilian',
          minTier: 0,
          spoilerLevel: 'none',
          importance: 0.5,
          updatedAt: 1,
          ragStatus: 'ready',
        },
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
        mode: 'edit',
        originalStableKey: 'admin:existing-entry',
        currentStatus: 'active',
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

  it('saves admin entry edits, revalidates, and returns refreshed state', async () => {
    const existingEntry = {
      stableKey: 'admin:existing-entry',
      source: 'admin',
      status: 'active',
      category: 'fun',
      title: 'Existing Entry',
      contentHash: 'existing-hash',
      sourcePath: 'admin:/admin/ask-kilian',
      minTier: 1,
      spoilerLevel: 'hint',
      importance: 0.7,
      updatedAt: 1,
      ragStatus: 'ready',
    }
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
      .mockResolvedValueOnce([existingEntry])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, aiGatewayConfigured: true, accessTokenConfigured: true })
      .mockResolvedValueOnce([refreshedEntry])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { saveAskKilianAdminEntryAction } = await import('./actions')

    await expect(
      saveAskKilianAdminEntryAction({
        mode: 'edit',
        originalStableKey: 'admin:existing-entry',
        currentStatus: 'active',
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
      runtimeStatus: { level: 'degraded', label: 'Runtime' },
      ragStatus: { level: 'ready', label: 'RAG' },
    })

    expect(convex.action).toHaveBeenCalledWith(api.askKilianKnowledge.saveAdminKnowledgeEntryForAdmin, {
      entry: expect.objectContaining({
        stableKey: 'admin:new-entry',
        source: 'admin',
        status: 'active',
        title: 'New Entry',
      }),
      originalStableKey: 'admin:existing-entry',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/ask-kilian')
  })

  it('disables admin entries, revalidates, and returns refreshed state', async () => {
    const convex = { action: vi.fn() }
    convex.action
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, aiGatewayConfigured: true, accessTokenConfigured: true })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { disableAskKilianAdminEntryAction } = await import('./actions')

    await expect(disableAskKilianAdminEntryAction('admin:old-entry')).resolves.toMatchObject({
      entries: [],
      runtimeStatus: { level: 'degraded', label: 'Runtime' },
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
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { reenableAskKilianAdminEntryAction } = await import('./actions')

    await expect(reenableAskKilianAdminEntryAction('admin:old-entry')).resolves.toMatchObject({
      entries: [expect.objectContaining({ stableKey: 'admin:old-entry' })],
      runtimeStatus: { level: 'degraded', label: 'Runtime' },
      ragStatus: { level: 'ready', label: 'RAG' },
    })

    expect(convex.action).toHaveBeenCalledWith(api.askKilianKnowledge.reenableAdminKnowledgeEntryForAdmin, {
      stableKey: 'admin:old-entry',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/ask-kilian')
  })

  it('previews repo sync with built repo entries and a full manifest', async () => {
    const convex = {
      action: vi.fn(async () => ({
        dryRun: true,
        counts: { created: 1, changed: 0, unchanged: 0, retired: 0, ignoredAdmin: 0 },
        keys: {
          created: ['project:ask-kilian'],
          changed: [],
          unchanged: [],
          retired: [],
          ignoredAdmin: [],
        },
      })),
    }
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { previewAskKilianRepoSyncAction } = await import('./actions')

    await expect(previewAskKilianRepoSyncAction()).resolves.toMatchObject({
      counts: { created: 1 },
      keys: { created: ['project:ask-kilian'] },
      confirmationToken: expect.any(String),
    })

    expect(buildAskKilianKnowledgeEntries).toHaveBeenCalledWith()
    expect(convex.action).toHaveBeenCalledWith(api.askKilianKnowledge.diffRepoKnowledgeForAdmin, {
      entries: repoEntries,
      isFullManifest: true,
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('rejects repo sync apply without a preview confirmation token', async () => {
    const { applyAskKilianRepoSyncAction } = await import('./actions')

    await expect(applyAskKilianRepoSyncAction('')).rejects.toThrow('Preview repo sync before applying changes.')
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
    const preview = {
      dryRun: true,
      counts: { created: 1, changed: 0, unchanged: 0, retired: 0, ignoredAdmin: 0 },
      keys: {
        created: ['project:ask-kilian'],
        changed: [],
        unchanged: [],
        retired: [],
        ignoredAdmin: [],
      },
    }
    const sync = { ...preview, dryRun: false }
    const previewConvex = { action: vi.fn().mockResolvedValueOnce(preview) }
    createAskKilianConvexServerClient.mockResolvedValue(previewConvex)
    const { applyAskKilianRepoSyncAction, previewAskKilianRepoSyncAction } = await import('./actions')
    const initialPreview = await previewAskKilianRepoSyncAction()

    const convex = { action: vi.fn() }
    convex.action
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce(sync)
      .mockResolvedValueOnce({ ok: true, aiGatewayConfigured: true, accessTokenConfigured: true })
      .mockResolvedValueOnce([refreshedEntry])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    createAskKilianConvexServerClient.mockResolvedValue(convex)

    await expect(applyAskKilianRepoSyncAction(initialPreview.confirmationToken)).resolves.toMatchObject({
      sync: { counts: { created: 1 }, confirmationToken: expect.any(String) },
      state: {
        entries: [expect.objectContaining({ stableKey: 'project:ask-kilian' })],
        runtimeStatus: { level: 'degraded', label: 'Runtime' },
        ragStatus: { level: 'ready', label: 'RAG' },
      },
    })

    expect(buildAskKilianKnowledgeEntries).toHaveBeenCalledWith()
    expect(convex.action).toHaveBeenCalledWith(api.askKilianKnowledge.diffRepoKnowledgeForAdmin, {
      entries: repoEntries,
      isFullManifest: true,
    })
    expect(convex.action).toHaveBeenCalledWith(api.askKilianKnowledge.syncRepoKnowledgeForAdmin, {
      entries: repoEntries,
      dryRun: false,
      isFullManifest: true,
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/ask-kilian')
  })

  it('rejects repo sync apply when the current preview no longer matches the confirmation token', async () => {
    const stalePreview = {
      dryRun: true,
      counts: { created: 1, changed: 0, unchanged: 0, retired: 0, ignoredAdmin: 0 },
      keys: {
        created: ['project:ask-kilian'],
        changed: [],
        unchanged: [],
        retired: [],
        ignoredAdmin: [],
      },
    }
    const currentPreview = {
      ...stalePreview,
      counts: { created: 0, changed: 0, unchanged: 1, retired: 0, ignoredAdmin: 0 },
      keys: {
        created: [],
        changed: [],
        unchanged: ['project:ask-kilian'],
        retired: [],
        ignoredAdmin: [],
      },
    }
    const convex = { action: vi.fn() }
    convex.action.mockResolvedValueOnce(stalePreview)
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { applyAskKilianRepoSyncAction, previewAskKilianRepoSyncAction } = await import('./actions')
    const preview = await previewAskKilianRepoSyncAction()

    convex.action.mockClear()
    convex.action.mockResolvedValueOnce(currentPreview)

    await expect(applyAskKilianRepoSyncAction(preview.confirmationToken)).rejects.toThrow(
      'Repo sync preview is stale. Preview again before applying changes.',
    )
    expect(convex.action).not.toHaveBeenCalledWith(api.askKilianKnowledge.syncRepoKnowledgeForAdmin, expect.anything())
  })

  it('rejects repo sync apply when manifest hashes or statuses change with identical summary counts and keys', async () => {
    const stableSummary = {
      dryRun: true,
      counts: { created: 0, changed: 1, unchanged: 0, retired: 0, ignoredAdmin: 0 },
      keys: {
        created: [],
        changed: ['project:ask-kilian'],
        unchanged: [],
        retired: [],
        ignoredAdmin: [],
      },
    }
    const originalEntry = { ...repoEntries[0]!, contentHash: 'old-hash', status: 'active' as const }
    const changedEntry = { ...repoEntries[0]!, contentHash: 'new-hash', status: 'disabled' as const }
    const convex = { action: vi.fn(async () => stableSummary) }
    buildAskKilianKnowledgeEntries.mockReturnValueOnce([originalEntry]).mockReturnValueOnce([changedEntry])
    createAskKilianConvexServerClient.mockResolvedValue(convex)
    const { applyAskKilianRepoSyncAction, previewAskKilianRepoSyncAction } = await import('./actions')

    const preview = await previewAskKilianRepoSyncAction()

    await expect(applyAskKilianRepoSyncAction(preview.confirmationToken)).rejects.toThrow(
      'Repo sync preview is stale. Preview again before applying changes.',
    )
    expect(convex.action).not.toHaveBeenCalledWith(api.askKilianKnowledge.syncRepoKnowledgeForAdmin, expect.anything())
  })
})
