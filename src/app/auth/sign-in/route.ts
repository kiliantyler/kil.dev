import { requireAdminAuthEnv } from '@/env'
import { getSignInUrl } from '@workos-inc/authkit-nextjs'
import { connection, NextResponse, type NextRequest } from 'next/server'

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

export async function GET(request: NextRequest) {
  await connection()
  const { PET_GALLERY_WORKOS_ORG_ID } = requireAdminAuthEnv()
  const signInUrl = await getSignInUrl({
    organizationId: PET_GALLERY_WORKOS_ORG_ID,
    returnTo: readSafeReturnTo(request),
  })

  return NextResponse.redirect(signInUrl)
}
