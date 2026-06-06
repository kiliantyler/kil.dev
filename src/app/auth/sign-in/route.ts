import { requireAdminAuthEnv } from '@/env'
import { adminAuthRedirectUri, isLocalHostname, requestUrlWithActualHost } from '@/lib/admin-auth-redirect'
import { getSignInUrl } from '@workos-inc/authkit-nextjs'
import { connection, NextResponse, type NextRequest } from 'next/server'

const NO_STORE_CACHE_CONTROL = 'private, no-store, no-cache, must-revalidate, max-age=0'

function readSafeReturnTo(request: NextRequest) {
  const requestUrl = requestUrlWithActualHost(request)
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

function localSignInCanonicalRedirect(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI?.trim()
  if (!configured) return null

  const requestUrl = requestUrlWithActualHost(request)
  let configuredUrl: URL
  try {
    configuredUrl = new URL(configured)
  } catch {
    return null
  }

  if (!isLocalHostname(configuredUrl.hostname) || !isLocalHostname(requestUrl.hostname)) return null
  if (requestUrl.origin === configuredUrl.origin) return null

  const canonicalUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, configuredUrl.origin)
  return applyNoStoreHeaders(NextResponse.redirect(canonicalUrl))
}

export async function GET(request: NextRequest) {
  await connection()
  const canonicalRedirect = localSignInCanonicalRedirect(request)
  if (canonicalRedirect) return canonicalRedirect

  const { WORKOS_ORG_ID } = requireAdminAuthEnv()
  const signInUrl = await getSignInUrl({
    organizationId: WORKOS_ORG_ID,
    returnTo: readSafeReturnTo(request),
    redirectUri: adminAuthRedirectUri(request),
  })

  return applyNoStoreHeaders(NextResponse.redirect(signInUrl))
}
