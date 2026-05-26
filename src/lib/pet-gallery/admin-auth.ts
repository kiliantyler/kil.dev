import { AdminUnauthorizedError, displayNameForAdminUser, requireAdminAuthContext } from '@/lib/admin-auth'
import type { PetGalleryActor } from '@/lib/pet-gallery/types'

export class PetGalleryAdminUnauthorizedError extends Error {
  constructor() {
    super('Pet gallery admin access denied')
    this.name = 'PetGalleryAdminUnauthorizedError'
  }
}

export type PetGalleryAdminAuthContext = {
  actor: PetGalleryActor
  accessToken: string
}

export async function requirePetGalleryAdminAuthContext(): Promise<PetGalleryAdminAuthContext> {
  let admin: Awaited<ReturnType<typeof requireAdminAuthContext>>

  try {
    admin = await requireAdminAuthContext()
  } catch (error) {
    if (error instanceof AdminUnauthorizedError) {
      throw new PetGalleryAdminUnauthorizedError()
    }
    throw error
  }

  return {
    actor: {
      workosUserId: admin.workosUserId,
      workosOrgId: admin.workosOrgId,
      email: admin.email,
      name: displayNameForAdminUser(admin.user),
      timestamp: Date.now(),
    },
    accessToken: admin.accessToken,
  }
}

export async function requirePetGalleryAdminSession(): Promise<PetGalleryActor> {
  const { actor } = await requirePetGalleryAdminAuthContext()
  return actor
}
