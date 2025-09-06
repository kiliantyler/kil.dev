'use client'

import { Laptop, Moon, Smartphone, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { captureThemeChanged } from '@/hooks/posthog'
import { cn } from '@/lib/utils'

function SystemIcon({ className }: { className?: string }) {
  return (
    <>
      <Smartphone className={cn(className, 'md:hidden')} />
      <Laptop className={cn(className, 'hidden md:inline-block')} />
    </>
  )
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme()
  const { startTransition } = useThemeTransition()

  const [open, setOpen] = useState(false)
  const [openedViaKeyboard, setOpenedViaKeyboard] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const optionRefA = useRef<HTMLButtonElement | null>(null)
  const optionRefB = useRef<HTMLButtonElement | null>(null)

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
    (theme: 'light' | 'dark' | 'system', event?: ReactMouseEvent) => {
      const nextEffectiveTheme = theme === 'system' ? (systemTheme ?? resolvedTheme) : theme
      if (nextEffectiveTheme === resolvedTheme) {
        setTheme(theme)
        captureThemeChanged(theme)
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
        setTheme(theme)
        captureThemeChanged(theme)
      })
      setOpen(false)
    },
    [injectCircleBlurTransitionStyles, resolvedTheme, setTheme, startTransition, systemTheme],
  )

  const currentPreference: 'light' | 'dark' | 'system' = (theme as 'light' | 'dark' | 'system') ?? 'system'
  const currentEffective: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'

  const allOptions = useMemo(
    () => [
      { label: 'Light', value: 'light' as const, Icon: Sun },
      { label: 'Dark', value: 'dark' as const, Icon: Moon },
      { label: 'System', value: 'system' as const, Icon: SystemIcon },
    ],
    [],
  )

  const optionsToShow = useMemo(() => {
    if (currentPreference === 'system') {
      return allOptions.filter(opt => opt.value !== 'system')
    }
    return allOptions.filter(opt => opt.value !== currentEffective)
  }, [allOptions, currentEffective, currentPreference])

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
      if (openedViaKeyboard) optionRefA.current?.focus()
    }, 0)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(id)
    }
  }, [open, openedViaKeyboard])

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

  const handleMenuKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    const isHorizontal = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
    if ((isHorizontal && e.key === 'ArrowRight') || (!isHorizontal && e.key === 'ArrowDown')) {
      e.preventDefault()
      if (document.activeElement === optionRefA.current) {
        optionRefB.current?.focus()
      } else {
        optionRefA.current?.focus()
      }
      return
    }
    if ((isHorizontal && e.key === 'ArrowLeft') || (!isHorizontal && e.key === 'ArrowUp')) {
      e.preventDefault()
      if (document.activeElement === optionRefB.current) {
        optionRefA.current?.focus()
      } else {
        optionRefB.current?.focus()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
  }, [])

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
              'hover:ring-accent hover:ring-1 hover:ring-offset-2 ring-offset-background transition-all duration-200',
              open && 'ring-1 ring-accent ring-offset-2 scale-95 rotate-3',
            )}>
            {open && currentPreference === 'system' ? (
              <SystemIcon className="h-[1.2rem] w-[1.2rem]" />
            ) : (
              <>
                <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
              </>
            )}
            <span className="sr-only">Toggle theme menu</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {open
            ? currentPreference === 'system'
              ? 'System'
              : currentPreference === 'dark'
                ? 'Dark'
                : 'Light'
            : 'Theme Toggle'}
        </TooltipContent>
      </Tooltip>

      <div
        id="theme-options"
        role="menu"
        aria-label="Select theme"
        aria-hidden={!open}
        tabIndex={-1}
        onKeyDown={handleMenuKeyDown}
        className={cn(
          'absolute left-1/2 top-full -translate-x-1/2 mt-2',
          'flex flex-col items-center gap-2',
          'md:left-auto md:top-1/2 md:right-full md:-translate-y-1/2 md:translate-x-0 md:mt-0 md:mr-2 md:flex-row',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}>
        {optionsToShow.map((opt, idx) => (
          <Tooltip key={opt.value}>
            <TooltipTrigger asChild>
              <Button
                ref={idx === 0 ? optionRefA : optionRefB}
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
