'use client'

import dynamic from 'next/dynamic'
import * as React from 'react'

import { themes } from '@/lib/themes'
import { useTheme } from './theme-provider'

const Snowfall = dynamic(() => import('react-snowfall').then(m => m.default), {
  ssr: false,
  loading: () => null,
})

export function SnowProvider({ children }: { children: React.ReactNode }) {
  const { theme, systemTheme } = useTheme()
  const [isActive, setIsActive] = React.useState(false)

  React.useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const themeNames = themes.map(t => t.name)
    const supportsFlag = (
      t: (typeof themes)[number] | undefined,
    ): t is (typeof themes)[number] & { enableSnow?: boolean } => Boolean(t && 'enableSnow' in t)
    const update = () => {
      const activeName = themeNames.find(n => root.classList.contains(n))
      const cfg = themes.find(t => t.name === activeName)
      setIsActive(supportsFlag(cfg) ? Boolean(cfg.enableSnow) : false)
    }

    update()

    const observer = new MutationObserver(() => update())
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [theme, systemTheme])

  return (
    <>
      {children}
      {isActive ? (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
          <Snowfall snowflakeCount={160} style={{ width: '100%', height: '100%' }} />
        </div>
      ) : null}
    </>
  )
}
