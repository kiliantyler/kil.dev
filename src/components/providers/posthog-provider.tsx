'use client'

import { isDev } from '@/utils/utils'
import { useEffect, useState } from 'react'

const US_POSTHOG_UI_HOST = 'https://us.posthog.com'
const EU_POSTHOG_UI_HOST = 'https://eu.posthog.com'

export function buildPostHogInitOptions(posthogHost: string) {
  const apiHost = posthogHost.trim()

  return {
    api_host: apiHost,
    ui_host: getPostHogUiHost(apiHost),
    defaults: '2025-05-24' as const,
    capture_exceptions: true,
    debug: false,
  }
}

function getPostHogUiHost(apiHost: string) {
  if (apiHost === '/vibecheck' || apiHost === 'https://us.i.posthog.com') return US_POSTHOG_UI_HOST
  if (apiHost === 'https://eu.i.posthog.com') return EU_POSTHOG_UI_HOST

  return apiHost
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
  const canCapture = !isDev() && !!posthogKey && !!posthogHost
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!canCapture || isInitialized) return

    let idleId: number | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    // Defer PostHog initialization until after page is interactive
    const initPostHog = () => {
      import('posthog-js')
        .then(({ default: posthog }) => {
          posthog.init(posthogKey, {
            ...buildPostHogInitOptions(posthogHost),
            // Additional performance optimizations
            loaded: () => {
              setIsInitialized(true)
            },
          })
        })
        .catch(err => {
          console.error('Failed to load PostHog:', err)
        })
    }

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in globalThis) {
      idleId = requestIdleCallback(initPostHog, { timeout: 2000 })
    } else {
      timeoutId = setTimeout(initPostHog, 2000)
    }

    // Cleanup function to cancel scheduled callbacks
    return () => {
      if (idleId !== undefined && 'cancelIdleCallback' in globalThis) {
        cancelIdleCallback(idleId)
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
    }
  }, [canCapture, posthogKey, posthogHost, isInitialized])

  return <>{children}</>
}
