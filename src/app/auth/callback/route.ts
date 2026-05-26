import { handleAuth } from '@workos-inc/authkit-nextjs'
import { connection, type NextRequest } from 'next/server'

const handleAuthCallback = handleAuth()

export async function GET(request: NextRequest) {
  await connection()
  return handleAuthCallback(request)
}
