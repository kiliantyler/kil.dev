'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import { LavaFallbackIndicator, LavaIndicator, type LavaIndicatorState } from '@/components/ui/lava-indicator'
import { usePresenceGates } from '@/hooks/use-presence-gates'
import { NAVIGATION } from '@/lib/navmenu'
import { cn } from '@/utils/utils'

type SimpleNavItem = { href: Route; label: string }

const NAV_TEXT = {
  base: 'text-foreground dark:text-muted-foreground select-none',
  hover: 'hover:text-white focus:text-white dark:hover:text-primary-foreground dark:focus:text-primary-foreground',
  active: 'text-white dark:text-primary-foreground',
} as const

function getActiveIndex(items: readonly SimpleNavItem[], pathname: string) {
  if (!pathname) return -1
  const index = items.findIndex(item => !item.href.startsWith('#') && item.href === pathname)
  return index
}

export function NavLava() {
  const pathname = usePathname()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const linkRefs = React.useRef<Record<string, HTMLAnchorElement | null>>({})
  const didInitRef = React.useRef(false)
  const baseItems = React.useMemo(() => NAVIGATION, [])
  const { allowAchievements, allowPetGallery } = usePresenceGates()

  // Items considered for active detection (may include gated links)
  const activeItems = React.useMemo<SimpleNavItem[]>(() => {
    const list: SimpleNavItem[] = baseItems.map(({ href, label }) => ({ href, label }))
    if (allowAchievements) list.push({ href: '/achievements' as Route, label: 'Achievements' })
    if (allowPetGallery) list.push({ href: '/pet-gallery' as Route, label: 'Pet Gallery' })
    // Ensure current gated route remains included even if gate toggles off mid-session
    if (pathname === '/achievements' && !list.some(i => i.href === '/achievements')) {
      list.push({ href: '/achievements' as Route, label: 'Achievements' })
    }
    if (pathname === '/pet-gallery' && !list.some(i => i.href === '/pet-gallery')) {
      list.push({ href: '/pet-gallery' as Route, label: 'Pet Gallery' })
    }
    return list
  }, [baseItems, allowAchievements, allowPetGallery, pathname])

  const [indicator, setIndicator] = React.useState<LavaIndicatorState>({
    left: 0,
    width: 0,
    visible: false,
    animate: false,
  })
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null)

  const activeIndex = React.useMemo(() => getActiveIndex(activeItems, pathname ?? ''), [activeItems, pathname])

  const moveIndicatorTo = React.useCallback((key: string, animate: boolean) => {
    const container = containerRef.current
    const target = linkRefs.current[key]
    if (!container || !target) return

    // Center the indicator by offsetting left by 4px (since we reduce width by 8px)
    const left = target.offsetLeft + 4
    const width = Math.max(0, target.offsetWidth - 8)

    setIndicator({ left, width, visible: true, animate })
  }, [])

  const hideIndicator = React.useCallback(() => {
    setIndicator(prev => ({ ...prev, visible: false }))
  }, [])

  // On mount: snap without animation, then enable animations; on route change: animate
  React.useLayoutEffect(() => {
    if (activeIndex >= 0) {
      if (!activeItems[activeIndex]) return
      const key = activeItems[activeIndex].href
      if (didInitRef.current) {
        moveIndicatorTo(key, true)
      } else {
        moveIndicatorTo(key, false)
        requestAnimationFrame(() => {
          // Re-measure once more after first frame to avoid hydration/layout shifts
          moveIndicatorTo(key, false)
          didInitRef.current = true
          setIndicator(prev => ({ ...prev, animate: true }))
        })
      }
      return
    }
    hideIndicator()
  }, [activeIndex, moveIndicatorTo, hideIndicator, activeItems])

  React.useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return

    let frameId = 0
    const scheduleMeasure = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        const activeKey = activeIndex >= 0 ? activeItems[activeIndex]?.href : null
        const key = hoveredKey ?? activeKey
        if (key) {
          moveIndicatorTo(key, didInitRef.current)
          return
        }
        hideIndicator()
      })
    }

    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(container)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [activeIndex, activeItems, hoveredKey, moveIndicatorTo, hideIndicator])

  const handleMouseLeaveContainer = React.useCallback(() => {
    setHoveredKey(null)
    if (activeIndex >= 0) {
      if (!activeItems[activeIndex]) return
      moveIndicatorTo(activeItems[activeIndex].href, true)
      return
    }
    hideIndicator()
  }, [activeIndex, hideIndicator, moveIndicatorTo, activeItems])

  const handleBlurContainer = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const container = containerRef.current
      const next = event.relatedTarget as Node | null
      if (!container || (next && container.contains(next))) return
      setHoveredKey(null)
      if (activeIndex >= 0 && activeItems[activeIndex]) {
        moveIndicatorTo(activeItems[activeIndex].href, true)
        return
      }
      hideIndicator()
    },
    [activeIndex, moveIndicatorTo, hideIndicator, activeItems],
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
        if (globalThis.getComputedStyle(el).visibility === 'hidden') return false
        const tabIndexAttr = el.getAttribute('tabindex')
        if (tabIndexAttr !== null && Number(tabIndexAttr) < 0) return false
        if (el.offsetParent === null) return false
        return true
      })
      if (focusable.length === 0) return

      const currentIndex = focusable.indexOf(document.activeElement as HTMLAnchorElement)
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
    <nav className="hidden items-center nav:flex" aria-label="Primary">
      <div
        ref={containerRef}
        className="relative flex items-center gap-1 rounded-lg p-1"
        onMouseLeave={handleMouseLeaveContainer}
        onBlur={handleBlurContainer}
        onKeyDown={handleKeyDown}
        role="menubar"
        aria-orientation="horizontal">
        <LavaIndicator indicator={indicator} />

        {baseItems.map(item => {
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
          testId="nav-achievements"
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
          testId="nav-pet-gallery"
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
  testId?: string
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
        'relative z-10 mx-0.5 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none',
        NAV_TEXT.base,
        NAV_TEXT.hover,
        isActive && (!hoveredKey || hoveredKey === href) ? NAV_TEXT.active : undefined,
        className,
      )}
      aria-current={isActive ? 'page' : undefined}
      data-testid={props.testId}
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
      {showFallback && <LavaFallbackIndicator />}
      <span className="relative z-10">
        {label}
        {showUnderline && (
          <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-current transition-all duration-300 ease-out group-hover:w-full" />
        )}
      </span>
    </Link>
  )
}
