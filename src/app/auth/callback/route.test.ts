import type * as NextServer from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockAuthHandler = vi.fn()
const handleAuth = vi.fn(() => mockAuthHandler)
const connection = vi.fn()
const sealData = vi.fn()

type MockAuthSuccess = {
  accessToken?: string
  refreshToken?: string
  user?: unknown
  impersonator?: unknown
  authenticationMethod?: unknown
}

vi.mock('@workos-inc/authkit-nextjs', () => ({
  handleAuth,
}))

vi.mock('iron-session', () => ({
  sealData,
}))

vi.mock('next/server', async importActual => ({
  ...(await importActual<typeof NextServer>()),
  connection,
}))

function mockSuccessfulAuthCallback(success: MockAuthSuccess = {}) {
  mockAuthHandler.mockImplementation(async (request: Request) => {
    const calls = handleAuth.mock.calls as unknown as Array<
      [{ onSuccess: (session: Required<MockAuthSuccess>) => unknown }]
    >
    const options = calls.at(-1)?.[0]
    if (!options) throw new Error('expected handleAuth options')
    await options.onSuccess({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user_admin', email: 'admin@example.test' },
      impersonator: undefined,
      authenticationMethod: 'oauth',
      ...success,
    })
    const { NextResponse } = await import('next/server')
    return NextResponse.redirect(new URL('/admin', request.url))
  })
}

describe('AuthKit callback route', () => {
  beforeEach(() => {
    vi.stubEnv('WORKOS_COOKIE_PASSWORD', 'a'.repeat(32))
    vi.resetModules()
    handleAuth.mockClear()
    mockAuthHandler.mockReset()
    connection.mockClear()
    sealData.mockResolvedValue('sealed-session')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the WorkOS AuthKit callback handler at request time', async () => {
    vi.resetModules()
    mockAuthHandler.mockResolvedValue(new Response(null, { status: 307 }))
    const route = await import('./route')
    const request = new Request('http://localhost:3000/auth/callback') as never

    await route.GET(request)
    expect(connection).toHaveBeenCalledWith()
    expect(handleAuth).toHaveBeenCalledWith({ onSuccess: expect.any(Function) })
    expect(mockAuthHandler).toHaveBeenCalledWith(request)
  })

  it('sets the WorkOS session cookie on successful callback redirects', async () => {
    mockSuccessfulAuthCallback()

    const route = await import('./route')
    const response = await route.GET(new Request('https://kil.dev/auth/callback') as never)

    expect(sealData).toHaveBeenCalledWith(
      {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user_admin', email: 'admin@example.test' },
        impersonator: undefined,
        authenticationMethod: 'oauth',
      },
      { password: 'a'.repeat(32), ttl: 0 },
    )
    expect(response.headers.getSetCookie()[0]).toEqual(expect.stringContaining('wos-session=sealed-session;'))
    expect(response.headers.getSetCookie()[0]).toEqual(expect.stringContaining('Path=/'))
    expect(response.headers.getSetCookie()[0]).toEqual(expect.stringContaining('HttpOnly'))
    expect(response.headers.getSetCookie()[0]).toEqual(expect.stringContaining('SameSite=lax'))
    expect(response.headers.getSetCookie()[0]).toEqual(expect.stringContaining('Max-Age=34560000'))
    expect(response.headers.getSetCookie()[0]).toEqual(expect.stringContaining('Secure'))
  })

  it('honors configured cookie lifetime and secure production redirect settings', async () => {
    vi.stubEnv('WORKOS_COOKIE_MAX_AGE', '3600')
    vi.stubEnv('NEXT_PUBLIC_WORKOS_REDIRECT_URI', 'https://kil.dev/auth/callback')
    mockSuccessfulAuthCallback()

    const route = await import('./route')
    const response = await route.GET(new Request('http://internal.vercel.test/auth/callback') as never)

    expect(response.headers.getSetCookie()[0]).toEqual(expect.stringContaining('wos-session=sealed-session;'))
    expect(response.headers.getSetCookie()[0]).toEqual(expect.stringContaining('Max-Age=3600'))
    expect(response.headers.getSetCookie()[0]).toEqual(expect.stringContaining('Secure'))
  })
})
