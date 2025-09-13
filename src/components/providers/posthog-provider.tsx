'use client'

import { env } from '@/env'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const isDev = env.NODE_ENV !== 'production'
  const posthogKey = env.NEXT_PUBLIC_POSTHOG_KEY

  useEffect(() => {
    if (isDev) return
    if (!posthogKey) return

    posthog.init(posthogKey, {
      api_host: '/vibecheck',
      ui_host: 'https://us.posthog.com',
      defaults: '2025-05-24',
      capture_exceptions: true,
      debug: false,
    })
  }, [isDev, posthogKey])

  if (isDev) return <>{children}</>

  return <PHProvider client={posthog}>{children}</PHProvider>
}
