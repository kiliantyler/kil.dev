import { afterEach, describe, expect, it, vi } from 'vitest'

const { api, createAskKilianConvexServerClient, revalidatePath } = vi.hoisted(() => ({
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
  createAskKilianConvexServerClient: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/ask-kilian/convex-server-client', () => ({ createAskKilianConvexServerClient }))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
  })),
}))
vi.mock('../../../../convex/_generated/api', () => ({ api }))

describe('Ask Kilian admin server actions', () => {
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
})
