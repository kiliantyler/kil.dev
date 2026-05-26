import { Suspense } from 'react'
import { describe, expect, it, vi } from 'vitest'

const requireAdminSession = vi.fn()

vi.mock('@/lib/admin-auth', () => ({
  requireAdminSession,
}))

vi.mock('@/components/providers/authkit-provider', () => ({
  SiteAuthKitProvider: 'section',
}))

describe('AdminLayout', () => {
  it('wraps the guarded admin tree in suspense for cache component prerendering', async () => {
    const { default: AdminLayout, AdminAuthGate } = await import('./layout')
    const result = AdminLayout({ children: <div data-testid="admin-child" /> })

    expect(result).toEqual(
      <Suspense fallback={null}>
        <AdminAuthGate>
          <div data-testid="admin-child" />
        </AdminAuthGate>
      </Suspense>,
    )
  })

  it('guards the admin route tree before rendering children', async () => {
    const { AdminAuthGate } = await import('./layout')
    const result = await AdminAuthGate({ children: <div data-testid="admin-child" /> })

    expect(requireAdminSession).toHaveBeenCalledWith()
    expect(result).toEqual(
      <section>
        <div data-testid="admin-child" />
      </section>,
    )
  })
})
