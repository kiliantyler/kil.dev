import { describe, expect, it, vi } from 'vitest'

const connection = vi.fn()

vi.mock('next/server', () => ({
  connection,
}))

describe('AdminPage', () => {
  it('waits for a request before rendering the authenticated admin landing page', async () => {
    const { default: AdminPage } = await import('./page')

    await AdminPage()

    expect(connection).toHaveBeenCalledWith()
  })
})
