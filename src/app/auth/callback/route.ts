import { handleAuth } from '@workos-inc/authkit-nextjs'
import { sealData } from 'iron-session'
import { connection, type NextRequest } from 'next/server'

const WORKOS_SESSION_COOKIE = process.env.WORKOS_COOKIE_NAME || 'wos-session'
const DEFAULT_WORKOS_COOKIE_MAX_AGE = 60 * 60 * 24 * 400

type AuthKitCookieSession = {
  accessToken: string
  refreshToken: string
  user: unknown
  impersonator?: unknown
  authenticationMethod?: unknown
}

function readCookieSameSite() {
  const sameSite = process.env.WORKOS_COOKIE_SAMESITE?.trim().toLowerCase()
  if (sameSite === 'strict' || sameSite === 'none') return sameSite
  return 'lax'
}

function readCookieMaxAge() {
  const configuredMaxAge = process.env.WORKOS_COOKIE_MAX_AGE?.trim()
  if (!configuredMaxAge) return DEFAULT_WORKOS_COOKIE_MAX_AGE

  const parsedMaxAge = Number.parseInt(configuredMaxAge, 10)
  return Number.isFinite(parsedMaxAge) ? parsedMaxAge : DEFAULT_WORKOS_COOKIE_MAX_AGE
}

function shouldSetSecureCookie(request: NextRequest, sameSite: string) {
  if (sameSite === 'none') return true

  const redirectUri = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI?.trim()
  if (redirectUri) {
    try {
      return new URL(redirectUri).protocol === 'https:'
    } catch {
      return process.env.NODE_ENV === 'production'
    }
  }

  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if (forwardedProtocol) return forwardedProtocol === 'https'

  const requestUrl = request.nextUrl ?? new URL(request.url)
  return requestUrl.protocol === 'https:' || process.env.NODE_ENV === 'production'
}

function serializeWorkOSSessionCookie(request: NextRequest, encryptedSession: string) {
  const sameSite = readCookieSameSite()
  const parts = [
    `${WORKOS_SESSION_COOKIE}=${encryptedSession}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`,
    `Max-Age=${readCookieMaxAge()}`,
  ]

  const domain = process.env.WORKOS_COOKIE_DOMAIN?.trim()
  if (domain) parts.push(`Domain=${domain}`)

  if (shouldSetSecureCookie(request, sameSite)) parts.push('Secure')

  return parts.join('; ')
}

async function sealAuthKitCookieSession(session: AuthKitCookieSession) {
  const password = process.env.WORKOS_COOKIE_PASSWORD
  if (!password || password.length < 32) {
    throw new Error('WORKOS_COOKIE_PASSWORD must be at least 32 characters')
  }

  return sealData(session, { password, ttl: 0 })
}

export async function GET(request: NextRequest) {
  await connection()
  let cookieSession: AuthKitCookieSession | null = null
  const response = await handleAuth({
    onSuccess: ({ accessToken, refreshToken, user, impersonator, authenticationMethod }) => {
      cookieSession = {
        accessToken,
        refreshToken,
        user,
        impersonator,
        authenticationMethod,
      }
    },
  })(request)

  if (cookieSession) {
    response.headers.append(
      'Set-Cookie',
      serializeWorkOSSessionCookie(request, await sealAuthKitCookieSession(cookieSession)),
    )
  }

  return response
}
