import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAdminAuthContext, runAskKilianChatForAdmin } = vi.hoisted(() => ({
  requireAdminAuthContext: vi.fn(),
  runAskKilianChatForAdmin: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({ requireAdminAuthContext }))
vi.mock('@/lib/ask-kilian/chat-runtime', () => ({ runAskKilianChatForAdmin }))

function postAskKilianChat(body: unknown) {
  return import('./route').then(({ POST }) =>
    POST(
      new Request('http://localhost/api/ask-kilian/chat', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
      }) as never,
    ),
  )
}

describe('POST /api/ask-kilian/chat', () => {
  beforeEach(() => {
    vi.resetModules()
    requireAdminAuthContext.mockReset()
    runAskKilianChatForAdmin.mockReset()
    requireAdminAuthContext.mockResolvedValue({ email: 'admin@example.com' })
    runAskKilianChatForAdmin.mockResolvedValue({
      ok: true,
      status: 'completed',
      text: 'Kilian is testing this from the admin lab.',
      traceId: 'trace-admin-chat',
      diagnostics: {},
    })
  })

  it('runs an authenticated admin chat request through the admin runtime', async () => {
    const response = await postAskKilianChat({
      messages: [{ role: 'user', content: 'What should I ask Kilian about projects?' }],
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(requireAdminAuthContext).toHaveBeenCalledWith()
    expect(runAskKilianChatForAdmin).toHaveBeenCalledWith({
      distinctId: 'admin@example.com',
      messages: [{ role: 'user', content: 'What should I ask Kilian about projects?' }],
      tier: 1,
      includeSpoilers: false,
      categories: [],
    })
    expect(runAskKilianChatForAdmin.mock.calls[0]?.[0]).not.toHaveProperty('callerMode')
    await expect(response.json()).resolves.toEqual({
      ok: true,
      status: 'completed',
      text: 'Kilian is testing this from the admin lab.',
      traceId: 'trace-admin-chat',
      diagnostics: {},
    })
  })

  it('fails closed when admin auth is missing', async () => {
    requireAdminAuthContext.mockRejectedValue(new Error('Admin access denied'))

    const response = await postAskKilianChat({
      messages: [{ role: 'user', content: 'Can I chat from public yet?' }],
    })

    expect(response.status).toBe(403)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(runAskKilianChatForAdmin).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: 'Ask Kilian chat is admin-only until KTY-67.',
    })
  })
})
