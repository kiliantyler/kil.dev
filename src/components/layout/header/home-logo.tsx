'use client'

import { animated, useSpring } from '@react-spring/web'
import Link from 'next/link'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export function HomeLogo() {
  const shortContent = 'Kil.Dev'
  const longContent = 'Kilian.DevOps'

  const [isHovered, setIsHovered] = useState(false)
  const [shortPrefixWidth, setShortPrefixWidth] = useState(0)
  const [longPrefixWidth, setLongPrefixWidth] = useState(0)
  const [shortSuffixWidth, setShortSuffixWidth] = useState(0)
  const [longSuffixWidth, setLongSuffixWidth] = useState(0)

  const shortPrefixRef = useRef<HTMLSpanElement>(null)
  const longPrefixRef = useRef<HTMLSpanElement>(null)
  const shortSuffixRef = useRef<HTMLSpanElement>(null)
  const longSuffixRef = useRef<HTMLSpanElement>(null)

  const [springs, api] = useSpring(() => ({
    from: { prefix: 0, suffix: 0 },
    config: { tension: 240, friction: 28 },
  }))

  useLayoutEffect(() => {
    const sp = shortPrefixRef.current
    const lp = longPrefixRef.current
    const ss = shortSuffixRef.current
    const ls = longSuffixRef.current
    if (!sp || !lp || !ss || !ls) return

    const spw = Math.ceil(sp.getBoundingClientRect().width)
    const lpw = Math.ceil(lp.getBoundingClientRect().width)
    const ssw = Math.ceil(ss.getBoundingClientRect().width)
    const lsw = Math.ceil(ls.getBoundingClientRect().width)

    setShortPrefixWidth(spw)
    setLongPrefixWidth(lpw)
    setShortSuffixWidth(ssw)
    setLongSuffixWidth(lsw)

    api.set({ prefix: spw, suffix: ssw })
  }, [api])

  useLayoutEffect(() => {
    if (!shortPrefixWidth || !longPrefixWidth || !shortSuffixWidth || !longSuffixWidth) return
    void api.start({
      prefix: isHovered ? longPrefixWidth : shortPrefixWidth,
      suffix: isHovered ? longSuffixWidth : shortSuffixWidth,
    })
  }, [api, isHovered, shortPrefixWidth, longPrefixWidth, shortSuffixWidth, longSuffixWidth])

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
