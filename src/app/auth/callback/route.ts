import { handleAuth } from '@workos-inc/authkit-nextjs'

export const GET = handleAuth({
  baseURL: process.env.VERCEL_ENV === 'preview' ? undefined : process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
})
