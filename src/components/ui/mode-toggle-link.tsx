'use client'

import { useTheme } from 'next-themes'
import { useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { useThemeTransition } from '@/components/ui/theme-toggle'
import { captureDarkModeEasterEgg } from '@/hooks/posthog'

export function ModeToggleLink() {
  const { resolvedTheme, setTheme } = useTheme()
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
      if (styleEl) styleEl.remove()
    }, 3000)
  }, [])

  const handleClick = useCallback(
    (event?: React.MouseEvent<HTMLButtonElement>) => {
      if (resolvedTheme === 'dark') return

      const viewportWidth = window.innerWidth || 1
      const viewportHeight = window.innerHeight || 1
      const clickX = event?.clientX ?? viewportWidth / 2
      const clickY = event?.clientY ?? viewportHeight / 2
      const originXPercent = Math.max(0, Math.min(100, (clickX / viewportWidth) * 100))
      const originYPercent = Math.max(0, Math.min(100, (clickY / viewportHeight) * 100))

      injectCircleBlurTransitionStyles(originXPercent, originYPercent)
      startTransition(() => {
        setTheme('dark')
        captureDarkModeEasterEgg()
      })
    },
    [injectCircleBlurTransitionStyles, resolvedTheme, setTheme, startTransition],
  )

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  return (
    <Button
      type="button"
      variant="ghostLink"
      size="sm"
      className="h-auto p-0 px-0"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label=""
      title="">
      Dark mode
    </Button>
  )
}
