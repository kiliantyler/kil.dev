'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { MouseEvent } from 'react'
import { useCallback } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { captureThemeChanged } from '@/hooks/posthog'

export function ThemeToggle() {
  const { setTheme, resolvedTheme, systemTheme } = useTheme()
  const { startTransition } = useThemeTransition()

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
    (theme: 'light' | 'dark' | 'system', event?: MouseEvent) => {
      const nextEffectiveTheme = theme === 'system' ? (systemTheme ?? resolvedTheme) : theme
      if (nextEffectiveTheme === resolvedTheme) {
        setTheme(theme)
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
    },
    [injectCircleBlurTransitionStyles, resolvedTheme, setTheme, startTransition, systemTheme],
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:ring-accent hover:ring-1 hover:ring-offset-2 ring-offset-background duration-300">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={e => handleThemeChange('light', e)}>Light</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={e => handleThemeChange('dark', e)}>Dark</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={e => handleThemeChange('system', e)}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
