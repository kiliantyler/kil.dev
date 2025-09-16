'use client'

import type { Route } from 'next'
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

      const container = containerRef.current
      if (!container) return

      const anchors = Array.from(container.querySelectorAll('a'))
      const focusable = anchors.filter(el => {
        if (el.hasAttribute('disabled')) return false
        if (el.getAttribute('aria-hidden') === 'true') return false
        const tabIndexAttr = el.getAttribute('tabindex')
        if (tabIndexAttr !== null && Number(tabIndexAttr) < 0) return false
        if (el.offsetParent === null) return false
        return true
      })
      if (focusable.length === 0) return

      const currentIndex = focusable.findIndex(el => el === document.activeElement)
      const delta = event.key === 'ArrowRight' ? 1 : -1
      const nextIndex =
        currentIndex === -1
          ? delta > 0
            ? 0
            : focusable.length - 1
          : (currentIndex + delta + focusable.length) % focusable.length
      focusable[nextIndex]?.focus()
    },
    [containerRef],
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
          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              isActive={isActive}
              isExternal={isExternal}
              indicatorVisible={indicator.visible}
              hoveredKey={hoveredKey}
              setHoveredKey={setHoveredKey}
              moveIndicatorTo={moveIndicatorTo}
              registerRef={(href, node) => {
                if (node) linkRefs.current[href] = node
              }}
              showUnderline
            />
          )
        })}

        {/* Achievements link (hidden by default, shown via data attribute set pre-hydration) */}
        <NavLink
          key="/achievements"
          href="/achievements"
          label="Achievements"
          isActive={pathname === '/achievements'}
          indicatorVisible={indicator.visible}
          hoveredKey={hoveredKey}
          setHoveredKey={setHoveredKey}
          moveIndicatorTo={moveIndicatorTo}
          registerRef={(href, node) => {
            if (node) linkRefs.current[href] = node
          }}
          className="js-achievements-nav"
        />

        {/* Pet Gallery link (hidden by default, shown via data attribute set pre-hydration) */}
        <NavLink
          key="/pet-gallery"
          href="/pet-gallery"
          label="Pet Gallery"
          isActive={pathname === '/pet-gallery'}
          indicatorVisible={indicator.visible}
          hoveredKey={hoveredKey}
          setHoveredKey={setHoveredKey}
          moveIndicatorTo={moveIndicatorTo}
          registerRef={(href, node) => {
            if (node) linkRefs.current[href] = node
          }}
          className="js-pet-gallery-nav"
        />
      </div>
    </nav>
  )
}

type NavLinkProps = {
  href: Route
  label: string
  isActive: boolean
  indicatorVisible: boolean
  hoveredKey: string | null
  setHoveredKey: (key: string | null) => void
  moveIndicatorTo: (key: string, animate: boolean) => void
  registerRef: (href: string, node: HTMLAnchorElement | null) => void
  className?: string
  isExternal?: boolean
  showUnderline?: boolean
}

function NavLink(props: NavLinkProps) {
  const {
    href,
    label,
    isActive,
    indicatorVisible,
    hoveredKey,
    setHoveredKey,
    moveIndicatorTo,
    registerRef,
    className,
    isExternal,
    showUnderline = false,
  } = props

  const external = typeof isExternal === 'boolean' ? isExternal : href.startsWith('http')
  const showFallback = isActive && !indicatorVisible && (!hoveredKey || hoveredKey === href)

  return (
    <Link
      href={href}
      ref={node => registerRef(href, node)}
      className={cn(
        'relative z-10 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors',
        NAV_TEXT.base,
        NAV_TEXT.hover,
        isActive && (!hoveredKey || hoveredKey === href) ? NAV_TEXT.active : undefined,
        className,
      )}
      aria-current={isActive ? 'page' : undefined}
      role="menuitem"
      onMouseEnter={() => {
        setHoveredKey(href)
        moveIndicatorTo(href, true)
      }}
      onFocus={() => {
        setHoveredKey(href)
        moveIndicatorTo(href, true)
      }}
      {...(external && {
        target: '_blank' as const,
        rel: 'noopener noreferrer',
      })}>
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
        {label}
        {showUnderline && (
          <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-current transition-all duration-300 ease-out group-hover:w-full" />
        )}
      </span>
    </Link>
  )
}
