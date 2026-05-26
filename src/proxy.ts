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

const protectedProxy = authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [UPLOADTHING_PATH, ADMIN_PATH, ADMIN_SIGN_IN_PATH],
  },
})

const testAdminBypassProxy = authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [UPLOADTHING_PATH, ADMIN_PATH, ADMIN_SIGN_IN_PATH],
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

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return isTestAdminBypassRequest(request) ? testAdminBypassProxy(request, event) : protectedProxy(request, event)
}

export const config = {
  matcher: ['/admin/:path*', '/auth/:path*', '/api/uploadthing/:path*'],
}
