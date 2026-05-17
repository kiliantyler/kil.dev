'use client'

import { useAchievements } from '@/components/providers/achievements-provider'
import { useTheme } from '@/components/providers/theme-provider'
import { Button } from '@/components/ui/button'
import { ThemeMenu } from '@/components/ui/theme-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { captureThemeChanged } from '@/hooks/posthog'
import { useIsClient } from '@/hooks/use-is-client'
import { useThemeMenuState } from '@/hooks/use-theme-menu-state'
import { themes, type Theme } from '@/lib/themes'
import type { ThemeConfig } from '@/types/themes'
import { startDotcomTransition } from '@/utils/dotcom-transition'
import { isDotcomThemeUnlocked } from '@/utils/dotcom-unlock'
import { isMatrixThemeUnlocked } from '@/utils/matrix-unlock'
import { buildPerThemeVariantCss } from '@/utils/theme-css'
import { getAvailableThemes, getDefaultThemeForNow } from '@/utils/theme-runtime'
import { getThemeIcon, getThemeLabel } from '@/utils/themes'
import { cn, isSafari } from '@/utils/utils'
import { injectCircleBlurTransitionStyles } from '@/utils/view-transition'
import { CalendarDays, Monitor, Settings } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { ThemeOptionsPanel, ThemeOptionsSheet } from './theme-options-panel'

const THEME_TAPDANCE_OPEN_THRESHOLD = 5

function SystemIcon({ className }: Readonly<{ className?: string }>) {
  // Avoid hydration mismatch: default to Seasonal icon until mounted
  const { seasonalOverlaysEnabled } = useTheme()
  const isClient = useIsClient()
  if (!isClient) {
    return <CalendarDays className={cn(className)} />
  }
  return seasonalOverlaysEnabled ? <CalendarDays className={cn(className)} /> : <Monitor className={cn(className)} />
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme, systemTheme, seasonalOverlaysEnabled } = useTheme()
  const { startTransition } = useThemeTransition()
  const { unlocked, has, unlock } = useAchievements()

  const currentPreference: Theme = theme ?? 'system'
  const themeTapdanceUnlocked = has('THEME_TAPDANCE')

  const [tooltipHold, setTooltipHold] = useState(false)
  const [toggleCount, setToggleCount] = useState(0)
  const [themeSelected, setThemeSelected] = useState(false)
  const {
    open,
    setOpen,
    containerRef,
    triggerRef,
    optionsRef,
    optionRefs,
    overlayProps,
    handleTriggerKeyDown,
    buildMenuKeyDownHandler,
  } = useThemeMenuState()

  const [showOptions, setShowOptions] = useState(false)
  const isClient = useIsClient()

  // Force re-render after achievement state changes to ensure localStorage sync
  useEffect(() => {
    const timer = setTimeout(() => {
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

  const showSystemOverlay = isClient && open && currentPreference === 'system'

  // scroll-lock handled in useThemeMenuState

  const injectCircleBlur = useCallback((originXPercent: number, originYPercent: number) => {
    injectCircleBlurTransitionStyles(originXPercent, originYPercent, 'theme-transition')
  }, [])

  const handleThemeChange = useCallback(
    (nextPref: Theme, event?: ReactMouseEvent) => {
      // Mark that a theme was selected (this will reset the counter)
      setThemeSelected(true)

      // Reset the counter immediately when a theme is selected
      setToggleCount(0)

      // Check if the theme is available
      const availableThemes = getAvailableThemes(undefined, themeTapdanceUnlocked) as readonly Theme[]

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

      const viewportWidth = globalThis.innerWidth || 1
      const viewportHeight = globalThis.innerHeight || 1
      const clickX = event?.clientX ?? viewportWidth / 2
      const clickY = event?.clientY ?? viewportHeight / 2
      const originXPercent = Math.max(0, Math.min(100, (clickX / viewportWidth) * 100))
      const originYPercent = Math.max(0, Math.min(100, (clickY / viewportHeight) * 100))

      if (nextPref === 'dotcom') {
        startDotcomTransition(() => {
          setTheme(nextPref)
          captureThemeChanged(nextPref)
        })
      } else {
        injectCircleBlur(originXPercent, originYPercent)
        startTransition(() => {
          setTheme(nextPref)
          captureThemeChanged(nextPref)
        })
      }
      setOpen(false)
    },
    [
      currentPreference,
      injectCircleBlur,
      resolvedTheme,
      setTheme,
      startTransition,
      systemTheme,
      setOpen,
      themeTapdanceUnlocked,
    ],
  )

  type IconComponent = ComponentType<{ className?: string }>
  type ThemeOption = { label: string; value: Theme; Icon: IconComponent }

  const iconByTheme = useMemo<Partial<Record<Theme, IconComponent>>>(() => ({ system: SystemIcon }), [])

  const allOptions: ThemeOption[] = useMemo(() => {
    const themeList: readonly Theme[] = getAvailableThemes(undefined, themeTapdanceUnlocked) as readonly Theme[]
    const hasUnlockedMatrix = isMatrixThemeUnlocked()
    const hasUnlockedDotcom = isDotcomThemeUnlocked()
    const filteredList = themeList.filter(t => {
      if (t === 'system') return true
      const entry = themes.find(e => e.name === t) as ThemeConfig | undefined
      if (entry?.alwaysHidden) return false
      // Keep hiddenFromMenu unless unlocked and the theme is matrix or dotcom
      if (entry?.hiddenFromMenu && !((hasUnlockedMatrix && t === 'matrix') || (hasUnlockedDotcom && t === 'dotcom')))
        return false
      const gated = Boolean(entry?.requiresAchievement)
      return themeTapdanceUnlocked || !gated
    })
    return filteredList.map((t): ThemeOption => {
      const label: string = getThemeLabel(t)
      const resolvedIcon: IconComponent = iconByTheme[t] ?? getThemeIcon(t, SystemIcon)
      return { label, value: t, Icon: resolvedIcon }
    })
  }, [iconByTheme, themeTapdanceUnlocked])

  // Compute dynamic width based on the longest theme label (in ch units)
  const menuWidthCh = useMemo(() => {
    const longest = allOptions.reduce((max, o) => Math.max(max, o.label.length), 0)
    // Add room for icon + gaps; clamp to [18ch, 32ch]
    const ch = Math.max(18, Math.min(32, longest + 8))
    return ch
  }, [allOptions])

  const optionsToShow = useMemo(() => {
    const systemOpt = allOptions.find(opt => opt.value === 'system')
    const base = allOptions.filter(opt => {
      if (opt.value === 'system') return false
      const entry = themes.find(e => e.name === opt.value) as ThemeConfig | undefined
      return entry && !('timeRange' in entry)
    })
    const seasonalActiveNames = new Set(
      (getAvailableThemes(undefined, themeTapdanceUnlocked) as readonly Theme[]).filter(t => t !== 'system'),
    )
    const seasonalActive = allOptions.filter(opt => {
      if (opt.value === 'system') return false
      const entry = themes.find(e => e.name === opt.value) as ThemeConfig | undefined
      return entry && 'timeRange' in entry && seasonalActiveNames.has(opt.value)
    })

    let list: ThemeOption[] = [...base, ...seasonalActive]
    if (systemOpt) list = [systemOpt, ...list]
    // Hide the currently selected preference to avoid no-op selection
    list =
      currentPreference === 'system'
        ? list.filter(opt => opt.value !== 'system')
        : list.filter(opt => opt.value !== currentPreference)
    return list
  }, [allOptions, currentPreference, themeTapdanceUnlocked])

  // focus behavior handled in useThemeMenuState

  // Removed parent callbacks and md+ width reporting to avoid shifting header

  useEffect(() => {
    if (open) {
      return
    }
    const id = globalThis.setTimeout(() => {
      setTooltipHold(true)
    }, 150)
    return () => globalThis.clearTimeout(id)
  }, [open])

  const handleMenuKeyDown = buildMenuKeyDownHandler(optionsToShow.length)

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
              const next = !open

              // When opening the menu, reset theme selection tracking
              if (next) {
                setThemeSelected(false)
                const newCount = toggleCount + 1

                if (newCount >= THEME_TAPDANCE_OPEN_THRESHOLD && !themeTapdanceUnlocked) {
                  unlock('THEME_TAPDANCE')
                  setToggleCount(0)
                } else {
                  setToggleCount(newCount)
                }
              }

              // If a theme was selected, reset the counter
              if (!next && themeSelected) {
                setToggleCount(0)
              }

              setOpen(next)
            }}
            onKeyDown={handleTriggerKeyDown}
            className={cn(
              'relative ring-offset-background hover:ring-1 hover:ring-accent hover:ring-offset-2',
              isClient ? 'transition-[transform,opacity] duration-200 will-change-transform' : 'transition-none',
              open ? 'z-120 scale-95 rotate-3 ring-1 ring-accent ring-offset-2' : 'z-70',
            )}>
            <span className="relative inline-block align-middle">
              <style>{themeIconCss}</style>
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
                  'pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-200 ease-out',
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
              if (currentPreference === 'system') return seasonalOverlaysEnabled ? 'Seasonal' : 'System'
              return `${currentPreference.slice(0, 1).toUpperCase()}${currentPreference.slice(1)}`
            }
            return 'Theme Toggle'
          })()}
        </TooltipContent>
      </Tooltip>

      {/* Backdrop overlay (all breakpoints) */}
      <div
        aria-hidden={!open}
        {...overlayProps}
        className={cn(
          'fixed inset-0 z-115 transition-opacity duration-200',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          'bg-black/15 backdrop-blur-sm dark:bg-black/40',
        )}
      />

      {isClient && (
        <ThemeMenu
          open={open}
          options={optionsToShow.map(o => ({ label: o.label, value: o.value, Icon: o.Icon }))}
          optionsWidthCh={menuWidthCh}
          optionRefs={optionRefs}
          optionsRef={optionsRef}
          onOptionClick={(value, e) => handleThemeChange(value, e)}
          onKeyDown={handleMenuKeyDown}
          leftSlot={
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-controls="theme-options-panel"
                aria-expanded={showOptions}
                onClick={() => setShowOptions(v => !v)}
                aria-label={showOptions ? 'Hide options' : 'Show options'}
                className="h-7 w-7">
                <Settings className="size-4" />
              </Button>
              <div className="absolute top-full right-0 hidden sm:block">
                <ThemeOptionsPanel open={showOptions} align="right" />
              </div>
            </>
          }
          bottomSlot={
            showOptions ? (
              <div className="mt-2 sm:hidden">
                <ThemeOptionsSheet />
              </div>
            ) : null
          }
        />
      )}
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
