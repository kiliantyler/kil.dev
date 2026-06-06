import { describe, expect, it, vi } from 'vitest'

const connection = vi.fn()
const getAskKilianAdminWorkspaceStateAction = vi.fn(async () => ({
  entries: [],
  runtimeStatus: { label: 'Runtime', level: 'ready', reason: 'Runtime ready', checkedAt: 1 },
  ragStatus: { label: 'RAG', level: 'degraded', reason: 'RAG has no active entries', checkedAt: 1 },
}))

vi.mock('next/server', () => ({ connection }))
vi.mock('./actions', () => ({ getAskKilianAdminWorkspaceStateAction }))
vi.mock('@/components/admin/ask-kilian/ask-kilian-admin-client', () => ({
  AskKilianAdminClient: 'ask-kilian-admin-client',
}))

describe('AdminAskKilianPage', () => {
  it('waits for request state and loads initial Ask Kilian workspace state', async () => {
    const { default: AdminAskKilianPage } = await import('./page')

    await AdminAskKilianPage()

    expect(connection).toHaveBeenCalledWith()
    expect(getAskKilianAdminWorkspaceStateAction).toHaveBeenCalledWith()
  })
})
