'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

type ScrollbarCompensatorProps = {
  children: React.ReactNode
}

function measureScrollbarWidth(): number {
  if (typeof document === 'undefined') return 0
  const scrollBox = document.createElement('div')
  scrollBox.style.width = '100px'
  scrollBox.style.height = '100px'
  scrollBox.style.overflowY = 'scroll'
  scrollBox.style.position = 'absolute'
  scrollBox.style.top = '-9999px'
  document.body.appendChild(scrollBox)
  const width = scrollBox.offsetWidth - scrollBox.clientWidth
  document.body.removeChild(scrollBox)
  return width
}

export function ScrollbarCompensator({ children }: ScrollbarCompensatorProps) {
  const pathname = usePathname()
  const [paddingRight, setPaddingRight] = useState<number>(0)
  const measuredWidthRef = useRef<number | null>(null)

  const calculatePadding = useCallback(() => {
    if (typeof window === 'undefined') return
    const docEl = document.documentElement
    const hasVerticalScrollbar = docEl.scrollHeight > docEl.clientHeight

    measuredWidthRef.current ??= measureScrollbarWidth()

    setPaddingRight(hasVerticalScrollbar ? 0 : Math.max(0, measuredWidthRef.current))
  }, [])

  useEffect(() => {
    calculatePadding()
  }, [pathname, calculatePadding])

  useEffect(() => {
    calculatePadding()

    const handleResize = () => calculatePadding()
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    // Some content (like images/fonts) can affect scroll height post-load
    window.addEventListener('load', handleResize)

    const ro = new ResizeObserver(() => calculatePadding())
    ro.observe(document.documentElement)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      window.removeEventListener('load', handleResize)
      ro.disconnect()
    }
  }, [calculatePadding])

  return <div style={{ paddingRight: paddingRight > 0 ? `${paddingRight}px` : undefined }}>{children}</div>
}
