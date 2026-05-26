import { env } from '@/env'
import { requirePetGalleryAdminAuthContext } from '@/lib/pet-gallery/admin-auth'
import { ConvexHttpClient } from 'convex/browser'

export async function createPetGalleryConvexServerClient(): Promise<ConvexHttpClient> {
  const { accessToken } = await requirePetGalleryAdminAuthContext()
  const convexUrl = env.NEXT_PUBLIC_CONVEX_URL

  if (!convexUrl) {
    throw new Error('Missing NEXT_PUBLIC_CONVEX_URL for pet gallery admin Convex client')
  }

  const client = new ConvexHttpClient(convexUrl)
  client.setAuth(accessToken)
  return client
}
