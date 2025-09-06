'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'

export function HomeLogo() {
  const shortContent = 'Kil.Dev'
  const longContent = 'Kilian.DevOps'

  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => setIsHovered(false), [])
  const handleFocus = useCallback(() => setIsHovered(true), [])
  const handleBlur = useCallback(() => setIsHovered(false), [])

  const ariaLabel = isHovered ? `{ ${longContent} }` : `{ ${shortContent} }`

  return (
    <Link
      href="/"
      aria-label={ariaLabel}
      className="group flex cursor-pointer items-center gap-3 text-foreground"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}>
      <div>
        <h2 className="relative text-xl leading-tight font-bold text-foreground whitespace-nowrap">
          <span aria-hidden="true">{'{ '}</span>
          <span className="inline-block align-top">
            <span aria-hidden="true">Kil</span>
            <span
              aria-hidden="true"
              className="inline-block align-top overflow-hidden max-w-0 group-hover:max-w-[3ch] group-focus-visible:max-w-[3ch] transition-[max-width] duration-500 ease-out">
              <span>ian</span>
            </span>
          </span>
          <span aria-hidden="true">.</span>
          <span className="inline-block align-top">
            <span aria-hidden="true">Dev</span>
            <span
              aria-hidden="true"
              className="inline-block align-top overflow-hidden max-w-0 group-hover:max-w-[3ch] group-focus-visible:max-w-[3ch] transition-[max-width] duration-300 ease-out">
              <span>Ops</span>
            </span>
          </span>
          <span aria-hidden="true">{' }'}</span>
        </h2>
      </div>
    </Link>
  )
}
