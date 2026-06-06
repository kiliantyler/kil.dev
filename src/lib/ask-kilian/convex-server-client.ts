import { env } from '@/env'
import { requireAdminAuthContext } from '@/lib/admin-auth'
import { ConvexHttpClient } from 'convex/browser'

export async function createAskKilianConvexServerClient() {
  const admin = await requireAdminAuthContext()
  const convexUrl = env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) throw new Error('Missing NEXT_PUBLIC_CONVEX_URL for Ask Kilian admin Convex client')
  const client = new ConvexHttpClient(convexUrl)
  client.setAuth(admin.accessToken)
  return client
}
