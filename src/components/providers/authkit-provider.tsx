'use client'

import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components'
import type { ReactNode } from 'react'

export function SiteAuthKitProvider({ children }: { children: ReactNode }) {
  return <AuthKitProvider>{children}</AuthKitProvider>
}
