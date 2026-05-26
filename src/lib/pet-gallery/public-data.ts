import { env } from '@/env'
import { isPetGalleryPublicTestSnapshotEnvEnabled } from '@/lib/admin-test-bypass'
import { ConvexHttpClient } from 'convex/browser'
import { unstable_cache } from 'next/cache'
import { api } from '../../../convex/_generated/api'
import { createTestBypassPetGalleryAdminState } from './admin-workspace'
import { buildPublicPetGallerySnapshot } from './snapshot'
import type { PublicPetGalleryPhoto, PublicPetGallerySnapshot } from './types'

const loadCachedPetGallerySnapshot = unstable_cache(
  async (): Promise<PublicPetGallerySnapshot | null> => {
    if (isPetGalleryPublicTestSnapshotEnvEnabled()) {
      const state = createTestBypassPetGalleryAdminState()
      return buildPublicPetGallerySnapshot({
        photos: state.photos,
        animals: state.animals,
        now: Date.UTC(2026, 4, 18),
        createRevision: () => 'test-bypass-public-snapshot',
      })
    }

    if (!env.NEXT_PUBLIC_CONVEX_URL) {
      if (env.NODE_ENV === 'production') {
        throw new Error('Pet gallery Convex URL is not configured')
      }
      return null
    }
    const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL)
    return client.query(api.petGallery.getPublicSnapshot, {})
  },
  ['pet-gallery-public-snapshot'],
  { tags: ['pet-gallery'] },
)

export async function getCachedPetGallerySnapshot(): Promise<PublicPetGallerySnapshot | null> {
  try {
    return await loadCachedPetGallerySnapshot()
  } catch (error) {
    if (env.NODE_ENV === 'production') throw error
    return null
  }
}

export function getPetGalleryPhotoAlt(photo: PublicPetGalleryPhoto) {
  return photo.altText || photo.caption || photo.title || 'Pet photo'
}
