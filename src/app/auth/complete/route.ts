import { requireAdminAuthEnv } from '@/env'
import { refreshSession } from '@workos-inc/authkit-nextjs'
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

function redirectToSignIn(request: NextRequest, returnTo: string) {
  const url = new URL('/auth/sign-in', request.url)
  url.searchParams.set('returnTo', returnTo)
  return applyNoStoreHeaders(NextResponse.redirect(url))
}

export async function GET(request: NextRequest) {
  await connection()

  const returnTo = readSafeReturnTo(request)
  const { PET_GALLERY_WORKOS_ORG_ID } = requireAdminAuthEnv()

  try {
    const session = await refreshSession({ organizationId: PET_GALLERY_WORKOS_ORG_ID })
    if (session.organizationId !== PET_GALLERY_WORKOS_ORG_ID) {
      throw new Error('WorkOS session did not refresh into the configured admin organization')
    }
  } catch (error) {
    console.error('[admin-auth] Failed to refresh WorkOS organization session', error)
    return redirectToSignIn(request, returnTo)
  }

  return applyNoStoreHeaders(NextResponse.redirect(new URL(returnTo, request.url)))
}
