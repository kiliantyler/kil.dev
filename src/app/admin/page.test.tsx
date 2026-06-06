import { describe, expect, it, vi } from 'vitest'

const connection = vi.fn()

vi.mock('next/server', () => ({
  connection,
}))

describe('AdminPage', () => {
  it('waits for a request before rendering the authenticated admin landing page', async () => {
    const { default: AdminPage } = await import('./page')

    const tree = await AdminPage()

    expect(connection).toHaveBeenCalledWith()
    expect(tree).toMatchObject({
      props: {
        children: {
          props: {
            children: [
              expect.objectContaining({ props: expect.objectContaining({ href: '/admin/pet-gallery' }) }),
              expect.objectContaining({ props: expect.objectContaining({ href: '/admin/ask-kilian' }) }),
            ],
          },
        },
      },
    })
  })
})
