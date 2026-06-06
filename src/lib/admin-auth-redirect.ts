import type { NextRequest } from 'next/server'

export function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
}

export function requestUrlWithActualHost(request: Pick<NextRequest, 'url' | 'headers'> | Request) {
  const requestUrl = new URL(request.url)
  const host = request.headers.get('host')?.trim()
  if (!host) return requestUrl

  const protocol =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || requestUrl.protocol.replace(':', '')
  return new URL(`${protocol}://${host}${requestUrl.pathname}${requestUrl.search}`)
}

function configuredRedirectUriForRequest(requestUrl: URL) {
  const configured = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI?.trim()
  if (!configured) return null

  try {
    const configuredUrl = new URL(configured)
    if (isLocalHostname(configuredUrl.hostname) && !isLocalHostname(requestUrl.hostname)) return null
    if (
      process.env.VERCEL_ENV === 'preview' &&
      (!isLocalHostname(configuredUrl.hostname) || !isLocalHostname(requestUrl.hostname))
    )
      return null
    return configuredUrl.toString()
  } catch {
    return null
  }
}

export function adminAuthRedirectUri(request: Pick<NextRequest, 'url' | 'nextUrl' | 'headers'> | Request) {
  const requestUrl = requestUrlWithActualHost(request)
  const configured = configuredRedirectUriForRequest(requestUrl)
  if (configured) return configured

  return new URL('/auth/callback', requestUrl.origin).toString()
}
