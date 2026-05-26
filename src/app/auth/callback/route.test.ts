import type * as NextServer from 'next/server'
import { describe, expect, it, vi } from 'vitest'

const mockAuthHandler = vi.fn()
const handleAuth = vi.fn(() => mockAuthHandler)
const connection = vi.fn()

vi.mock('@workos-inc/authkit-nextjs', () => ({
  handleAuth,
}))

vi.mock('next/server', async importActual => ({
  ...(await importActual<typeof NextServer>()),
  connection,
}))

describe('AuthKit callback route', () => {
  it('uses the WorkOS AuthKit callback handler at request time', async () => {
    vi.resetModules()
    const route = await import('./route')
    const request = new Request('http://localhost:3000/auth/callback') as never

    expect(handleAuth).toHaveBeenCalledWith()
    await route.GET(request)
    expect(connection).toHaveBeenCalledWith()
    expect(mockAuthHandler).toHaveBeenCalledWith(request)
  })
})
