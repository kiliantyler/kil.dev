'use client'

import { useTheme } from '@/components/providers/theme-provider'
import { captureLadybirdDetected, captureProfileImageClicked } from '@/hooks/posthog'
import { useHash } from '@/hooks/use-hash'
import Confused from '@/images/headshot/cartoon-confused.webp'
import Cyberpunk from '@/images/headshot/cartoon-cyberpunk.webp'
import Grumpy from '@/images/headshot/cartoon-grumpy.webp'
import Halloween from '@/images/headshot/cartoon-halloween.webp'
import Headshot from '@/images/headshot/cartoon-headshot.webp'
import Ladybird from '@/images/headshot/cartoon-ladybird.webp'
import { CONTENT } from '@/lib/content'
import Image, { type StaticImageData } from 'next/image'
import { useCallback, useEffect, useLayoutEffect, useState, type KeyboardEvent } from 'react'

export function ProfileImage() {
  const hash = useHash()
  const [mounted, setMounted] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(true)
  const [cookieTheme, setCookieTheme] = useState<string | null>(null)
  const useConfused = mounted && hash === '#YouWereAlreadyHere'
  const [isGrumpy, setIsGrumpy] = useState(false)
  const [isLadybird, setIsLadybird] = useState(false)
  const [isHalloween, setIsHalloween] = useState(false)

  type ProfileVariant = 'grumpy' | 'cyberpunk' | 'halloween' | 'ladybird' | 'confused' | 'default'

  const VARIANT_TO_IMAGE: Record<ProfileVariant, StaticImageData> = {
    grumpy: Grumpy,
    cyberpunk: Cyberpunk,
    halloween: Halloween,
    ladybird: Ladybird,
    confused: Confused,
    default: Headshot,
  }

  function computeVariant(
    isGrumpyFlag: boolean,
    isCyberpunkFlag: boolean,
    isHalloweenFlag: boolean,
    isLadybirdFlag: boolean,
    useConfusedFlag: boolean,
  ): ProfileVariant {
    if (isGrumpyFlag) return 'grumpy'
    if (isCyberpunkFlag) return 'cyberpunk'
    if (isHalloweenFlag) return 'halloween'
    if (isLadybirdFlag) return 'ladybird'
    if (useConfusedFlag) return 'confused'
    return 'default'
  }

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const ua = navigator.userAgent || ''
    if (ua.toLowerCase().includes('halloween')) {
      setIsHalloween(true)
    }
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

  // Read theme preference cookie as early as possible on the client
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    const themeMatch = /(?:^|; )theme=([^;]+)/.exec(document.cookie)
    const raw = themeMatch?.[1]
    setCookieTheme(typeof raw === 'string' && raw.length > 0 ? decodeURIComponent(raw) : null)
  }, [])

  useEffect(() => {
    setMounted(true)
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
  const theme = useTheme()
  const isCyberpunk = cookieTheme === 'cyberpunk' || (mounted && theme.resolvedTheme === 'cyberpunk')
  const variant = computeVariant(isGrumpy, isCyberpunk, isHalloween, isLadybird, useConfused)
  const imageSrc = VARIANT_TO_IMAGE[variant]
  const altSuffix = variant === 'default' || variant === 'cyberpunk' || variant === 'halloween' ? 'headshot' : variant
  const imageAlt = `${CONTENT.NAME} ${altSuffix}`

  const isEnvDrivenVariant =
    variant === 'cyberpunk' || variant === 'ladybird' || variant === 'confused' || variant === 'halloween'
  const isBaseThemeVariant = !isGrumpy && !isLadybird && !isHalloween && !useConfused

  useEffect(() => {
    if (!mounted) return
    if (isEnvDrivenVariant) {
      setIsImageLoaded(false)
    } else {
      setIsImageLoaded(true)
    }
  }, [mounted, isEnvDrivenVariant])

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
      <div className="border-primary absolute -top-4 -left-4 h-full w-full -rotate-3 group-hover:scale-110 group-hover:translate-y-3 group-hover:translate-x-4 rounded-lg border-4 transition-transform duration-500 ease-(--ease-fluid) group-hover:rotate-0" />
      <div
        className="relative aspect-square w-full rounded-lg bg-cover bg-center bg-no-repeat shadow-2xl"
        aria-busy={!isImageLoaded}>
        <div
          aria-hidden
          className={`${isEnvDrivenVariant && !isImageLoaded ? 'opacity-100' : 'opacity-0'} absolute inset-0 rounded-lg bg-muted animate-pulse transition-opacity duration-500`}
        />
        {isBaseThemeVariant ? (
          <>
            <Image
              alt={imageAlt}
              src={Headshot}
              className="rounded-lg transition-transform duration-500 ease-(--ease-fluid) translate-y-0 scale-100 transform-gpu group-hover:-translate-y-1 group-hover:scale-105 cyberpunk:hidden"
              loading="eager"
              priority
              fill
              sizes="(min-width: 1024px) 500px, 100vw"
            />
            <Image
              alt={imageAlt}
              src={Cyberpunk}
              className="hidden rounded-lg transition-transform duration-500 ease-(--ease-fluid) translate-y-0 scale-100 transform-gpu group-hover:-translate-y-1 group-hover:scale-105 cyberpunk:block"
              loading="eager"
              priority
              fill
              sizes="(min-width: 1024px) 500px, 100vw"
            />
            <Image
              alt={imageAlt}
              src={Halloween}
              className="hidden rounded-lg transition-transform duration-500 ease-(--ease-fluid) translate-y-0 scale-100 transform-gpu group-hover:-translate-y-1 group-hover:scale-105 halloween:block"
              loading="eager"
              priority
              fill
              sizes="(min-width: 1024px) 500px, 100vw"
            />
          </>
        ) : (
          <Image
            alt={imageAlt}
            src={imageSrc}
            className={`${isEnvDrivenVariant && !isImageLoaded ? 'opacity-0' : 'opacity-100'} rounded-lg transition-transform duration-500 ease-(--ease-fluid) translate-y-0 scale-100 transform-gpu group-hover:-translate-y-1 group-hover:scale-105`}
            loading="eager"
            priority
            fill
            sizes="(min-width: 1024px) 500px, 100vw"
            onLoad={() => setIsImageLoaded(true)}
          />
        )}
      </div>
    </div>
  )
}
