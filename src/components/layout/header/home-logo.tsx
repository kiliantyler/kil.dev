'use client'

import { animated, useSpring } from '@react-spring/web'
import Link from 'next/link'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export function HomeLogo() {
  const shortContent = 'kil.dev'
  const longContent = 'Kilian.DevOps'

  const [isHovered, setIsHovered] = useState(false)
  const [shortWidth, setShortWidth] = useState(0)
  const [longWidth, setLongWidth] = useState(0)

  const shortRef = useRef<HTMLSpanElement>(null)
  const longRef = useRef<HTMLSpanElement>(null)

  const [styles, api] = useSpring(() => ({
    from: { width: 0 },
    config: { tension: 240, friction: 28 },
  }))

  useLayoutEffect(() => {
    const shortEl = shortRef.current
    const longEl = longRef.current
    if (!shortEl || !longEl) return

    const shortRect = shortEl.getBoundingClientRect()
    const longRect = longEl.getBoundingClientRect()
    const s = Math.ceil(shortRect.width)
    const l = Math.ceil(longRect.width)
    setShortWidth(s)
    setLongWidth(l)
    api.set({ width: s })
  }, [api])

  useLayoutEffect(() => {
    if (!shortWidth || !longWidth) return
    void api.start({
      width: isHovered ? longWidth : shortWidth,
    })
  }, [api, isHovered, longWidth, shortWidth])

  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => setIsHovered(false), [])
  const handleFocus = useCallback(() => setIsHovered(true), [])
  const handleBlur = useCallback(() => setIsHovered(false), [])

  const ariaLabel = isHovered ? `{ ${longContent} }` : `{ ${shortContent} }`

  return (
    <Link href="/" aria-label={ariaLabel}>
      <div
        className="group flex cursor-pointer items-center gap-3 text-foreground"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}>
        <h2 className="relative text-xl leading-tight font-bold text-foreground">
          {/* Hidden measuring spans for width calculations */}
          <span
            ref={shortRef}
            aria-hidden="true"
            className="absolute opacity-0 pointer-events-none select-none whitespace-nowrap">
            {shortContent}
          </span>
          <span
            ref={longRef}
            aria-hidden="true"
            className="absolute opacity-0 pointer-events-none select-none whitespace-nowrap">
            {longContent}
          </span>
          <span aria-hidden="true">{'{ '}</span>
          <animated.span
            style={{ width: styles.width }}
            className="relative inline-block align-top overflow-hidden whitespace-nowrap">
            <span aria-hidden="true" className="invisible">
              {longContent}
            </span>
            <span aria-hidden="true" className="absolute inset-0">
              <animated.span
                className="absolute inset-0"
                style={{
                  clipPath: styles.width.to(w => `inset(0 ${Math.max(longWidth - w, 0)}px 0 0)`),
                }}>
                {longContent}
              </animated.span>
              <animated.span
                className="absolute inset-0"
                style={{
                  clipPath: styles.width.to(w => `inset(0 0 0 ${Math.max(w - shortWidth, 0)}px)`),
                }}>
                {shortContent}
              </animated.span>
            </span>
          </animated.span>
          <span aria-hidden="true">{' }'}</span>
        </h2>
      </div>
    </Link>
  )
}
