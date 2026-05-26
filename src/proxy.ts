import { authkitProxy } from '@workos-inc/authkit-nextjs'
import type { NextFetchEvent, NextRequest } from 'next/server'
import {
  ADMIN_TEST_BYPASS_COOKIE,
  ADMIN_TEST_BYPASS_COOKIE_VALUE,
  isAdminTestBypassEnvEnabled,
} from './lib/admin-test-bypass'

const UPLOADTHING_PATH = '/api/uploadthing/:path*'
const ADMIN_PATH = '/admin/:path*'
const ADMIN_SIGN_IN_PATH = '/auth/sign-in'
const ADMIN_CALLBACK_PATH = '/auth/callback'
const UNAUTHENTICATED_PATHS = [UPLOADTHING_PATH, ADMIN_PATH, ADMIN_SIGN_IN_PATH, ADMIN_CALLBACK_PATH]
const NO_STORE_CACHE_CONTROL = 'private, no-store, no-cache, must-revalidate, max-age=0'

const protectedProxy = authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: UNAUTHENTICATED_PATHS,
  },
})

const testAdminBypassProxy = authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: UNAUTHENTICATED_PATHS,
  },
})

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

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return !!value && typeof (value as PromiseLike<T>).then === 'function'
}

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const response = isTestAdminBypassRequest(request)
    ? testAdminBypassProxy(request, event)
    : protectedProxy(request, event)
  if (isPromiseLike(response)) {
    return response.then(applyNoStoreHeaders)
  }

  return applyNoStoreHeaders(response)
}

export const config = {
  matcher: ['/admin/:path*', '/auth/:path*', '/api/uploadthing/:path*'],
}
