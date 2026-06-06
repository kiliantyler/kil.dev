'use client'

import { LavaFallbackIndicator, LavaIndicator, type LavaIndicatorState } from '@/components/ui/lava-indicator'
import { cn } from '@/utils/utils'
import { useCallback, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'

type AdminLavaTabDefinition<TValue extends string> = {
  value: TValue
  label: string
  panelId: string
  tabId: string
}

type AdminLavaTabsProps<TValue extends string> = {
  tabs: readonly AdminLavaTabDefinition<TValue>[]
  activeTab: TValue
  defaultTab: TValue
  ariaLabel: string
  className?: string
  centered?: boolean
  testId?: string
  onTabChange: (tab: TValue) => void
}

export function AdminLavaTabs<TValue extends string>({
  tabs,
  activeTab,
  defaultTab,
  ariaLabel,
  className,
  centered = false,
  testId,
  onTabChange,
}: AdminLavaTabsProps<TValue>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const tabRefs = useRef(new Map<TValue, HTMLButtonElement>())
  const didInitRef = useRef(false)
  const [hoveredTab, setHoveredTab] = useState<TValue | null>(null)
  const [indicator, setIndicator] = useState<LavaIndicatorState>({
    left: 0,
    width: 0,
    visible: false,
    animate: false,
  })

  const moveIndicatorTo = useCallback((tab: TValue, animate: boolean) => {
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

  function selectTab(tab: TValue) {
    if (globalThis.window !== undefined) {
      const url = new URL(globalThis.location.href)
      if (tab === defaultTab) url.searchParams.delete('tab')
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
    const frameId = requestAnimationFrame(() => {
      moveIndicatorTo(activeTab, false)
      didInitRef.current = true
      setIndicator(previous => ({ ...previous, animate: true }))
    })

    return () => cancelAnimationFrame(frameId)
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

  function focusTab(tab: TValue) {
    tabRefs.current.get(tab)?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, tab: TValue) {
    const currentIndex = tabs.findIndex(item => item.value === tab)
    let nextTab: TValue | undefined

    if (event.key === 'ArrowRight') nextTab = tabs[(currentIndex + 1) % tabs.length]?.value
    else if (event.key === 'ArrowLeft') nextTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length]?.value
    else if (event.key === 'Home') nextTab = tabs[0]?.value
    else if (event.key === 'End') nextTab = tabs.at(-1)?.value

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
    <div className={cn('border-y border-border/80 py-2', className)} data-testid={testId}>
      <div
        ref={containerRef}
        role="tablist"
        aria-label={ariaLabel}
        className={cn('relative flex gap-1 overflow-x-auto rounded-lg p-1', centered && 'mx-auto w-fit max-w-full')}
        onMouseLeave={returnIndicatorToActiveTab}
        onBlur={handleBlur}>
        <LavaIndicator indicator={indicator} />
        {tabs.map(tab => {
          const selected = activeTab === tab.value
          const showFallback = selected && !indicator.visible && (!hoveredTab || hoveredTab === tab.value)
          return (
            <button
              key={tab.value}
              ref={element => {
                if (element) tabRefs.current.set(tab.value, element)
                else tabRefs.current.delete(tab.value)
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={tab.panelId}
              id={tab.tabId}
              tabIndex={selected ? 0 : -1}
              className={cn(
                'relative z-10 h-9 shrink-0 rounded-md border border-transparent px-3 text-sm font-medium transition-colors outline-none',
                selected && (!hoveredTab || hoveredTab === tab.value)
                  ? 'text-white dark:text-primary-foreground'
                  : 'text-foreground hover:text-white focus:text-white dark:text-muted-foreground dark:hover:text-primary-foreground dark:focus:text-primary-foreground',
              )}
              onMouseEnter={() => {
                setHoveredTab(tab.value)
                moveIndicatorTo(tab.value, true)
              }}
              onFocus={() => {
                setHoveredTab(tab.value)
                moveIndicatorTo(tab.value, true)
              }}
              onKeyDown={event => handleKeyDown(event, tab.value)}
              onClick={() => selectTab(tab.value)}>
              {showFallback && <LavaFallbackIndicator />}
              <span className="relative z-10">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
