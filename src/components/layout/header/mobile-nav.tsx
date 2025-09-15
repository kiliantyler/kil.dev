'use client'

import { MenuIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useThemeTransition } from '@/components/ui/theme-toggle'
import { NAVIGATION } from '@/lib/navmenu'
import { cn } from '@/lib/utils'
import type { Route } from 'next'

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { startTransition } = useThemeTransition()
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [openedViaKeyboard, setOpenedViaKeyboard] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([])
  type Particle = {
    id: number
    tx: number
    ty: number
    durationMs: number
    delayMs: number
    sizePx: number
    tone: 'primary' | 'accent'
  }
  const [particles, setParticles] = useState<Particle[]>([])
  const [showRipple, setShowRipple] = useState(false)
  const [rippleMode, setRippleMode] = useState<'out' | 'in'>('out')
  const [particleAnim, setParticleAnim] = useState<'burst' | 'implode'>('burst')
  // Animation constants
  const STAGGER_MS = 35
  const OPEN_DURATION_MS = 300
  const CLOSE_DURATION_MS = 200
  const isExpanded = open && !closing

  const overlayRef = useRef<HTMLDivElement | null>(null)

  const injectCircleBlurTransitionStyles = useCallback((originXPercent: number, originYPercent: number) => {
    const styleId = `nav-transition-${Date.now()}`
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @supports (view-transition-name: root) {
        ::view-transition-old(root) { animation: none; }
        ::view-transition-new(root) {
          animation: kd-circle-blur-expand 0.5s ease-out;
          transform-origin: ${originXPercent}% ${originYPercent}%;
          filter: blur(0);
        }
        @keyframes kd-circle-blur-expand {
          from { clip-path: circle(0% at ${originXPercent}% ${originYPercent}%); filter: blur(4px); }
          to { clip-path: circle(150% at ${originXPercent}% ${originYPercent}%); filter: blur(0); }
        }
      }
    `
    document.head.appendChild(style)
    window.setTimeout(() => {
      const el = document.getElementById(styleId)
      if (el) el.remove()
    }, 3000)
  }, [])

  const triggerOpenFx = useCallback(() => {
    setRippleMode('out')
    setParticleAnim('burst')
    setShowRipple(true)
    const particleCount = 12
    const nextParticles: Particle[] = []
    for (let i = 0; i < particleCount; i++) {
      const angle = ((20 + Math.random() * 100) * Math.PI) / 180
      const distance = 40 + Math.random() * 100
      const tx = Math.cos(angle) * distance
      const ty = Math.sin(angle) * distance
      const durationMs = 420 + Math.round(Math.random() * 220)
      const delayMs = Math.round(Math.random() * 100)
      const sizePx = 4 + Math.round(Math.random() * 6)
      const tone: Particle['tone'] = Math.random() > 0.5 ? 'primary' : 'accent'
      nextParticles.push({ id: i, tx, ty, durationMs, delayMs, sizePx, tone })
    }
    setParticles(nextParticles)
    window.setTimeout(() => setShowRipple(false), 500)
    window.setTimeout(() => setParticles([]), 900)
  }, [])

  const triggerCloseFx = useCallback(() => {
    setRippleMode('in')
    setParticleAnim('implode')
    setShowRipple(true)
    const particleCount = 10
    const nextParticles: Particle[] = []
    for (let i = 0; i < particleCount; i++) {
      const angle = ((20 + Math.random() * 100) * Math.PI) / 180
      const distance = 50 + Math.random() * 80
      const tx = Math.cos(angle) * distance
      const ty = Math.sin(angle) * distance
      const durationMs = 360 + Math.round(Math.random() * 180)
      const delayMs = Math.round(Math.random() * 80)
      const sizePx = 3 + Math.round(Math.random() * 6)
      const tone: Particle['tone'] = Math.random() > 0.5 ? 'primary' : 'accent'
      nextParticles.push({ id: i, tx, ty, durationMs, delayMs, sizePx, tone })
    }
    setParticles(nextParticles)
    window.setTimeout(() => setShowRipple(false), 450)
    window.setTimeout(() => setParticles([]), 800)
  }, [])

  // Unified close (optionally navigate after animation)
  const closeWithAnimation = useCallback(
    (navigateHref?: string, perItemIdx?: number) => {
      setClosing(true)
      setOpen(false)
      setOpenedViaKeyboard(false)
      triggerCloseFx()
      const total = CLOSE_DURATION_MS + (NAVIGATION.length - 1) * STAGGER_MS
      const navigateDelay =
        typeof perItemIdx === 'number' ? CLOSE_DURATION_MS + (NAVIGATION.length - 1 - perItemIdx) * STAGGER_MS : total
      window.setTimeout(() => {
        if (navigateHref) {
          startTransition(() => {
            router.push(navigateHref as Route)
          })
        }
        setClosing(false)
        triggerRef.current?.focus()
      }, navigateDelay)
    },
    [router, startTransition, triggerCloseFx],
  )

  // Prevent background scroll on small screens when menu is open
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

  // Click outside + ESC to close
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        closeWithAnimation()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeWithAnimation()
      }
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    const id = window.setTimeout(() => {
      if (openedViaKeyboard) itemRefs.current[0]?.focus()
    }, 0)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(id)
    }
  }, [open, openedViaKeyboard, triggerCloseFx, closeWithAnimation])

  // Ensure focus is never left on the overlay when closing
  useEffect(() => {
    if (open) return
    if (document.activeElement === overlayRef.current) {
      overlayRef.current?.blur()
    }
    triggerRef.current?.focus()
  }, [open])

  const handleTriggerKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(o => !o)
      setOpenedViaKeyboard(true)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      setOpen(true)
      setOpenedViaKeyboard(true)
    }
  }, [])

  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent<HTMLUListElement>) => {
    const currentIndex = itemRefs.current.findIndex(el => el === document.activeElement)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = currentIndex < 0 ? 0 : Math.min(NAVIGATION.length - 1, currentIndex + 1)
      itemRefs.current[next]?.focus()
      return
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = currentIndex < 0 ? 0 : Math.max(0, currentIndex - 1)
      itemRefs.current[prev]?.focus()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setOpenedViaKeyboard(false)
      triggerRef.current?.focus()
    }
  }, [])

  // Ladder layout tuning
  const [ladderXOffset, setLadderXOffset] = useState(28)
  const [ladderYOffset, setLadderYOffset] = useState(28)
  const [ladderStepX] = useState(14)
  const [ladderStepY] = useState(10)
  const [anchor, setAnchor] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Pre-compute ladder positions shooting down-right from the trigger
  type LadderPoint = { x: number; y: number }
  const positions = useMemo<LadderPoint[]>(() => {
    return NAVIGATION.map((_, idx) => ({ x: ladderXOffset + idx * ladderStepX, y: ladderYOffset + idx * ladderStepY }))
  }, [ladderXOffset, ladderYOffset, ladderStepX, ladderStepY])

  // Anchor the ladder to the actual button center (viewport coordinates)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setAnchor({ x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) })
    }
    update()
    window.addEventListener('resize', update, { passive: true })
    window.addEventListener('scroll', update, { passive: true, capture: true })
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [])

  // Reset offsets on each open to avoid cumulative drift across openings
  useEffect(() => {
    if (!open) return
    setLadderXOffset(-12)
    setLadderYOffset(22)
  }, [open])

  // Nudge first item fully into view on open (single pass)
  useEffect(() => {
    if (!open) return
    const adjust = () => {
      const firstEl = itemRefs.current[0]
      if (!firstEl) return
      const rect = firstEl.getBoundingClientRect()
      const topMargin = 40
      const leftMargin = 16
      if (rect.top < topMargin) {
        setLadderYOffset(prev => prev + Math.ceil(topMargin - rect.top))
      }
      if (rect.left < leftMargin) {
        setLadderXOffset(prev => prev + Math.ceil(leftMargin - rect.left))
      }
    }
    const id = window.requestAnimationFrame(adjust)
    return () => window.cancelAnimationFrame(id)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative inline-block md:hidden">
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="mobile-nav-arc"
          className="relative z-[90]"
          onClick={() => {
            setOpen(prev => {
              const next = !prev
              setOpenedViaKeyboard(false)
              if (next) {
                setClosing(false)
                triggerOpenFx()
              } else {
                closeWithAnimation()
              }
              return next
            })
          }}
          onKeyDown={handleTriggerKeyDown}>
          <MenuIcon
            className={cn(
              'size-5 transition-transform ease-out',
              isExpanded
                ? `duration-[${OPEN_DURATION_MS}ms] rotate-90 scale-90`
                : `duration-[${OPEN_DURATION_MS}ms] rotate-0 scale-100`,
            )}
            aria-hidden="true"
          />
        </Button>

        <style>{`
          @keyframes kd-burst { from { transform: translate(-50%, -50%) translate(0,0) scale(0.8); opacity: 1 } to { transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) scale(1); opacity: 0 } }
          @keyframes kd-implosion { from { transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) scale(1); opacity: 0.9 } to { transform: translate(-50%, -50%) translate(0,0) scale(0.6); opacity: 0 } }
          @keyframes kd-ripple { from { transform: translate(-50%, -50%) scale(0.35); opacity: 0.7 } to { transform: translate(-50%, -50%) scale(2.25); opacity: 0 } }
          @keyframes kd-ripple-in { from { transform: translate(-50%, -50%) scale(1.8); opacity: 0.35 } to { transform: translate(-50%, -50%) scale(0.35); opacity: 0 } }
        `}</style>

        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute left-1/2 top-1/2 z-[80] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-accent/60',
            showRipple
              ? rippleMode === 'out'
                ? 'animate-[kd-ripple_500ms_ease-out_forwards]'
                : 'animate-[kd-ripple-in_450ms_ease-in_forwards]'
              : 'hidden',
          )}
        />

        <span aria-hidden className="pointer-events-none absolute inset-0 z-[80]">
          {particles.map(p => {
            const particleStyle: React.CSSProperties & { ['--tx']?: string; ['--ty']?: string } = {
              width: `${p.sizePx}px`,
              height: `${p.sizePx}px`,
              color: `var(${p.tone === 'primary' ? '--primary' : '--accent'})`,
              backgroundColor: 'currentColor',
              filter:
                'drop-shadow(0 0 3px color-mix(in oklch,currentColor 55%, transparent)) drop-shadow(0 0 7px color-mix(in oklch,currentColor 35%, transparent))',
              animation: `${particleAnim === 'burst' ? 'kd-burst' : 'kd-implosion'} ${p.durationMs}ms ${
                particleAnim === 'burst' ? 'ease-out' : 'ease-in'
              } ${p.delayMs}ms forwards`,
              '--tx': `${Math.round(p.tx)}px`,
              '--ty': `${Math.round(p.ty)}px`,
            }
            return (
              <span
                key={p.id}
                aria-hidden
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-xs"
                style={particleStyle}
              />
            )
          })}
        </span>
        {/* Ladder menu shooting down-right from the trigger (anchored at button center) */}
        <ul
          id="mobile-nav-arc"
          role="menu"
          aria-label="Mobile navigation"
          aria-orientation="vertical"
          suppressHydrationWarning
          onKeyDown={handleMenuKeyDown}
          className={cn(
            'pointer-events-none fixed md:hidden',
            open || closing ? 'z-[80] opacity-100' : 'z-[80] opacity-0',
          )}
          style={{
            left: `${anchor.x}px`,
            top: `${anchor.y}px`,
            transition: 'opacity 120ms ease-out',
          }}>
          {NAVIGATION.map((item, idx) => {
            const isActive = !item.href.startsWith('#') && item.href === pathname
            const Icon = item.icon
            const { x, y } = positions[idx] ?? { x: 0, y: 0 }
            const openTransform = `translate(${Math.round(x)}px, ${Math.round(y)}px) rotate(0deg) scale(1)`
            // Snap back quickly with a slight overshoot toward the button, then fade fast
            const closedTransform = 'translate(-6px, -6px) rotate(-6deg) scale(0.9)'
            return (
              <li key={item.href} role="none" className="relative">
                <Link
                  ref={el => {
                    itemRefs.current[idx] = el
                  }}
                  role="menuitem"
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    open || closing ? 'pointer-events-auto' : 'pointer-events-none',
                    'group grid grid-cols-[2rem_auto] items-center gap-1 rounded-full px-2 py-2 overflow-hidden whitespace-nowrap backface-hidden',
                    'shadow-xs bg-background/95 ring-1 ring-border',
                    'transition-[transform,opacity,background-color,color] ease-in-out will-change-transform',
                    closing ? 'duration-200' : 'duration-300',
                    'hover:bg-accent/70 hover:text-accent-foreground focus:bg-accent/70 focus:text-accent-foreground',
                    isActive ? 'bg-accent/80 text-accent-foreground' : 'text-muted-foreground',
                  )}
                  style={{
                    transform: closing ? closedTransform : open ? openTransform : closedTransform,
                    opacity: closing ? 0 : open ? 1 : 0,
                    transitionDelay: `${(closing ? NAVIGATION.length - 1 - idx : idx) * 35}ms`,
                    willChange: 'transform, opacity',
                    transformOrigin: 'left top',
                  }}
                  onClick={e => {
                    e.preventDefault()
                    const btnRect = triggerRef.current?.getBoundingClientRect()
                    if (btnRect) {
                      const vw = window.innerWidth || 1
                      const vh = window.innerHeight || 1
                      const originXPercent = Math.max(0, Math.min(100, ((btnRect.left + btnRect.width / 2) / vw) * 100))
                      const originYPercent = Math.max(0, Math.min(100, ((btnRect.top + btnRect.height / 2) / vh) * 100))
                      injectCircleBlurTransitionStyles(originXPercent, originYPercent)
                    }

                    closeWithAnimation(item.href, idx)
                  }}>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/20 text-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium tracking-wide pr-2">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Backdrop to emphasize the menu and allow closing */}
      <div
        role="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close navigation menu"
        ref={overlayRef}
        onClick={() => {
          // Fade overlay out immediately while items collapse
          setClosing(true)
          setOpen(false)
          setOpenedViaKeyboard(false)
          triggerCloseFx()
          setTimeout(
            () => {
              setClosing(false)
              triggerRef.current?.focus()
            },
            220 + (NAVIGATION.length - 1) * 35,
          )
        }}
        onKeyDown={e => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setClosing(true)
            setOpen(false)
            setOpenedViaKeyboard(false)
            triggerCloseFx()
            setTimeout(
              () => {
                setClosing(false)
                triggerRef.current?.focus()
              },
              220 + (NAVIGATION.length - 1) * 35,
            )
          }
        }}
        className={cn(
          'fixed inset-0 md:hidden transition-opacity duration-200',
          open ? 'z-[70] opacity-100 pointer-events-auto' : 'z-[70] opacity-0 pointer-events-none',
          'bg-black/40 backdrop-blur-sm',
        )}
      />
    </div>
  )
}
