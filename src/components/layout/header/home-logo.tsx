'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'

export function HomeLogo({ condensed = false }: { condensed?: boolean }) {
  const shortContent = 'kil.dev'
  const longContent = 'Kilian.DevOps'

  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => setIsHovered(false), [])
  const handleFocus = useCallback(() => setIsHovered(true), [])
  const handleBlur = useCallback(() => setIsHovered(false), [])

  const ariaLabel = useMemo(() => {
    if (condensed) return '{ }'
    return isHovered ? `{ ${longContent} }` : `{ ${shortContent} }`
  }, [condensed, isHovered, longContent, shortContent])

  return (
    <Link
      href="/"
      aria-label={ariaLabel}
      className="group flex cursor-pointer items-center gap-3 text-foreground select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}>
      <div>
        <h2 className="relative text-xl leading-tight font-bold text-foreground whitespace-nowrap">
          <span aria-hidden="true" className="inline-block -translate-y-[0.125rem]">
            {'{ '}
          </span>
          {/* Animated content wrapper collapses when condensed to slide right brace left */}
          <span
            aria-hidden="true"
            className={
              'inline-block align-top overflow-hidden transition-[max-width] duration-250 ease-out relative' +
              (condensed ? ' max-w-0' : ' max-w-[30ch]')
            }>
            {/* Right-to-left fade overlay anchored to the right edge */}
            <span
              aria-hidden="true"
              className={
                'pointer-events-none absolute top-0 right-0 bottom-0 w-[6ch] bg-gradient-to-l from-background/90 to-transparent transition-opacity duration-250 ease-out z-10' +
                (condensed ? ' opacity-100' : ' opacity-0')
              }
            />
            <span className="inline-block align-top">
              <span className="relative inline-block align-top">
                <span aria-hidden="true" className="invisible">
                  K
                </span>
                <span aria-hidden="true" className="absolute inset-0">
                  <span className="absolute left-0 top-0 transition-all duration-500 ease-out opacity-100 group-hover:opacity-0 translate-y-0 group-hover:-translate-y-0.5">
                    k
                  </span>
                  <span className="absolute left-0 top-0 transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0">
                    K
                  </span>
                </span>
              </span>
              <span aria-hidden="true">il</span>
              <span
                aria-hidden="true"
                className="inline-block align-top overflow-hidden max-w-0 group-hover:max-w-[3ch] group-focus-visible:max-w-[3ch] transition-[max-width] duration-500 ease-out">
                <span>ian</span>
              </span>
            </span>
            <span aria-hidden="true">.</span>
            <span className="inline-block align-top">
              <span className="relative inline-block align-top">
                <span aria-hidden="true" className="invisible">
                  D
                </span>
                <span aria-hidden="true" className="absolute inset-0">
                  <span className="absolute left-0 top-0 transition-all duration-500 ease-out opacity-100 group-hover:opacity-0 translate-y-0 group-hover:-translate-y-0.5">
                    d
                  </span>
                  <span className="absolute left-0 top-0 transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0">
                    D
                  </span>
                </span>
              </span>
              <span aria-hidden="true">ev</span>
              <span
                aria-hidden="true"
                className="inline-block align-top overflow-hidden max-w-0 group-hover:max-w-[3ch] group-focus-visible:max-w-[3ch] transition-[max-width] duration-500 ease-out">
                <span>Ops</span>
              </span>
            </span>
          </span>
          <span
            aria-hidden="true"
            className={
              'inline-block -translate-y-[0.125rem] transition-[margin] duration-250 ease-out will-change-[margin]'
            }>
            {condensed ? '}' : ' }'}
          </span>
        </h2>
      </div>
    </Link>
  )
}
