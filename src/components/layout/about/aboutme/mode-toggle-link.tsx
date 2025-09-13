'use client'

import { useTheme } from '@/components/providers/theme-provider'
import { useCallback, useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { useThemeTransition } from '@/components/ui/theme-toggle'
import { captureDarkModeEasterEgg } from '@/hooks/posthog'
import { themes } from '@/lib/themes'

export function ModeToggleNote() {
  const noteCss = useMemo(() => {
    const names = themes.map(t => t.name)
    const nonBase = names.filter(n => n !== 'light' && n !== 'dark')
    const rules: string[] = []
    // Hide all by default
    rules.push('.mode-note{display:none}')
    // Seasonal/custom themes: show based on their baseColor
    for (const t of themes) {
      if (t.name === 'light' || t.name === 'dark') continue
      const target = t.baseColor === 'dark' ? '.mode-note--dark' : '.mode-note--light'
      rules.push(`html.${t.name} ${target}{display:inline}`)
    }
    // Dark shows when .dark present and no non-base theme class active
    if (names.includes('dark')) {
      const notNonBase = nonBase.map(n => `:not(.${n})`).join('')
      rules.push(`html.dark${notNonBase} .mode-note--dark{display:inline}`)
    }
    // Light shows when not dark and no non-base theme class active
    if (names.includes('light')) {
      const notOthers = ['dark', ...nonBase].map(n => `:not(.${n})`).join('')
      rules.push(`html${notOthers} .mode-note--light{display:inline}`)
    }
    return rules.join('')
  }, [])

  return (
    <span className="text-muted-foreground text-xs font-normal">
      <style>{noteCss}</style>
      <span className="mode-note mode-note--dark">(good choice)</span>
      <span className="mode-note mode-note--light">(why are you in light mode?)</span>
    </span>
  )
}

export function ModeToggleLink() {
  const { resolvedTheme, setTheme } = useTheme()
  const { startTransition } = useThemeTransition()

  const injectCircleBlurTransitionStyles = useCallback((originXPercent: number, originYPercent: number) => {
    const styleId = `theme-transition-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`
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
