import { authkit, handleAuthkitHeaders } from '@workos-inc/authkit-nextjs'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  ADMIN_TEST_BYPASS_COOKIE,
  ADMIN_TEST_BYPASS_COOKIE_VALUE,
  isAdminTestBypassEnvEnabled,
} from './lib/admin-test-bypass'

const NO_STORE_CACHE_CONTROL = 'private, no-store, no-cache, must-revalidate, max-age=0'

function isAdminPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

function isTestAdminBypassRequest(request: NextRequest) {
  return (
    isAdminTestBypassEnvEnabled() &&
    isAdminPath(request.nextUrl.pathname) &&
    request.cookies.get(ADMIN_TEST_BYPASS_COOKIE)?.value === ADMIN_TEST_BYPASS_COOKIE_VALUE
  )
}

function readWorkOSSessionCookieName() {
  return process.env.WORKOS_COOKIE_NAME?.trim() || 'wos-session'
}

function adminSignInUrl(request: NextRequest) {
  const url = new URL('/auth/sign-in', request.url)
  url.searchParams.set('returnTo', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return url
}

function appendVaryCookie(response: Response) {
  const current = response.headers.get('Vary')
  const values = new Set(
    (current ?? '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
  )
  values.add('Cookie')
  response.headers.set('Vary', [...values].join(', '))
}

function applyNoStoreHeaders<T>(response: T): T {
  if (!(response instanceof Response)) return response

  response.headers.set('Cache-Control', NO_STORE_CACHE_CONTROL)
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  response.headers.set('x-middleware-cache', 'no-cache')
  appendVaryCookie(response)
  return response
}

export default async function proxy(request: NextRequest, _event: NextFetchEvent) {
  if (isTestAdminBypassRequest(request)) {
    return applyNoStoreHeaders(NextResponse.next())
  }

  if (isAdminPath(request.nextUrl.pathname) && !request.cookies.has(readWorkOSSessionCookieName())) {
    return applyNoStoreHeaders(NextResponse.redirect(adminSignInUrl(request)))
  }

  const { session, headers } = await authkit(request)
  if (isAdminPath(request.nextUrl.pathname) && !session.user) {
    return applyNoStoreHeaders(handleAuthkitHeaders(request, headers, { redirect: adminSignInUrl(request) }))
  }

  return applyNoStoreHeaders(handleAuthkitHeaders(request, headers))
}

export const config = {
  matcher: ['/admin/:path*', '/api/uploadthing/:path*'],
}
