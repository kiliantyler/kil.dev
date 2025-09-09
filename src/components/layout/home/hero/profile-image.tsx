'use client'

import { captureLadybirdDetected, captureProfileImageClicked } from '@/hooks/posthog'
import { useHash } from '@/hooks/use-hash'
import Confused from '@/images/headshot/cartoon-confused.webp'
import Grumpy from '@/images/headshot/cartoon-grumpy.webp'
import Headshot from '@/images/headshot/cartoon-headshot.webp'
import Ladybird from '@/images/headshot/cartoon-ladybird.webp'
import { CONTENT } from '@/lib/content'
import Image from 'next/image'
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'

export function ProfileImage() {
  const hash = useHash()
  const useConfused = hash === '#YouWereAlreadyHere'
  const [isGrumpy, setIsGrumpy] = useState(false)
  const [isLadybird, setIsLadybird] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const ua = navigator.userAgent || ''
    if (ua.toLowerCase().includes('ladybird')) {
      setIsLadybird(true)
      try {
        if (typeof window !== 'undefined') {
          const alreadyCaptured = window.sessionStorage.getItem('ladybird_detected_event') === '1'
          if (!alreadyCaptured) {
            captureLadybirdDetected(ua)
            window.sessionStorage.setItem('ladybird_detected_event', '1')
          }
        }
      } catch {}
    }
  }, [])

  const handleClick = useCallback(() => {
    if (isGrumpy) return
    setIsGrumpy(true)
    captureProfileImageClicked('click', 'grumpy', useConfused)
  }, [isGrumpy, useConfused])

  const handlePointerLeave = useCallback(() => {
    setIsGrumpy(false)
  }, [])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsGrumpy(true)
    }
  }, [])

  const defaultImageSrc = isLadybird ? Ladybird : useConfused ? Confused : Headshot
  const imageSrc = isGrumpy ? Grumpy : defaultImageSrc
  const imageAlt = `${CONTENT.NAME} ${isGrumpy ? 'grumpy' : isLadybird ? 'ladybird' : useConfused ? 'confused' : 'headshot'}`

  return (
    <div
      className="group relative order-1 mx-auto w-full max-w-md lg:order-2 lg:mx-0"
      role="button"
      tabIndex={0}
      aria-pressed={isGrumpy}
      aria-label="Toggle grumpy profile image"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerLeave={handlePointerLeave}
      onMouseLeave={handlePointerLeave}
      onBlur={handlePointerLeave}>
      <div className="border-primary absolute -top-4 -left-4 h-full w-full -rotate-3 group-hover:scale-110 group-hover:translate-y-3 group-hover:translate-x-4 rounded-lg border-4 transition-transform duration-500 group-hover:rotate-0" />
      <div className="relative h-auto w-full rounded-lg bg-cover bg-center bg-no-repeat shadow-2xl">
        <Image
          alt={imageAlt}
          src={imageSrc}
          className="rounded-lg transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105"
          loading="eager"
          priority
          width={500}
          height={500}
        />
      </div>
    </div>
  )
}
