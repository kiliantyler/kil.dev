import { requireAdminAuthEnv } from '@/env'
import { adminAuthRedirectUri } from '@/lib/admin-auth-redirect'
import { getSignInUrl } from '@workos-inc/authkit-nextjs'
import { connection, NextResponse, type NextRequest } from 'next/server'

const NO_STORE_CACHE_CONTROL = 'private, no-store, no-cache, must-revalidate, max-age=0'

function readSafeReturnTo(request: NextRequest) {
  const requestUrl = request.nextUrl ?? new URL(request.url)
  const returnTo = requestUrl.searchParams.get('returnTo')
  if (!returnTo) return '/admin'

  try {
    const parsed = new URL(returnTo, requestUrl.origin)
    if (parsed.origin !== requestUrl.origin) return '/admin'
    if (parsed.pathname !== '/admin' && !parsed.pathname.startsWith('/admin/')) return '/admin'
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return '/admin'
  }
}

function applyNoStoreHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', NO_STORE_CACHE_CONTROL)
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  response.headers.set('Vary', 'Cookie')
  return response
}

export async function GET(request: NextRequest) {
  await connection()
  const { PET_GALLERY_WORKOS_ORG_ID } = requireAdminAuthEnv()
  const signInUrl = await getSignInUrl({
    organizationId: PET_GALLERY_WORKOS_ORG_ID,
    returnTo: readSafeReturnTo(request),
    redirectUri: adminAuthRedirectUri(request),
  })

  return applyNoStoreHeaders(NextResponse.redirect(signInUrl))
}
