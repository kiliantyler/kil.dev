'use client'

import { Briefcase, X as CloseIcon, Folder, Home, MenuIcon, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'

import { Button } from '@/components/ui/button'
import { useThemeTransition } from '@/components/ui/theme-toggle'
import { NAVIGATION } from '@/lib/navmenu'
import { cn } from '@/lib/utils'

function getIconForPath(href: string): ComponentType<{ className?: string }> {
  if (href === '/') return Home
  if (href.startsWith('/about')) return User
  if (href.startsWith('/experience')) return Briefcase
  if (href.startsWith('/projects')) return Folder
  return Home
}

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { startTransition } = useThemeTransition()
  const [open, setOpen] = useState(false)
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
  const [radiusPx, setRadiusPx] = useState(96)
  const [arcYOffsetPx, setArcYOffsetPx] = useState(0)
  const [baseXOffsetPx, setBaseXOffsetPx] = useState(0)
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
        triggerCloseFx()
        setOpen(false)
        setOpenedViaKeyboard(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        triggerCloseFx()
        setOpen(false)
        setOpenedViaKeyboard(false)
        triggerRef.current?.focus()
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
  }, [open, openedViaKeyboard, triggerCloseFx])

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

  // Pre-compute arc positions for a fun fan-out animation from the trigger
  const ANGLE_START_DEG = 30
  const ANGLE_END_DEG = 85
  type PolarPoint = { x: number; y: number }
  const positions = useMemo<PolarPoint[]>(() => {
    const count = NAVIGATION.length
    const angleStart = ANGLE_START_DEG // degrees
    const angleEnd = ANGLE_END_DEG // degrees
    const radius = radiusPx // px
    const step = count > 1 ? (angleEnd - angleStart) / (count - 1) : 0
    return new Array(count).fill(0).map((_, i) => {
      const angle = ((angleStart + step * i) * Math.PI) / 180
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      return { x, y }
    })
  }, [radiusPx])

  // Measure available space and adapt radius so items don't collide with edges
  useEffect(() => {
    if (!open) return
    const measure = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const vw = window.innerWidth || 0
      const vh = window.innerHeight || 0
      const spaceRight = Math.max(0, vw - cx)
      const spaceDown = Math.max(0, vh - cy)
      const estimatedLinkWidth = 160 // px
      const estimatedLinkHeight = 48 // px
      const safeX = Math.max(64, spaceRight - estimatedLinkWidth - 12)
      const safeY = Math.max(64, spaceDown - estimatedLinkHeight - 12)
      const nextRadius = Math.max(64, Math.min(120, Math.min(safeX, safeY)))
      setRadiusPx(nextRadius)

      // Ensure the top-most button doesn't clip off the top of the viewport
      const minYCandidate = Math.sin((ANGLE_START_DEG * Math.PI) / 180) * nextRadius
      const safeTopMargin = 36 // px, margin from viewport top
      const requiredCenterY = estimatedLinkHeight / 2 + safeTopMargin
      const currentTopmostCenterY = cy + minYCandidate
      const neededExtra = Math.max(0, requiredCenterY - currentTopmostCenterY)
      setArcYOffsetPx(neededExtra)

      // Ensure left edges of items stay within viewport with a small margin
      const anglesCount = NAVIGATION.length
      const step = anglesCount > 1 ? (ANGLE_END_DEG - ANGLE_START_DEG) / (anglesCount - 1) : 0
      let minX = Infinity
      for (let i = 0; i < anglesCount; i++) {
        const angle = ((ANGLE_START_DEG + step * i) * Math.PI) / 180
        const x = Math.cos(angle) * nextRadius
        if (x < minX) minX = x
      }
      const leftMargin = 12
      // left edge ~= cx + (minX + baseShift) - (estimatedLinkWidth/2)
      const requiredShift = leftMargin + estimatedLinkWidth / 2 - (cx + minX)
      setBaseXOffsetPx(Math.max(0, Math.ceil(requiredShift)))
    }
    measure()
    window.addEventListener('resize', measure)
    const id = window.setTimeout(measure, 0)
    return () => {
      window.removeEventListener('resize', measure)
      window.clearTimeout(id)
    }
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
          onClick={() => {
            setOpen(prev => {
              const next = !prev
              setOpenedViaKeyboard(false)
              if (next) triggerOpenFx()
              else triggerCloseFx()
              return next
            })
          }}
          onKeyDown={handleTriggerKeyDown}>
          {open ? (
            <CloseIcon className="size-5" aria-hidden="true" />
          ) : (
            <MenuIcon className="size-5" aria-hidden="true" />
          )}
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
        {/* Arc menu fanning out from the trigger (anchored at button center) */}
        <ul
          id="mobile-nav-arc"
          role="menu"
          aria-label="Mobile navigation"
          aria-orientation="vertical"
          onKeyDown={handleMenuKeyDown}
          className={cn(
            'pointer-events-none absolute left-1/2 top-1/2 z-[80] -translate-x-1/2 -translate-y-1/2 md:hidden',
          )}>
          {NAVIGATION.map((item, idx) => {
            const isActive = !item.href.startsWith('#') && item.href === pathname
            const Icon = getIconForPath(item.href)
            const { x, y } = positions[idx] ?? { x: 0, y: 0 }
            const openTransform = `translate(${Math.round(x + baseXOffsetPx)}px, ${Math.round(y + arcYOffsetPx)}px) rotate(0deg) scale(1)`
            const closedTransform = 'translate(0px, 0px) rotate(-6deg) scale(0.92)'
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
                    open ? 'pointer-events-auto' : 'pointer-events-none',
                    'group grid grid-cols-[2rem_auto] items-center gap-2 rounded-full px-2 py-2',
                    'shadow-xs bg-background/95 ring-1 ring-border',
                    'transition-[transform,opacity,background-color,color] duration-300 ease-out will-change-transform',
                    'hover:bg-accent/70 hover:text-accent-foreground focus:bg-accent/70 focus:text-accent-foreground',
                    isActive ? 'bg-accent/80 text-accent-foreground' : 'text-muted-foreground',
                  )}
                  style={{
                    transform: open ? openTransform : closedTransform,
                    opacity: open ? 1 : 0,
                    transitionDelay: `${idx * 60}ms`,
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

                    startTransition(() => {
                      triggerCloseFx()
                      setOpen(false)
                      setOpenedViaKeyboard(false)
                      router.push(item.href)
                    })
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
          triggerCloseFx()
          setOpen(false)
          setOpenedViaKeyboard(false)
          // Return focus to trigger
          triggerRef.current?.focus()
        }}
        onKeyDown={e => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            triggerCloseFx()
            setOpen(false)
            setOpenedViaKeyboard(false)
            triggerRef.current?.focus()
          }
        }}
        className={cn(
          'fixed inset-0 md:hidden z-[70] transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          'bg-black/40 backdrop-blur-sm',
        )}
      />
    </div>
  )
}
