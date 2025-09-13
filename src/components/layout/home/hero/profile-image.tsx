'use client'

import { captureLadybirdDetected, captureProfileImageClicked } from '@/hooks/posthog'
import { useHash } from '@/hooks/use-hash'
import Confused from '@/images/headshot/cartoon-confused.webp'
import Grumpy from '@/images/headshot/cartoon-grumpy.webp'
import Ladybird from '@/images/headshot/cartoon-ladybird.webp'
import { CONTENT } from '@/lib/content'
import { getThemeHeadshot, themes } from '@/lib/themes'
import Image, { type StaticImageData } from 'next/image'
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'

export function ProfileImage() {
  const hash = useHash()
  const [mounted, setMounted] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(true)
  const useConfused = mounted && hash === '#YouWereAlreadyHere'
  const [isGrumpy, setIsGrumpy] = useState(false)
  const [isLadybird, setIsLadybird] = useState(false)

  type ProfileVariant = 'grumpy' | 'ladybird' | 'confused' | 'default'
  type NonThemeVariant = Exclude<ProfileVariant, 'default'>

  const VARIANT_TO_IMAGE: Record<NonThemeVariant, StaticImageData> = {
    grumpy: Grumpy,
    ladybird: Ladybird,
    confused: Confused,
  }

  function computeVariant(isGrumpyFlag: boolean, isLadybirdFlag: boolean, useConfusedFlag: boolean): ProfileVariant {
    if (isGrumpyFlag) return 'grumpy'
    if (isLadybirdFlag) return 'ladybird'
    if (useConfusedFlag) return 'confused'
    return 'default'
  }

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
  const variant = computeVariant(isGrumpy, isLadybird, useConfused)
  let imageSrc: StaticImageData = getThemeHeadshot('light')
  if (variant !== 'default') {
    imageSrc = VARIANT_TO_IMAGE[variant]
  }
  const altSuffix = variant === 'default' ? 'headshot' : variant
  const imageAlt = `${CONTENT.NAME} ${altSuffix}`

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
    const names = themes.map(t => t.name)
    const nonBase = names.filter(n => n !== 'light' && n !== 'dark')
    const rules: string[] = []
    rules.push('.profile-img{display:none}')
    for (const n of nonBase) rules.push(`html.${n} .profile-img[data-theme="${n}"]{display:block}`)
    if (names.includes('dark'))
      rules.push(`html.dark${nonBase.map(n => `:not(.${n})`).join('')} .profile-img[data-theme="dark"]{display:block}`)
    if (names.includes('light'))
      rules.push(
        `html${['dark', ...nonBase].map(n => `:not(.${n})`).join('')} .profile-img[data-theme="light"]{display:block}`,
      )
    return rules.join('')
  }, [])

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
        aria-busy={false}>
        <style dangerouslySetInnerHTML={{ __html: profileImgCss }} />
        {themes.map(t => (
          <Image
            key={t.name}
            alt={imageAlt}
            src={getThemeHeadshot(t.name)}
            data-theme={t.name}
            className="profile-img rounded-lg transition-transform duration-500 ease-(--ease-fluid) translate-y-0 scale-100 transform-gpu group-hover:-translate-y-1 group-hover:scale-105"
            loading="eager"
            priority={t.name === 'light'}
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
      </div>
    </div>
  )
}
