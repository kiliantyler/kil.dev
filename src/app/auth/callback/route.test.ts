import { describe, expect, it, vi } from 'vitest'

const mockAuthHandler = vi.fn()
const handleAuth = vi.fn(() => mockAuthHandler)

vi.mock('@workos-inc/authkit-nextjs', () => ({
  handleAuth,
}))

describe('AuthKit callback route', () => {
  it('uses the WorkOS AuthKit callback handler', async () => {
    vi.resetModules()
    const route = await import('./route')

    expect(handleAuth).toHaveBeenCalledWith()
    expect(route.GET).toBe(mockAuthHandler)
  })
})
