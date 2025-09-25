'use client'

import { useAchievements } from '@/components/providers/achievements-provider'
import { useKonamiAnimation } from '@/components/providers/konami-animation-provider'
import { captureLadybirdDetected, captureProfileImageClicked } from '@/hooks/posthog'
import { useHash } from '@/hooks/use-hash'
import * as Headshots from '@/images/headshot'
import { type AchievementId } from '@/lib/achievements'
import { HOME_CONTENT } from '@/lib/content'
import { themes } from '@/lib/themes'
import { isLadybirdUA } from '@/utils/ladybird'
import { PROFILE_IMAGE_VARIANT_DATA_ATTRIBUTE } from '@/utils/profile-image-variant-script'
import { buildPerThemeVariantCss } from '@/utils/theme-css'
import { getThemeHeadshot } from '@/utils/themes'
import Image, { type StaticImageData } from 'next/image'
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'

function getAnimationClass(isAnimating: boolean, hasAnimated: boolean, isReturning: boolean): string {
  if (isReturning) return 'konami-return-right'
  let classes = ''
  if (isAnimating) classes += 'konami-fly-right'
  if (hasAnimated) classes += (classes ? ' ' : '') + 'konami-complete konami-fly-right'
  return classes
}

export function ProfileImage() {
  const { isAnimating, hasAnimated, isReturning } = useKonamiAnimation()
  const { unlock, has } = useAchievements()
  const hash = useHash()
  const [mounted, setMounted] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(true)
  const useConfused = mounted && hash === '#YouWereAlreadyHere'
  const [isGrumpy, setIsGrumpy] = useState(false)
  const [isLadybird, setIsLadybird] = useState(() => {
    if (typeof window === 'undefined') return false
    return isLadybirdUA()
  })
  // Amongus variant is handled purely via CSS using the root data attribute

  type ProfileVariant = 'grumpy' | 'ladybird' | 'confused' | 'default'
  type NonThemeVariant = Exclude<ProfileVariant, 'default'>

  const VARIANT_TO_IMAGE: Record<NonThemeVariant, StaticImageData> = {
    grumpy: Headshots.Grumpy,
    ladybird: Headshots.Ladybird,
    confused: Headshots.Confused,
  }

  function captureIfNotAlready() {
    try {
      const alreadyCaptured = window.sessionStorage.getItem('ladybird_detected_event') === '1'
      if (!alreadyCaptured) {
        captureLadybirdDetected(navigator.userAgent || '')
        window.sessionStorage.setItem('ladybird_detected_event', '1')
      }
    } catch {}
  }

  function computeVariant(isGrumpyFlag: boolean, isLadybirdFlag: boolean, useConfusedFlag: boolean): ProfileVariant {
    if (isGrumpyFlag) return 'grumpy'
    if (isLadybirdFlag) return 'ladybird'
    if (useConfusedFlag) return 'confused'
    return 'default'
  }

  useEffect(() => {
    if (isLadybird) {
      try {
        const alreadyCaptured = window.sessionStorage.getItem('ladybird_detected_event') === '1'
        if (!alreadyCaptured) {
          captureLadybirdDetected(navigator.userAgent || '')
          window.sessionStorage.setItem('ladybird_detected_event', '1')
        }
      } catch {}
      return
    }
    if (!isLadybirdUA()) return

    setIsLadybird(true)
    try {
      const alreadyCaptured = window.sessionStorage.getItem('ladybird_detected_event') === '1'
      if (!alreadyCaptured) {
        captureLadybirdDetected(navigator.userAgent || '')
        window.sessionStorage.setItem('ladybird_detected_event', '1')
      }
    } catch {}
  }, [isLadybird])

  // No runtime toggling for Amongus; CSS/attribute handles first paint and hydration

  useEffect(() => {
    if (isLadybird) {
      if (!has('LADYBIRD_LANDING' as AchievementId)) {
        unlock('LADYBIRD_LANDING' as AchievementId)
      }
    }
    if (useConfused) {
      if (!has('CONFUSED_CLICK' as AchievementId)) {
        unlock('CONFUSED_CLICK' as AchievementId)
      }
    }
  }, [isLadybird, useConfused, has, unlock])

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleClick = useCallback(() => {
    if (isGrumpy) return
    setIsGrumpy(true)
    captureProfileImageClicked('click', 'grumpy', useConfused)
    if (!has('GRUMPY_GLIMPSE' as AchievementId)) {
      unlock('GRUMPY_GLIMPSE' as AchievementId)
    }
  }, [isGrumpy, useConfused, has, unlock])

  const handlePointerLeave = useCallback(() => {
    setIsGrumpy(false)
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      if (isGrumpy) return
      setIsGrumpy(true)
      captureProfileImageClicked('keyboard', 'grumpy', useConfused)
      if (!has('GRUMPY_GLIMPSE' as AchievementId)) {
        unlock('GRUMPY_GLIMPSE' as AchievementId)
      }
    },
    [isGrumpy, useConfused, has, unlock],
  )
  const variant = computeVariant(isGrumpy, isLadybird, useConfused)
  let imageSrc: StaticImageData = getThemeHeadshot('light')
  if (variant !== 'default') {
    imageSrc = VARIANT_TO_IMAGE[variant]
  }
  const altSuffix = variant === 'default' ? 'headshot' : variant
  const imageAlt = `${HOME_CONTENT.NAME} ${altSuffix}`

  const isEnvDrivenVariant = variant === 'ladybird' || variant === 'confused'
  const isBaseThemeVariant = !isGrumpy && !isLadybird && !useConfused

  useEffect(() => {
    if (!mounted) return
    if (isEnvDrivenVariant) {
      setIsImageLoaded(false)
    } else {
      setIsImageLoaded(true)
    }
  }, [mounted, isEnvDrivenVariant])

  const profileImgCss = useMemo(() => {
    const base = buildPerThemeVariantCss({
      baseSelector: '.profile-img',
      variantAttr: 'data-theme',
      display: 'block',
    })
    const toggle = `\nhtml[${PROFILE_IMAGE_VARIANT_DATA_ATTRIBUTE}="amongus"] .profile-img{display:none!important}\nhtml[${PROFILE_IMAGE_VARIANT_DATA_ATTRIBUTE}="amongus"] .amongus-img{display:block!important}`
    return base + toggle
  }, [])

  return (
    <div
      className={`group relative order-1 mx-auto w-full max-w-md lg:order-2 lg:mx-0 select-none ${getAnimationClass(isAnimating, hasAnimated, isReturning)}`}
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
        aria-busy={mounted && isEnvDrivenVariant && !isImageLoaded}>
        <style>{profileImgCss}</style>
        {themes.map(t => (
          <Image
            key={t.name}
            alt={imageAlt}
            src={getThemeHeadshot(t.name)}
            data-theme={t.name}
            className="profile-img rounded-lg transition-transform duration-500 ease-(--ease-fluid) translate-y-0 scale-100 transform-gpu group-hover:-translate-y-1 group-hover:scale-105"
            loading={t.name === 'light' || t.name === 'dark' ? 'eager' : 'lazy'}
            priority={t.name === 'light' || t.name === 'dark'}
            fill
            sizes="(min-width: 1024px) 500px, 100vw"
          />
        ))}

        {mounted && !isBaseThemeVariant && (
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

        {/* Always render Amongus overlay; CSS shows when root has data attribute */}
        <Image
          alt={`${HOME_CONTENT.NAME} amongus`}
          src={Headshots.Amongus}
          className="amongus-img hidden rounded-lg transition-transform duration-500 ease-(--ease-fluid) translate-y-0 scale-100 transform-gpu group-hover:-translate-y-1 group-hover:scale-105"
          loading="eager"
          priority
          fill
          sizes="(min-width: 1024px) 500px, 100vw"
          aria-hidden
          role="presentation"
        />
      </div>
    </div>
  )
}
