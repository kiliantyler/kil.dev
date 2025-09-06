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
        <h2 className="relative text-xl leading-tight font-bold text-foreground whitespace-nowrap">
          {/* hidden measuring spans */}
          <span
            ref={shortPrefixRef}
            aria-hidden="true"
            className="absolute opacity-0 pointer-events-none select-none whitespace-nowrap">
            Kil
          </span>
          <span
            ref={longPrefixRef}
            aria-hidden="true"
            className="absolute opacity-0 pointer-events-none select-none whitespace-nowrap">
            Kilian
          </span>
          <span
            ref={shortSuffixRef}
            aria-hidden="true"
            className="absolute opacity-0 pointer-events-none select-none whitespace-nowrap">
            Dev
          </span>
          <span
            ref={longSuffixRef}
            aria-hidden="true"
            className="absolute opacity-0 pointer-events-none select-none whitespace-nowrap">
            DevOps
          </span>

          <span aria-hidden="true">{'{ '}</span>

          {/* Prefix: kil -> Kilian */}
          <animated.span style={{ width: springs.prefix }} className="relative inline-block align-top overflow-hidden">
            <span aria-hidden="true" className="invisible">
              Kilian
            </span>
            <span aria-hidden="true" className="absolute inset-0">
              <animated.span
                className="absolute inset-0"
                style={{ clipPath: springs.prefix.to(w => `inset(0 ${Math.max(longPrefixWidth - w, 0)}px 0 0)`) }}>
                Kilian
              </animated.span>
              <animated.span
                className="absolute inset-0 z-10"
                style={{ clipPath: springs.prefix.to(w => `inset(0 0 0 ${Math.max(w - shortPrefixWidth, 0)}px)`) }}>
                Kil
              </animated.span>
            </span>
          </animated.span>

          {/* Dot: moves naturally as prefix grows */}
          <span>.</span>

          {/* Suffix: Dev -> DevOps */}
          <animated.span style={{ width: springs.suffix }} className="relative inline-block align-top overflow-hidden">
            <span aria-hidden="true" className="invisible">
              DevOps
            </span>
            <span aria-hidden="true" className="absolute inset-0">
              <animated.span
                className="absolute inset-0"
                style={{ clipPath: springs.suffix.to(w => `inset(0 ${Math.max(longSuffixWidth - w, 0)}px 0 0)`) }}>
                DevOps
              </animated.span>
              <animated.span
                className="absolute inset-0 z-10"
                style={{ clipPath: springs.suffix.to(w => `inset(0 0 0 ${Math.max(w - shortSuffixWidth, 0)}px)`) }}>
                Dev
              </animated.span>
            </span>
          </animated.span>

          <span aria-hidden="true">{' }'}</span>
        </h2>
      </div>
    </Link>
  )
}
