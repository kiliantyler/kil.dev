'use client'

import { useAchievements } from '@/components/providers/achievements-provider'
import { useTheme } from '@/components/providers/theme-provider'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { captureThemeChanged } from '@/hooks/posthog'
import { themes, type Theme } from '@/lib/themes'
import { buildPerThemeVariantCss } from '@/utils/theme-css'
import { getAvailableThemes, getDefaultThemeForNow } from '@/utils/theme-runtime'
import { getThemeIcon, getThemeLabel } from '@/utils/themes'
import { cn, isSafari } from '@/utils/utils'
import { Laptop, Smartphone } from 'lucide-react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'

function SystemIcon({ className }: { className?: string }) {
  return (
    <>
      <Smartphone suppressHydrationWarning className={cn(className, 'md:hidden')} />
      <Laptop className={cn(className, 'hidden md:inline-block')} />
    </>
  )
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme()
  const { startTransition } = useThemeTransition()
  const { unlocked, has, unlock } = useAchievements()

  const currentPreference: Theme = theme ?? 'system'

  const [open, setOpen] = useState(false)
  const [openedViaKeyboard, setOpenedViaKeyboard] = useState(false)
  const [tooltipHold, setTooltipHold] = useState(false)
  const [toggleCount, setToggleCount] = useState(0)
  const [themeSelected, setThemeSelected] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const optionsRef = useRef<HTMLDivElement | null>(null)

  const [hydrated, setHydrated] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Force re-render after achievement state changes to ensure localStorage sync
  useEffect(() => {
    const timer = setTimeout(() => {
      setForceUpdate(prev => prev + 1)

      // Check if current theme is still available after achievement reset
      // Add additional delay to ensure CSS attribute is synchronized
      setTimeout(() => {
        const availableThemes = getAvailableThemes() as readonly Theme[]
        if (currentPreference && !availableThemes.includes(currentPreference)) {
          // Current theme is no longer available, switch to system
          setTheme('system')
        }
      }, 50) // Additional delay for CSS attribute sync
    }, 100) // Small delay to ensure localStorage is updated
    return () => clearTimeout(timer)
  }, [unlocked.THEME_TAPDANCE, currentPreference, setTheme])

  // Build CSS that shows exactly one icon based on <html> theme classes
  const themeIconCss = useMemo(() => {
    return buildPerThemeVariantCss({
      baseSelector: '.theme-icon',
      variantAttr: 'data-theme',
      display: 'inline-block',
    })
  }, [])

  const showSystemOverlay = hydrated && open && currentPreference === 'system'
  const spinCss = `@keyframes kd-spin-trail{0%{transform:rotate(0deg) scale(1);filter:drop-shadow(0 0 0 rgba(0,0,0,0))}70%{transform:rotate(320deg) scale(1.1);filter:drop-shadow(0 0 0 rgba(0,0,0,0)) drop-shadow(0 0 6px color-mix(in oklch,var(--primary) 70%,transparent)) drop-shadow(0 0 12px color-mix(in oklch,var(--accent,var(--primary)) 50%,transparent))}100%{transform:rotate(360deg) scale(1);filter:drop-shadow(0 0 0 rgba(0,0,0,0))}}.theme-system-overlay-anim{animation:kd-spin-trail 260ms ease-out;will-change:transform,filter}`

  // Prevent background scrolling when menu is open (all breakpoints)
  useEffect(() => {
    if (typeof window === 'undefined') return
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
      // Mark that a theme was selected (this will reset the counter)
      setThemeSelected(true)

      // Reset the counter immediately when a theme is selected
      setToggleCount(0)

      // Check if the theme is available
      const availableThemes = getAvailableThemes() as readonly Theme[]

      // Only proceed if the theme is available
      if (!availableThemes.includes(nextPref)) {
        setOpen(false)
        return
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iconByTheme, has, unlocked, forceUpdate])

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

  // Removed parent callbacks and md+ width reporting to avoid shifting header

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

                // When opening the menu, reset theme selection tracking
                if (!o && next) {
                  setThemeSelected(false)
                }

                // When closing the menu, only increment if no theme was selected
                if (o && !next && !themeSelected) {
                  const newCount = toggleCount + 1
                  setToggleCount(newCount)

                  // Unlock achievement after 6 toggles
                  if (newCount >= 6 && !has('THEME_TAPDANCE')) {
                    unlock('THEME_TAPDANCE')
                    setToggleCount(0) // Reset counter after unlocking
                  }
                }

                // If a theme was selected, reset the counter
                if (o && !next && themeSelected) {
                  setToggleCount(0)
                }

                setOpenedViaKeyboard(false)
                return next
              })
            }}
            onKeyDown={handleTriggerKeyDown}
            className={cn(
              'relative hover:ring-accent hover:ring-1 hover:ring-offset-2 ring-offset-background',
              hydrated ? 'transition-[transform,opacity] duration-200 will-change-transform' : 'transition-none',
              open ? 'z-[120] ring-1 ring-accent ring-offset-2 scale-95 rotate-3' : 'z-[70]',
            )}>
            <span className="relative inline-block align-middle">
              <style>{themeIconCss}</style>
              <style>{spinCss}</style>
              {themes.map(t => {
                const IconComp = t.icon
                return (
                  <IconComp
                    key={t.name}
                    data-theme={t.name}
                    className={cn(
                      'theme-icon h-[1.2rem] w-[1.2rem] transition-opacity duration-200 ease-out',
                      showSystemOverlay ? 'opacity-0' : 'opacity-100',
                    )}
                  />
                )
              })}
              <span
                className={cn(
                  'absolute inset-0 grid place-items-center pointer-events-none transition-opacity duration-200 ease-out',
                  showSystemOverlay ? 'opacity-100' : 'opacity-0',
                )}>
                <SystemIcon className={cn('h-[1.2rem] w-[1.2rem]', showSystemOverlay && 'theme-system-overlay-anim')} />
              </span>
            </span>
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

      {/* Backdrop overlay (all breakpoints) */}
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
          'fixed inset-0 z-[115] transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          // Subtle flashy backdrop: tint + blur + vignette-ish gradient
          'backdrop-blur-sm bg-black/15 dark:bg-black/40',
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
          'absolute left-1/2 top-full -translate-x-1/2 mt-2 z-[120]',
          'flex flex-col items-stretch gap-2',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}>
        {hydrated &&
          optionsToShow.map((opt, idx) => (
            <Button
              key={opt.value}
              ref={el => {
                optionRefs.current[idx] = el
              }}
              onClick={e => handleThemeChange(opt.value, e)}
              role="menuitem"
              aria-label={opt.label}
              title={opt.label}
              variant="ghost"
              size="sm"
              className={cn(
                'transition-[opacity,transform] duration-200 ease-out hover:bg-accent/70 justify-start gap-2',
                open ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95',
              )}
              style={{ transitionDelay: `${idx * 60}ms` }}>
              <span className="grid size-8 place-items-center shrink-0">
                <opt.Icon className="size-4" />
              </span>
              <span className="text-xs font-medium text-foreground/90">{opt.label}</span>
            </Button>
          ))}
      </div>
    </div>
  )
}

export const useThemeTransition = () => {
  const startTransition = useCallback((updateFn: () => void) => {
    // Disable view transitions in Safari due to 3D animation performance issues
    if ('startViewTransition' in document && !isSafari()) {
      document.startViewTransition(updateFn)
    } else {
      updateFn()
    }
  }, [])
  return { startTransition }
}
