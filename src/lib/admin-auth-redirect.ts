import type { NextRequest } from 'next/server'

export function adminAuthRedirectUri(request: Pick<NextRequest, 'url' | 'nextUrl'> | Request) {
  const requestUrl = 'nextUrl' in request && request.nextUrl ? request.nextUrl : new URL(request.url)
  return new URL('/auth/callback', requestUrl.origin).toString()
}
