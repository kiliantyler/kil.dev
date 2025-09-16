'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import { NAVIGATION } from '@/lib/navmenu'
import { cn } from '@/lib/utils'

type NavigationItem = (typeof NAVIGATION)[number]

const NAV_TEXT = {
  base: 'text-foreground dark:text-muted-foreground select-none',
  hover: 'hover:text-white focus:text-white dark:hover:text-primary-foreground dark:focus:text-primary-foreground',
  active: 'text-white dark:text-primary-foreground',
} as const

function getActiveIndex(items: readonly NavigationItem[], pathname: string) {
  if (!pathname) return -1
  const index = items.findIndex(item => !item.href.startsWith('#') && item.href === pathname)
  return index
}

export function NavLava() {
  const pathname = usePathname()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const linkRefs = React.useRef<Record<string, HTMLAnchorElement | null>>({})
  const didInitRef = React.useRef(false)
  const items = React.useMemo(() => NAVIGATION, [])

  const [indicator, setIndicator] = React.useState<{ left: number; width: number; visible: boolean; animate: boolean }>(
    {
      left: 0,
      width: 0,
      visible: false,
      animate: false,
    },
  )
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null)

  const activeIndex = React.useMemo(() => getActiveIndex(items, pathname ?? ''), [items, pathname])

  const moveIndicatorTo = React.useCallback((key: string, animate: boolean) => {
    const container = containerRef.current
    const target = linkRefs.current[key]
    if (!container || !target) return

    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()

    const left = targetRect.left - containerRect.left
    const width = targetRect.width - 8
    setIndicator({ left, width, visible: true, animate })
  }, [])

  const hideIndicator = React.useCallback(() => {
    setIndicator(prev => ({ ...prev, visible: false }))
  }, [])

  // On mount: snap without animation, then enable animations; on route change: animate
  React.useLayoutEffect(() => {
    if (activeIndex >= 0) {
      if (!items[activeIndex]) return
      const key = items[activeIndex].href
      if (!didInitRef.current) {
        moveIndicatorTo(key, false)
        requestAnimationFrame(() => {
          didInitRef.current = true
          setIndicator(prev => ({ ...prev, animate: true }))
        })
      } else {
        moveIndicatorTo(key, true)
      }
      return
    }
    hideIndicator()
  }, [activeIndex, moveIndicatorTo, hideIndicator, items])

  const handleMouseLeaveContainer = React.useCallback(() => {
    setHoveredKey(null)
    if (activeIndex >= 0) {
      if (!items[activeIndex]) return
      moveIndicatorTo(items[activeIndex].href, true)
      return
    }
    hideIndicator()
  }, [activeIndex, hideIndicator, moveIndicatorTo, items])

  const handleBlurContainer = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const container = containerRef.current
      const next = event.relatedTarget as Node | null
      if (!container || (next && container.contains(next))) return
      setHoveredKey(null)
      if (activeIndex >= 0 && items[activeIndex]) {
        moveIndicatorTo(items[activeIndex].href, true)
        return
      }
      hideIndicator()
    },
    [activeIndex, moveIndicatorTo, hideIndicator, items],
  )

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
      event.preventDefault()

      const focusable = items.map(item => linkRefs.current[item.href]).filter(Boolean) as HTMLAnchorElement[]
      if (focusable.length === 0) return

      const currentIndex = focusable.findIndex(el => el === document.activeElement)
      const delta = event.key === 'ArrowRight' ? 1 : -1
      const nextIndex = (currentIndex + delta + focusable.length) % focusable.length
      if (!focusable[nextIndex]) return
      focusable[nextIndex].focus()
    },
    [items],
  )

  return (
    <nav className="hidden nav:flex items-center" aria-label="Primary">
      <div
        ref={containerRef}
        className="relative flex items-center gap-1 rounded-lg p-1"
        onMouseLeave={handleMouseLeaveContainer}
        onBlur={handleBlurContainer}
        onKeyDown={handleKeyDown}
        role="menubar"
        aria-orientation="horizontal">
        {/* Sliding indicator: trail (slower, blurred) */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1 bottom-1 z-0 rounded-md bg-primary/40 blur-[1.5px] shadow-sm will-change-[transform,width]',
            indicator.animate && 'transition-[transform,width,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
            indicator.visible ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
          }}
        />
        {/* Sliding indicator: main (faster, crisp) */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1 bottom-1 z-10 rounded-md bg-primary backdrop-blur-sm shadow-sm will-change-[transform,width]',
            indicator.animate &&
              'transition-[transform,width,opacity] duration-450 ease-[cubic-bezier(0.2,0.8,0.16,1)]',
            indicator.visible ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
          }}
        />

        {items.map(item => {
          const isExternal = item.href.startsWith('http')
          const isActive = !item.href.startsWith('#') && item.href === pathname
          const showFallback = isActive && !indicator.visible && (!hoveredKey || hoveredKey === item.href)
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
                'relative z-10 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors',
                NAV_TEXT.base,
                NAV_TEXT.hover,
                isActive && (!hoveredKey || hoveredKey === item.href) ? NAV_TEXT.active : undefined,
              )}
              aria-current={isActive ? 'page' : undefined}
              role="menuitem"
              onMouseEnter={() => {
                setHoveredKey(item.href)
                moveIndicatorTo(item.href, true)
              }}
              onFocus={() => {
                setHoveredKey(item.href)
                moveIndicatorTo(item.href, true)
              }}
              {...(isExternal && {
                target: '_blank',
                rel: 'noopener noreferrer',
              })}>
              {/* Initial SSR fallback so active link is highlighted immediately */}
              {showFallback && (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 left-1 right-1 z-0 rounded-md bg-primary/40 blur-[1.5px] shadow-sm"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 left-1 right-1 z-0 rounded-md bg-primary backdrop-blur-sm shadow-sm"
                  />
                </>
              )}
              <span className="relative z-10">
                {item.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-current transition-all duration-300 ease-out group-hover:w-full" />
              </span>
            </Link>
          )
        })}

        {/* Achievements link (hidden by default, shown via data attribute set pre-hydration) */}
        <Link
          key="/achievements"
          href={'/achievements'}
          ref={node => {
            if (node) {
              linkRefs.current['/achievements'] = node
            }
          }}
          className={cn(
            'relative z-10 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors js-achievements-nav',
            NAV_TEXT.base,
            NAV_TEXT.hover,
            pathname === '/achievements' && (!hoveredKey || hoveredKey === '/achievements')
              ? NAV_TEXT.active
              : undefined,
          )}
          aria-current={pathname === '/achievements' ? 'page' : undefined}
          role="menuitem"
          onMouseEnter={() => {
            setHoveredKey('/achievements')
            moveIndicatorTo('/achievements', true)
          }}
          onFocus={() => {
            setHoveredKey('/achievements')
            moveIndicatorTo('/achievements', true)
          }}>
          {pathname === '/achievements' && !indicator.visible && (!hoveredKey || hoveredKey === '/achievements') && (
            <>
              <span
                aria-hidden="true"
                className="absolute top-0 bottom-0 left-1 right-1 z-0 rounded-md bg-primary/40 blur-[1.5px] shadow-sm"
              />
              <span
                aria-hidden="true"
                className="absolute top-0 bottom-0 left-1 right-1 z-0 rounded-md bg-primary backdrop-blur-sm shadow-sm"
              />
            </>
          )}
          <span className="relative z-10">Achievements</span>
        </Link>

        {/* Pet Gallery link (hidden by default, shown via data attribute set pre-hydration) */}
        <Link
          key="/pet-gallery"
          href={'/pet-gallery'}
          ref={node => {
            if (node) {
              linkRefs.current['/pet-gallery'] = node
            }
          }}
          className={cn(
            'relative z-10 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors js-pet-gallery-nav',
            NAV_TEXT.base,
            NAV_TEXT.hover,
            pathname === '/pet-gallery' && (!hoveredKey || hoveredKey === '/pet-gallery') ? NAV_TEXT.active : undefined,
          )}
          aria-current={pathname === '/pet-gallery' ? 'page' : undefined}
          role="menuitem"
          onMouseEnter={() => {
            setHoveredKey('/pet-gallery')
            moveIndicatorTo('/pet-gallery', true)
          }}
          onFocus={() => {
            setHoveredKey('/pet-gallery')
            moveIndicatorTo('/pet-gallery', true)
          }}>
          {pathname === '/pet-gallery' && !indicator.visible && (!hoveredKey || hoveredKey === '/pet-gallery') && (
            <>
              <span
                aria-hidden="true"
                className="absolute top-0 bottom-0 left-1 right-1 z-0 rounded-md bg-primary/40 blur-[1.5px] shadow-sm"
              />
              <span
                aria-hidden="true"
                className="absolute top-0 bottom-0 left-1 right-1 z-0 rounded-md bg-primary backdrop-blur-sm shadow-sm"
              />
            </>
          )}
          <span className="relative z-10">Pet Gallery</span>
        </Link>
      </div>
    </nav>
  )
}
