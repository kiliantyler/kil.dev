'use client'

import { cn } from '@/lib/utils'
import Image, { type StaticImageData } from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FlipIndicator } from './flip-indicator'

interface FlippingCardProps {
  front: React.ReactNode
  back: React.ReactNode
  backgroundImageSrc: StaticImageData | string
  backgroundImageAlt?: string
  backgroundPriority?: boolean
  backgroundSizes?: string
  flipDurationMs?: number
  flipLabelFrontDesktop?: string
  flipLabelFrontMobile?: string
  flipLabelBackDesktop?: string
  flipLabelBackMobile?: string
  className?: string
  ariaLabel?: string
  onFlipChange?: (flipped: boolean) => void
}

export function FlippingCard({
  front,
  back,
  backgroundImageSrc,
  backgroundImageAlt,
  backgroundPriority = false,
  backgroundSizes,
  flipDurationMs = 500,
  className,
  ariaLabel,
  onFlipChange,
  flipLabelFrontDesktop,
  flipLabelFrontMobile,
  flipLabelBackDesktop,
  flipLabelBackMobile,
}: FlippingCardProps) {
  const [flipped, setFlipped] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const frameRequestRef = useRef<number | null>(null)
  const pendingPointer = useRef<{ x: number; y: number } | null>(null)
  const tiltRef = useRef<HTMLDivElement | null>(null)
  const lastNotifiedRef = useRef(flipped)

  const handleToggle = useCallback(() => {
    setFlipped(prev => !prev)
  }, [])

  useEffect(() => {
    if (flipped === lastNotifiedRef.current) return
    lastNotifiedRef.current = flipped
    onFlipChange?.(flipped)
  }, [flipped, onFlipChange])

  // Ensure back face always uses theme base shadow by clearing any dynamic override on flip
  useEffect(() => {
    const tiltEl = tiltRef.current
    if (!tiltEl) return
    if (flipped) {
      tiltEl.style.removeProperty('--card-back-shadow')
    }
  }, [flipped])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleToggle()
      }
    },
    [handleToggle],
  )

  const applyTiltTransform = useCallback(
    (x: number, y: number) => {
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

      // Read theme luminance hint from CSS var (set per-theme in globals.css)
      const root = document.documentElement
      const darklikeVar = getComputedStyle(root).getPropertyValue('--theme-darklike').trim()
      const isDarkLike = darklikeVar === '1'
      const nearAlpha = isDarkLike ? 0.6 : 0.28
      const farAlpha = isDarkLike ? 0.3 : 0.15
      const highlightAlpha = isDarkLike ? 0.1 : 0.25

      const dynamicShadow =
        `drop-shadow(${shadowX}px ${shadowY}px ${blurNear}px rgba(0,0,0,${nearAlpha})) ` +
        `drop-shadow(${shadowX * magnitudeFarScale}px ${shadowY * magnitudeFarScale}px ${blurFar}px rgba(0,0,0,${farAlpha})) ` +
        `drop-shadow(${-shadowX}px ${-shadowY}px ${highlightBlur}px rgba(255,255,255,${highlightAlpha}))`

      // If back face is visible, keep theme base glow only (avoid hover color shift)
      if (flipped) {
        // Remove inline override so theme-scoped value applies
        tiltEl.style.removeProperty('--card-back-shadow')
        return
      }

      // Preserve theme-defined glow by appending dynamic shadow to THEME base (from root), not prior inline value
      const base = getComputedStyle(root).getPropertyValue('--card-back-shadow').trim()
      const combined = base ? `${base} ${dynamicShadow}` : dynamicShadow
      tiltEl.style.setProperty('--card-back-shadow', combined)
    },
    [flipped],
  )

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
      data-flipped={flipped ? 'true' : 'false'}
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
            'relative z-10 h-full w-full [transform-style:preserve-3d] transition-transform ease-out',
            flipped ? 'rotate-y-180' : '',
          )}
          style={{ transitionDuration: `${flipDurationMs}ms` }}>
          {backgroundImageSrc ? (
            <div className="absolute inset-0 z-0 overflow-hidden rounded-xl">
              <Image
                src={backgroundImageSrc}
                alt={backgroundImageAlt ?? ''}
                fill
                priority={backgroundPriority}
                fetchPriority="high"
                sizes={backgroundSizes ?? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
                placeholder="blur"
                className={cn(
                  'object-cover ease-out transition-[filter,transform]',
                  'group-data-[flipped=true]:blur-2xs md:group-data-[flipped=true]:blur-sm',
                )}
                style={{ transitionDuration: `${flipDurationMs}ms` }}
              />
            </div>
          ) : null}
          <div className="absolute inset-0 rotate-y-0 [backface-visibility:hidden]">
            {front}
            <FlipIndicator labelDesktop={flipLabelFrontDesktop} labelMobile={flipLabelFrontMobile} />
          </div>

          <div className="absolute inset-0 rotate-y-180 [backface-visibility:hidden]">
            {back}
            <FlipIndicator labelDesktop={flipLabelBackDesktop} labelMobile={flipLabelBackMobile} />
          </div>
        </div>
      </div>
    </div>
  )
}
