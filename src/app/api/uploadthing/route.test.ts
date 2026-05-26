import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const GET = vi.fn()
  const POST = vi.fn()
  const petGalleryFileRouter = { generatedImageVariant: Symbol('generatedImageVariant') }
  const createRouteHandler = vi.fn(() => ({ GET, POST }))

  return { GET, POST, createRouteHandler, petGalleryFileRouter }
})

vi.mock('@/app/api/uploadthing/core', () => ({
  petGalleryFileRouter: mocks.petGalleryFileRouter,
}))

vi.mock('uploadthing/next', () => ({
  createRouteHandler: mocks.createRouteHandler,
}))

describe('UploadThing route handler', () => {
  it('wires the pet gallery file router into GET and POST handlers', async () => {
    vi.resetModules()
    const route = await import('./route')

    expect(mocks.createRouteHandler).toHaveBeenCalledWith({
      router: mocks.petGalleryFileRouter,
    })
    expect(route.GET).toBe(mocks.GET)
    expect(route.POST).toBe(mocks.POST)
  })
})
