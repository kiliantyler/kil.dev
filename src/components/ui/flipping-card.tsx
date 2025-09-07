'use client'

import { cn } from '@/lib/utils'
import { useCallback, useRef, useState } from 'react'
import { FlipIndicator } from './flip-indicator'

interface FlippingCardProps {
  front: React.ReactNode
  back: React.ReactNode
  className?: string
  ariaLabel?: string
  onFlipChange?: (flipped: boolean) => void
}

export function FlippingCard({ front, back, className, ariaLabel, onFlipChange }: FlippingCardProps) {
  const [flipped, setFlipped] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const frameRequestRef = useRef<number | null>(null)
  const pendingPointer = useRef<{ x: number; y: number } | null>(null)
  const tiltRef = useRef<HTMLDivElement | null>(null)

  const handleToggle = useCallback(() => {
    setFlipped(prev => {
      const next = !prev
      onFlipChange?.(next)
      return next
    })
  }, [onFlipChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleToggle()
      }
    },
    [handleToggle],
  )

  const applyTiltTransform = useCallback((x: number, y: number) => {
    const tiltEl = tiltRef.current
    const containerEl = containerRef.current
    if (!tiltEl || !containerEl) return

    const rect = containerEl.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const percentX = (x - centerX) / (rect.width / 2)
    const percentY = (y - centerY) / (rect.height / 2)

    const clampedX = Math.max(-1, Math.min(1, percentX))
    const clampedY = Math.max(-1, Math.min(1, percentY))

    const maxTilt = 12
    const rotateY = clampedX * maxTilt
    const rotateX = -clampedY * maxTilt

    tiltEl.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`

    // Dynamic raised shadow: move shadow with tilt direction
    const magnitudeNear = 2
    const magnitudeFarScale = 1.25
    const blurNear = 0.9
    const blurFar = 1.8
    const highlightBlur = 0.7

    const shadowX = clampedX * magnitudeNear
    const shadowY = clampedY * magnitudeNear

    // Theme-aware alphas
    const isDark = document.documentElement.classList.contains('dark')
    const nearAlpha = isDark ? 0.6 : 0.28
    const farAlpha = isDark ? 0.3 : 0.15
    const highlightAlpha = isDark ? 0.1 : 0.4

    const shadowFilter =
      `drop-shadow(${shadowX}px ${shadowY}px ${blurNear}px rgba(0,0,0,${nearAlpha})) ` +
      `drop-shadow(${shadowX * magnitudeFarScale}px ${shadowY * magnitudeFarScale}px ${blurFar}px rgba(0,0,0,${farAlpha})) ` +
      `drop-shadow(${-shadowX}px ${-shadowY}px ${highlightBlur}px rgba(255,255,255,${highlightAlpha}))`

    tiltEl.style.setProperty('--card-back-shadow', shadowFilter)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'mouse') return
      pendingPointer.current = { x: e.clientX, y: e.clientY }
      if (frameRequestRef.current != null) return
      frameRequestRef.current = window.requestAnimationFrame(() => {
        frameRequestRef.current = null
        const point = pendingPointer.current
        if (!point) return
        applyTiltTransform(point.x, point.y)
      })
    },
    [applyTiltTransform],
  )

  const handlePointerLeave = useCallback(() => {
    const tiltEl = tiltRef.current
    if (!tiltEl) return
    pendingPointer.current = null
    if (frameRequestRef.current != null) {
      cancelAnimationFrame(frameRequestRef.current)
      frameRequestRef.current = null
    }
    tiltEl.style.transform = ''
    tiltEl.style.removeProperty('--card-back-shadow')
  }, [])

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={ariaLabel}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        'group relative w-full aspect-[16/10] cursor-pointer select-none outline-hidden [perspective:1200px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
        className,
      )}>
      <div ref={tiltRef} className="relative h-full w-full will-change-transform">
        <div
          className={cn(
            'relative h-full w-full [transform-style:preserve-3d] transition-transform duration-500 ease-out',
            flipped ? 'rotate-y-180' : '',
          )}>
          {front}
          <FlipIndicator className="[backface-visibility:hidden]" />

          <div className="absolute inset-0 rotate-y-180 [backface-visibility:hidden]">
            {back}
            <FlipIndicator labelDesktop="Flip back" labelMobile="Tap to flip back" />
          </div>
        </div>
      </div>
    </div>
  )
}
