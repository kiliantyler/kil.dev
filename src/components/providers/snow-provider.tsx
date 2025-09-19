'use client'

import { themes } from '@/lib/themes'
import dynamic from 'next/dynamic'
import * as React from 'react'

export function SnowProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = React.useState(false)
  const Snowfall = React.useMemo(
    () => dynamic(() => import('react-snowfall').then(m => m.default), { ssr: false, loading: () => null }),
    [],
  )

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setIsActive(false)
      return
    }

    const root = document.documentElement
    const themeNames = themes.map(t => t.name)
    const update = () => {
      const activeName = themeNames.find(n => root.classList.contains(n))
      const cfg = themes.find(t => t.name === activeName)
      const enableSnow = !!(cfg && 'enableSnow' in cfg && cfg.enableSnow)
      setIsActive(enableSnow)
    }

    update()

    const observer = new MutationObserver(() => update())
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  return (
    <>
      {children}
      {isActive && Snowfall ? (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-10">
          <Snowfall snowflakeCount={160} style={{ width: '100%', height: '100%' }} />
        </div>
      ) : null}
    </>
  )
}
