import { requireAdminAuthEnv } from '@/env'
import {
  ADMIN_TEST_BYPASS_COOKIE,
  ADMIN_TEST_BYPASS_COOKIE_VALUE,
  isAdminTestBypassEnvEnabled,
} from '@/lib/admin-test-bypass'
import { withAuth } from '@workos-inc/authkit-nextjs'
import { cookies, headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

export class AdminUnauthorizedError extends Error {
  constructor() {
    super('Admin access denied')
    this.name = 'AdminUnauthorizedError'
  }
}

type AuthKitSession = Awaited<ReturnType<typeof withAuth>>
type AuthKitUser = NonNullable<AuthKitSession['user']> & {
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  name?: string | null
}

export type AdminAuthContext = {
  session: AuthKitSession
  user: AuthKitUser
  email: string
  workosUserId: string
  workosOrgId: string
  accessToken: string
}

export type AdminSessionContext = Omit<AdminAuthContext, 'accessToken'> & {
  accessToken?: string
}

type AdminAuthEnv = ReturnType<typeof requireAdminAuthEnv>

type AdminAuthCandidate = {
  session: AuthKitSession
  user: AuthKitUser | null
  email: string | null
  workosUserId: string | null
  workosOrgId: string | null
  accessToken: unknown
}

const TEST_ADMIN_EMAIL = 'admin-e2e@example.invalid'
const TEST_ADMIN_ORG_ID = 'org_test_pet_gallery_e2e'
const TEST_ADMIN_USER_ID = 'user_test_pet_gallery_e2e'

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase()
  return trimmed || null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function readJwtOrgId(token: string | undefined): string | null {
  const payload = token?.split('.')[1]
  if (!payload) return null

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>
    return typeof claims.org_id === 'string' && claims.org_id.trim() ? claims.org_id.trim() : null
  } catch {
    return null
  }
}

function readTrustedOrganizationId(session: AuthKitSession): string | null {
  const record = asRecord(session)
  const direct = record?.organizationId
  if (typeof direct === 'string' && direct.trim()) return direct.trim()

  return readJwtOrgId(typeof record?.accessToken === 'string' ? record.accessToken : undefined)
}

function hasUsableAccessToken(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

async function readAdminAuthCandidate(): Promise<AdminAuthCandidate> {
  const session = await withAuth()
  const user = session.user as AuthKitUser | null
  const email = normalizeEmail(user?.email)
  const workosUserId = typeof user?.id === 'string' && user.id.trim() ? user.id.trim() : null
  const workosOrgId = readTrustedOrganizationId(session)
  const accessToken = asRecord(session)?.accessToken

  return {
    session,
    user,
    email,
    workosUserId,
    workosOrgId,
    accessToken,
  }
}

function toAdminAuthContext(candidate: AdminAuthCandidate, env: AdminAuthEnv): AdminAuthContext | null {
  const { PET_GALLERY_ADMIN_EMAIL, PET_GALLERY_WORKOS_ORG_ID } = env

  if (
    !candidate.user ||
    !candidate.workosUserId ||
    !candidate.email ||
    candidate.email !== PET_GALLERY_ADMIN_EMAIL.toLowerCase() ||
    candidate.workosOrgId !== PET_GALLERY_WORKOS_ORG_ID ||
    !hasUsableAccessToken(candidate.accessToken)
  ) {
    return null
  }

  return {
    session: candidate.session,
    user: candidate.user,
    email: candidate.email,
    workosUserId: candidate.workosUserId,
    workosOrgId: candidate.workosOrgId,
    accessToken: candidate.accessToken,
  }
}

function shouldReauthenticateConfiguredAdminForOrganization(candidate: AdminAuthCandidate, env: AdminAuthEnv) {
  return (
    !!candidate.user &&
    !!candidate.workosUserId &&
    candidate.email === env.PET_GALLERY_ADMIN_EMAIL.toLowerCase() &&
    candidate.workosOrgId !== env.PET_GALLERY_WORKOS_ORG_ID
  )
}

async function getAdminReturnPathname() {
  const headersList = await headers()
  const requestUrl = headersList.get('x-url')
  if (!requestUrl) return '/admin'

  try {
    const url = new URL(requestUrl)
    return `${url.pathname}${url.search}`
  } catch {
    return '/admin'
  }
}

async function redirectToConfiguredAdminSignIn(): Promise<never> {
  const returnTo = encodeURIComponent(await getAdminReturnPathname())
  redirect(`/auth/sign-in?returnTo=${returnTo}` as Parameters<typeof redirect>[0])
}

async function readTestAdminBypass(): Promise<AdminSessionContext | null> {
  if (!isAdminTestBypassEnvEnabled()) return null

  const requestCookies = await cookies()
  if (requestCookies.get(ADMIN_TEST_BYPASS_COOKIE)?.value !== ADMIN_TEST_BYPASS_COOKIE_VALUE) return null

  const user = {
    id: TEST_ADMIN_USER_ID,
    email: TEST_ADMIN_EMAIL,
    firstName: 'Pet Gallery',
    lastName: 'E2E',
    name: 'Pet Gallery E2E',
  } as AuthKitUser
  const session = {
    user,
    organizationId: TEST_ADMIN_ORG_ID,
    sessionId: 'session_test_pet_gallery_e2e',
  } as AuthKitSession

  return {
    session,
    user,
    email: TEST_ADMIN_EMAIL,
    workosUserId: TEST_ADMIN_USER_ID,
    workosOrgId: TEST_ADMIN_ORG_ID,
  }
}

export function displayNameForAdminUser(user: AuthKitUser): string | undefined {
  const firstLast = [user.firstName, user.lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')

  if (firstLast) return firstLast
  return typeof user.name === 'string' && user.name.trim() ? user.name.trim() : undefined
}

export async function requireAdminAuthContext(): Promise<AdminAuthContext> {
  const context = toAdminAuthContext(await readAdminAuthCandidate(), requireAdminAuthEnv())
  if (!context) throw new AdminUnauthorizedError()

  return context
}

export async function requireAdminSession() {
  try {
    const testAdmin = await readTestAdminBypass()
    if (testAdmin) return testAdmin

    const env = requireAdminAuthEnv()
    const candidate = await readAdminAuthCandidate()
    const context = toAdminAuthContext(candidate, env)
    if (context) return context

    if (!candidate.user) {
      await redirectToConfiguredAdminSignIn()
    }

    if (shouldReauthenticateConfiguredAdminForOrganization(candidate, env)) {
      await redirectToConfiguredAdminSignIn()
    }

    throw new AdminUnauthorizedError()
  } catch (error) {
    if (error instanceof AdminUnauthorizedError) notFound()
    throw error
  }
}
