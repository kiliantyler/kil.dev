'use client'

import { useTheme } from '@/components/providers/theme-provider'
import { Laptop, Smartphone } from 'lucide-react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { captureThemeChanged } from '@/hooks/posthog'
import { getAvailableThemes, getDefaultThemeForNow } from '@/lib/theme-runtime'
import { getThemeIcon, getThemeLabel, type Theme } from '@/lib/themes'
import { cn } from '@/lib/utils'

function SystemIcon({ className }: { className?: string }) {
  return (
    <>
      <Smartphone suppressHydrationWarning className={cn(className, 'md:hidden')} />
      <Laptop className={cn(className, 'hidden md:inline-block')} />
    </>
  )
}

export function ThemeToggle({
  onFlyoutWidthChange,
  onOpenChange,
}: {
  onFlyoutWidthChange?: (width: number) => void
  onOpenChange?: (open: boolean) => void
} = {}) {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme()
  const { startTransition } = useThemeTransition()

  const currentPreference: Theme = theme ?? 'system'

  const [open, setOpen] = useState(false)
  const [openedViaKeyboard, setOpenedViaKeyboard] = useState(false)
  const [tooltipHold, setTooltipHold] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const optionsRef = useRef<HTMLDivElement | null>(null)

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Prevent background scrolling on small screens when menu is open
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isSm = !window.matchMedia('(min-width: 768px)').matches
    if (!isSm) return
    if (open) {
      const prev = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.documentElement.style.overflow = prev
      }
    }
  }, [open])

  const injectCircleBlurTransitionStyles = useCallback((originXPercent: number, originYPercent: number) => {
    const styleId = `theme-transition-${Date.now()}`
    const style = document.createElement('style')
    style.id = styleId
    const css = `
      @supports (view-transition-name: root) {
        ::view-transition-old(root) {
          animation: none;
        }
        ::view-transition-new(root) {
          animation: circle-blur-expand 0.5s ease-out;
          transform-origin: ${originXPercent}% ${originYPercent}%;
          filter: blur(0);
        }
        @keyframes circle-blur-expand {
          from {
            clip-path: circle(0% at ${originXPercent}% ${originYPercent}%);
            filter: blur(4px);
          }
          to {
            clip-path: circle(150% at ${originXPercent}% ${originYPercent}%);
            filter: blur(0);
          }
        }
      }
    `
    style.textContent = css
    document.head.appendChild(style)
    setTimeout(() => {
      const styleEl = document.getElementById(styleId)
      if (styleEl) {
        styleEl.remove()
      }
    }, 3000)
  }, [])

  const handleThemeChange = useCallback(
    (nextPref: Theme, event?: ReactMouseEvent) => {
      // Keep 'system' as the stored preference; clear localStorage when selecting system
      if (nextPref === 'system') {
        try {
          localStorage.setItem('theme', 'system')
        } catch {}
      }

      // Compute the visual (CSS) theme for current and next preferences,
      // treating the seasonal default as equivalent to explicitly selecting it.
      const seasonalDefault = getDefaultThemeForNow()
      const getVisualTheme = (pref: Theme): Theme => {
        if (pref === 'system') {
          if (seasonalDefault !== 'system') return seasonalDefault as Theme
          const sys = (systemTheme ?? (resolvedTheme === 'dark' ? 'dark' : 'light')) as Theme
          return sys
        }
        return pref
      }

      const currentVisual = getVisualTheme(currentPreference)
      const nextVisual = getVisualTheme(nextPref)

      // If the visual theme isn't changing (e.g., system seasonal -> explicit seasonal),
      // update without animation.
      if (currentVisual === nextVisual) {
        setTheme(nextPref)
        captureThemeChanged(nextPref)
        setOpen(false)
        return
      }

      const viewportWidth = window.innerWidth || 1
      const viewportHeight = window.innerHeight || 1
      const clickX = event?.clientX ?? viewportWidth / 2
      const clickY = event?.clientY ?? viewportHeight / 2
      const originXPercent = Math.max(0, Math.min(100, (clickX / viewportWidth) * 100))
      const originYPercent = Math.max(0, Math.min(100, (clickY / viewportHeight) * 100))

      injectCircleBlurTransitionStyles(originXPercent, originYPercent)
      startTransition(() => {
        setTheme(nextPref)
        captureThemeChanged(nextPref)
      })
      setOpen(false)
    },
    [
      currentPreference,
      injectCircleBlurTransitionStyles,
      resolvedTheme,
      setTheme,
      startTransition,
      systemTheme,
    ],
  )

  // Keep for future logic if needed; currently not used
  // const currentEffective: Theme =
  //   currentPreference === 'system'
  //     ? ((systemTheme ?? (resolvedTheme === 'dark' ? 'dark' : 'light')) as Theme)
  //     : currentPreference

  type IconComponent = ComponentType<{ className?: string }>
  type ThemeOption = { label: string; value: Theme; Icon: IconComponent }

  const iconByTheme = useMemo<Partial<Record<Theme, IconComponent>>>(() => ({ system: SystemIcon }), [])

  const allOptions: ThemeOption[] = useMemo(() => {
    const themeList: readonly Theme[] = getAvailableThemes() as readonly Theme[]
    return themeList.map((t): ThemeOption => {
      const label: string = getThemeLabel(t)
      const resolvedIcon: IconComponent = iconByTheme[t] ?? getThemeIcon(t, SystemIcon)
      return { label, value: t, Icon: resolvedIcon }
    })
  }, [iconByTheme])

  const optionsToShow = useMemo(() => {
    if (currentPreference === 'system') {
      return allOptions.filter(opt => opt.value !== 'system')
    }
    return allOptions.filter(opt => opt.value !== currentPreference)
  }, [allOptions, currentPreference])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setOpen(false)
        setOpenedViaKeyboard(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        setOpenedViaKeyboard(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    // focus first option when opening
    const id = window.setTimeout(() => {
      if (openedViaKeyboard) optionRefs.current[0]?.focus()
    }, 0)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(id)
    }
  }, [open, openedViaKeyboard])

  // Notify parent of open state changes immediately
  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  // Report flyout width to parent (for md+ horizontal layout)
  useEffect(() => {
    if (!onFlyoutWidthChange) return

    const report = () => {
      if (!open) {
        onFlyoutWidthChange(0)
        return
      }
      const isMd = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
      if (!isMd) {
        onFlyoutWidthChange(0)
        return
      }
      const width = optionsRef.current?.getBoundingClientRect().width ?? 0
      onFlyoutWidthChange(width)
    }

    report()
    if (!open) return
    const onResize = () => report()
    window.addEventListener('resize', onResize)
    const id = window.setTimeout(report, 0)
    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(id)
    }
  }, [open, onFlyoutWidthChange, optionsToShow.length])

  useEffect(() => {
    if (open) {
      setTooltipHold(false)
      return
    }
    setTooltipHold(true)
    const id = window.setTimeout(() => setTooltipHold(false), 150)
    return () => window.clearTimeout(id)
  }, [open])

  const handleTriggerKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (open) {
          setOpen(false)
          setOpenedViaKeyboard(false)
        } else {
          setOpen(true)
          setOpenedViaKeyboard(true)
        }
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        setOpen(true)
        setOpenedViaKeyboard(true)
        // focus handled by effect
      }
    },
    [open],
  )

  const handleMenuKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const isHorizontal = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
      const currentIndex = optionRefs.current.findIndex(el => el === document.activeElement)
      if ((isHorizontal && e.key === 'ArrowRight') || (!isHorizontal && e.key === 'ArrowDown')) {
        e.preventDefault()
        const nextIndex = currentIndex < 0 ? 0 : Math.min(optionsToShow.length - 1, currentIndex + 1)
        optionRefs.current[nextIndex]?.focus()
        return
      }
      if ((isHorizontal && e.key === 'ArrowLeft') || (!isHorizontal && e.key === 'ArrowUp')) {
        e.preventDefault()
        const prevIndex = currentIndex < 0 ? 0 : Math.max(0, currentIndex - 1)
        optionRefs.current[prevIndex]?.focus()
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    },
    [optionsToShow.length],
  )

  return (
    <div ref={containerRef} className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls="theme-options"
            onClick={() => {
              setOpen(o => {
                const next = !o
                setOpenedViaKeyboard(false)
                return next
              })
            }}
            onKeyDown={handleTriggerKeyDown}
            className={cn(
              'relative z-50 md:z-auto hover:ring-accent hover:ring-1 hover:ring-offset-2 ring-offset-background transition-all duration-200',
              open && 'ring-1 ring-accent ring-offset-2 scale-95 rotate-3',
            )}>
            {hydrated
              ? (() => {
                  if (currentPreference === 'system') {
                    // When the menu is open, always show the system icon
                    if (open) {
                      return <SystemIcon className="h-[1.2rem] w-[1.2rem]" />
                    }
                    // When closed, show the current effective icon (seasonal if active, else light/dark)
                    const seasonalDefault = getDefaultThemeForNow()
                    if (seasonalDefault !== 'system') {
                      const SeasonalIcon: IconComponent = getThemeIcon(seasonalDefault, SystemIcon)
                      return <SeasonalIcon className="h-[1.2rem] w-[1.2rem]" />
                    }
                    const effective: Theme = (systemTheme ?? (resolvedTheme === 'dark' ? 'dark' : 'light')) as Theme
                    const EffectiveIcon: IconComponent = getThemeIcon(effective, SystemIcon)
                    return <EffectiveIcon className="h-[1.2rem] w-[1.2rem]" />
                  }
                  const Icon: IconComponent = getThemeIcon(currentPreference, SystemIcon)
                  return <Icon className="h-[1.2rem] w-[1.2rem]" />
                })()
              : (() => {
                  // Render a stable, theme-agnostic icon on the server to avoid hydration mismatches
                  return <SystemIcon className="h-[1.2rem] w-[1.2rem]" />
                })()}
            <span className="sr-only">Toggle theme menu</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {(() => {
            if (open || tooltipHold) {
              if (currentPreference === 'system') return 'System'
              return `${currentPreference.slice(0, 1).toUpperCase()}${currentPreference.slice(1)}`
            }
            return 'Theme Toggle'
          })()}
        </TooltipContent>
      </Tooltip>

      {/* Mobile backdrop overlay */}
      <div
        aria-hidden={!open}
        role="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close theme menu"
        onClick={() => {
          setOpen(false)
          setOpenedViaKeyboard(false)
        }}
        onKeyDown={e => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(false)
            setOpenedViaKeyboard(false)
          }
        }}
        className={cn(
          'fixed inset-0 md:hidden z-40 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          // Subtle flashy backdrop: tint + blur + vignette-ish gradient
          'bg-black/40 backdrop-blur-sm',
        )}
      />

      <div
        id="theme-options"
        ref={optionsRef}
        suppressHydrationWarning
        role="menu"
        aria-label="Select theme"
        aria-hidden={!open}
        tabIndex={-1}
        onKeyDown={handleMenuKeyDown}
        className={cn(
          'absolute left-1/2 top-full -translate-x-1/2 mt-2 z-50',
          'flex flex-col items-center gap-2',
          'md:left-auto md:top-1/2 md:right-full md:-translate-y-1/2 md:translate-x-0 md:mt-0 md:mr-2 md:flex-row',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}>
        {hydrated &&
          optionsToShow.map((opt, idx) => (
            <Tooltip key={opt.value}>
              <TooltipTrigger asChild>
                <Button
                  ref={el => {
                    optionRefs.current[idx] = el
                  }}
                  onClick={e => handleThemeChange(opt.value, e)}
                  role="menuitem"
                  aria-label={opt.label}
                  title={opt.label}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'transition-all duration-200 ease-out hover:bg-accent/70',
                    open
                      ? 'opacity-100 translate-y-0 md:translate-x-0 scale-100'
                      : 'opacity-0 -translate-y-2 md:translate-x-2 md:translate-y-0 scale-95',
                  )}
                  style={{ transitionDelay: `${idx * 60}ms` }}>
                  <opt.Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{opt.label}</TooltipContent>
            </Tooltip>
          ))}
      </div>
    </div>
  )
}

export const useThemeTransition = () => {
  const startTransition = useCallback((updateFn: () => void) => {
    if ('startViewTransition' in document) {
      document.startViewTransition(updateFn)
    } else {
      updateFn()
    }
  }, [])
  return { startTransition }
}
