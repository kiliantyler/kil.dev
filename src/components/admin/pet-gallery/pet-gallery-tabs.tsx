'use client'

import { LavaFallbackIndicator, LavaIndicator, type LavaIndicatorState } from '@/components/ui/lava-indicator'
import { cn } from '@/utils/utils'
import { useCallback, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'

export const PET_GALLERY_ADMIN_TABS = ['photos', 'animals', 'publish'] as const

export type PetGalleryAdminTab = (typeof PET_GALLERY_ADMIN_TABS)[number]

const TAB_LABELS: Record<PetGalleryAdminTab, string> = {
  photos: 'Photos',
  animals: 'Animals',
  publish: 'Publish',
}

export function normalizePetGalleryAdminTab(value: string | null): PetGalleryAdminTab {
  return PET_GALLERY_ADMIN_TABS.includes(value as PetGalleryAdminTab) ? (value as PetGalleryAdminTab) : 'photos'
}

type PetGalleryTabsProps = {
  activeTab: PetGalleryAdminTab
  onTabChange: (tab: PetGalleryAdminTab) => void
}

export function PetGalleryTabs({ activeTab, onTabChange }: PetGalleryTabsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const tabRefs = useRef(new Map<PetGalleryAdminTab, HTMLButtonElement>())
  const didInitRef = useRef(false)
  const [hoveredTab, setHoveredTab] = useState<PetGalleryAdminTab | null>(null)
  const [indicator, setIndicator] = useState<LavaIndicatorState>({
    left: 0,
    width: 0,
    visible: false,
    animate: false,
  })

  const moveIndicatorTo = useCallback((tab: PetGalleryAdminTab, animate: boolean) => {
    const container = containerRef.current
    const target = tabRefs.current.get(tab)
    if (!container || !target) return

    setIndicator({
      left: target.offsetLeft + 4,
      width: Math.max(0, target.offsetWidth - 8),
      visible: true,
      animate,
    })
  }, [])

  const returnIndicatorToActiveTab = useCallback(() => {
    setHoveredTab(null)
    moveIndicatorTo(activeTab, didInitRef.current)
  }, [activeTab, moveIndicatorTo])

  function selectTab(tab: PetGalleryAdminTab) {
    if (globalThis.window !== undefined) {
      const url = new URL(globalThis.location.href)
      if (tab === 'photos') url.searchParams.delete('tab')
      else url.searchParams.set('tab', tab)
      globalThis.history.replaceState(globalThis.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    }
    onTabChange(tab)
  }

  useLayoutEffect(() => {
    if (didInitRef.current) {
      moveIndicatorTo(hoveredTab ?? activeTab, true)
      return
    }

    moveIndicatorTo(activeTab, false)
    requestAnimationFrame(() => {
      moveIndicatorTo(activeTab, false)
      didInitRef.current = true
      setIndicator(previous => ({ ...previous, animate: true }))
    })
  }, [activeTab, hoveredTab, moveIndicatorTo])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return

    let frameId = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => moveIndicatorTo(hoveredTab ?? activeTab, didInitRef.current))
    })
    observer.observe(container)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [activeTab, hoveredTab, moveIndicatorTo])

  function focusTab(tab: PetGalleryAdminTab) {
    tabRefs.current.get(tab)?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, tab: PetGalleryAdminTab) {
    const currentIndex = PET_GALLERY_ADMIN_TABS.indexOf(tab)
    let nextTab: PetGalleryAdminTab | undefined

    if (event.key === 'ArrowRight') {
      nextTab = PET_GALLERY_ADMIN_TABS[(currentIndex + 1) % PET_GALLERY_ADMIN_TABS.length]
    } else if (event.key === 'ArrowLeft') {
      nextTab =
        PET_GALLERY_ADMIN_TABS[(currentIndex - 1 + PET_GALLERY_ADMIN_TABS.length) % PET_GALLERY_ADMIN_TABS.length]
    } else if (event.key === 'Home') {
      nextTab = PET_GALLERY_ADMIN_TABS[0]
    } else if (event.key === 'End') {
      nextTab = PET_GALLERY_ADMIN_TABS.at(-1)
    }

    if (!nextTab) return
    event.preventDefault()
    focusTab(nextTab)
    selectTab(nextTab)
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget as Node | null
    if (next && containerRef.current?.contains(next)) return
    returnIndicatorToActiveTab()
  }

  return (
    <div className="border-y border-border/80 py-2">
      <div
        ref={containerRef}
        role="tablist"
        aria-label="Pet gallery admin sections"
        className="relative flex gap-1 overflow-x-auto rounded-lg p-1"
        onMouseLeave={returnIndicatorToActiveTab}
        onBlur={handleBlur}
        data-testid="pet-gallery-admin-tabs">
        <LavaIndicator indicator={indicator} />
        {PET_GALLERY_ADMIN_TABS.map(tab => {
          const selected = activeTab === tab
          const showFallback = selected && !indicator.visible && (!hoveredTab || hoveredTab === tab)
          return (
            <button
              key={tab}
              ref={element => {
                if (element) tabRefs.current.set(tab, element)
                else tabRefs.current.delete(tab)
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`pet-gallery-${tab}-panel`}
              id={`pet-gallery-${tab}-tab`}
              tabIndex={selected ? 0 : -1}
              className={cn(
                'relative z-10 h-9 shrink-0 rounded-md border border-transparent px-3 text-sm font-medium transition-colors outline-none',
                selected && (!hoveredTab || hoveredTab === tab)
                  ? 'text-white dark:text-primary-foreground'
                  : 'text-foreground hover:text-white focus:text-white dark:text-muted-foreground dark:hover:text-primary-foreground dark:focus:text-primary-foreground',
              )}
              onMouseEnter={() => {
                setHoveredTab(tab)
                moveIndicatorTo(tab, true)
              }}
              onFocus={() => {
                setHoveredTab(tab)
                moveIndicatorTo(tab, true)
              }}
              onKeyDown={event => handleKeyDown(event, tab)}
              onClick={() => selectTab(tab)}>
              {showFallback && <LavaFallbackIndicator />}
              <span className="relative z-10">{TAB_LABELS[tab]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
