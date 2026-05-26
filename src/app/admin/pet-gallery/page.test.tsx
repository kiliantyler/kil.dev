import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const connection = vi.fn()
const getPetGalleryAdminWorkspaceStateAction = vi.fn(async () => ({ kind: 'workspace-state' }))

vi.mock('next/server', () => ({
  connection,
}))

vi.mock('./actions', () => ({
  getPetGalleryAdminWorkspaceStateAction,
}))

vi.mock('@/components/admin/admin-shell', () => ({
  AdminShell: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}))

vi.mock('@/components/admin/pet-gallery/pet-gallery-admin-client', () => ({
  PetGalleryAdminClient: ({ initialState }: { initialState: unknown }) => (
    <div data-initial-state={JSON.stringify(initialState)} />
  ),
}))

describe('AdminPetGalleryPage', () => {
  it('waits for a request before reading authenticated pet gallery state', async () => {
    const { default: AdminPetGalleryPage } = await import('./page')

    await AdminPetGalleryPage()

    expect(connection).toHaveBeenCalledWith()
    expect(getPetGalleryAdminWorkspaceStateAction).toHaveBeenCalledWith()
    expect(connection.mock.invocationCallOrder[0]).toBeLessThan(
      getPetGalleryAdminWorkspaceStateAction.mock.invocationCallOrder[0] ?? 0,
    )
  })
})
