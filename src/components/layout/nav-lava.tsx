'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import { NAVIGATION } from '@/lib/constants'
import { cn } from '@/lib/utils'

type NavigationItem = (typeof NAVIGATION)[number]

function getActiveIndex(items: readonly NavigationItem[], pathname: string) {
  if (!pathname) return -1
  const index = items.findIndex(item => !item.href.startsWith('#') && item.href === pathname)
  return index
}

function NavigationLava() {
  const pathname = usePathname()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const linkRefs = React.useRef<Record<string, HTMLAnchorElement | null>>({})

  const [indicator, setIndicator] = React.useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  })

  const activeIndex = React.useMemo(() => getActiveIndex(NAVIGATION, pathname ?? ''), [pathname])

  const moveIndicatorTo = React.useCallback((key: string) => {
    const container = containerRef.current
    const target = linkRefs.current[key]
    if (!container || !target) return

    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()

    const left = targetRect.left - containerRect.left
    const width = targetRect.width - 8
    setIndicator({ left, width, visible: true })
  }, [])

  const hideIndicator = React.useCallback(() => {
    setIndicator(prev => ({ ...prev, visible: false }))
  }, [])

  // On mount or route change, snap to active route if available
  React.useEffect(() => {
    if (activeIndex >= 0) {
      if (!NAVIGATION[activeIndex]) return
      const key = NAVIGATION[activeIndex].href
      // wait next frame for layout
      const id = requestAnimationFrame(() => moveIndicatorTo(key))
      return () => cancelAnimationFrame(id)
    }
    hideIndicator()
  }, [activeIndex, moveIndicatorTo, hideIndicator])

  const handleMouseLeaveContainer = React.useCallback(() => {
    if (activeIndex >= 0) {
      if (!NAVIGATION[activeIndex]) return
      moveIndicatorTo(NAVIGATION[activeIndex].href)
      return
    }
    hideIndicator()
  }, [activeIndex, hideIndicator, moveIndicatorTo])

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()

    const focusable = NAVIGATION.map(item => linkRefs.current[item.href]).filter(Boolean) as HTMLAnchorElement[]
    if (focusable.length === 0) return

    const currentIndex = focusable.findIndex(el => el === document.activeElement)
    const delta = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (currentIndex + delta + focusable.length) % focusable.length
    if (!focusable[nextIndex]) return
    focusable[nextIndex].focus()
  }, [])

  return (
    <nav className="hidden md:flex items-center" aria-label="Primary">
      <div
        ref={containerRef}
        className="relative flex items-center gap-1 rounded-lg p-1"
        onMouseLeave={handleMouseLeaveContainer}
        onKeyDown={handleKeyDown}
        role="menubar"
        aria-orientation="horizontal">
        {/* Sliding indicator */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1 bottom-1 z-0 rounded-md bg-accent/60 backdrop-blur-sm shadow-sm transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
            indicator.visible ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
          }}
        />

        {NAVIGATION.map(item => {
          const isExternal = item.href.startsWith('http')
          const isActive = !item.href.startsWith('#') && item.href === pathname
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={node => {
                if (node) {
                  linkRefs.current[item.href] = node
                }
              }}
              className={cn(
                'relative z-10 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors',
                'hover:text-accent-foreground focus:text-accent-foreground',
                isActive ? 'text-accent-foreground' : 'text-muted-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
              role="menuitem"
              onMouseEnter={() => moveIndicatorTo(item.href)}
              onFocus={() => moveIndicatorTo(item.href)}
              {...(isExternal && {
                target: '_blank',
                rel: 'noopener noreferrer',
              })}>
              <span className="relative">
                {item.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-current transition-all duration-300 ease-out group-hover:w-full" />
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export { NavigationLava }
