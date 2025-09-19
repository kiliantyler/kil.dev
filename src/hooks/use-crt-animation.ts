import { useKonamiAnimation } from '@/components/providers/konami-animation-provider'
import { type GameBoxDimensions } from '@/utils/grid'
import { useCallback, useEffect, useRef, useState } from 'react'

export type CrtPhase = 'idle' | 'opening' | 'open' | 'closing' | 'closed'

export type CrtAnimationState = {
  phase: CrtPhase
  centerX: number
  centerY: number
  horizontalWidth: number
  verticalHeight: number
  opacity: number
  glowIntensity: number
}

export type UseCrtAnimationArgs = {
  getDimensions: () => GameBoxDimensions
}

export function useCrtAnimation({ getDimensions }: UseCrtAnimationArgs) {
  const { closeAnimation, finishCloseAnimation, isReturning, showSnake } = useKonamiAnimation()

  const [crtAnimation, setCrtAnimation] = useState<CrtAnimationState>({
    phase: 'opening',
    centerX: 0,
    centerY: 0,
    horizontalWidth: 0,
    verticalHeight: 0,
    opacity: 0,
    glowIntensity: 0,
  })
  const rafRef = useRef<{ rafId: number | null }>({ rafId: null })
  const phaseRef = useRef<CrtPhase>('opening')

  useEffect(() => {
    phaseRef.current = crtAnimation.phase
  }, [crtAnimation.phase])

  const startCrtAnimation = useCallback(() => {
    const { centerX, centerY, borderWidth, borderHeight } = getDimensions()

    setCrtAnimation({
      phase: 'opening',
      centerX,
      centerY,
      horizontalWidth: 0,
      verticalHeight: 0,
      opacity: 0,
      glowIntensity: 0,
    })

    const pointDuration = 300
    const horizontalDuration = 700
    const verticalDuration = 500
    const duration = pointDuration + horizontalDuration + verticalDuration
    const glowDuration = 1200
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      const pointProgress = Math.min(elapsed / pointDuration, 1)
      const pointSize = pointProgress * 8

      const horizontalStart = pointDuration
      const horizontalProgress = Math.max(0, Math.min((elapsed - horizontalStart) / horizontalDuration, 1))
      const horizontalEased = 1 - Math.pow(1 - horizontalProgress, 3)
      const horizontalWidth = horizontalEased * borderWidth

      const verticalStart = pointDuration + horizontalDuration
      const verticalProgress = Math.max(0, Math.min((elapsed - verticalStart) / verticalDuration, 1))
      const verticalEased = 1 - Math.pow(1 - verticalProgress, 2)
      const verticalHeight = verticalEased * borderHeight

      const opacityStart = 100
      const opacityProgress = Math.max(0, Math.min((elapsed - opacityStart) / (duration - 200), 1))
      const opacityEased = 1 - Math.pow(1 - opacityProgress, 2)
      const opacity = Math.min(opacityEased, 1)

      const glowProgress = Math.min(elapsed / glowDuration, 1)
      const glowIntensity = glowProgress < 0.5 ? 0.9 : 0.9 * (1 - (glowProgress - 0.5) / 0.5)

      setCrtAnimation({
        phase: progress < 1 ? 'opening' : 'open',
        centerX,
        centerY,
        horizontalWidth: Math.max(horizontalWidth, pointSize),
        verticalHeight: Math.max(verticalHeight, pointSize),
        opacity,
        glowIntensity,
      })

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setCrtAnimation(prev => ({
          ...prev,
          phase: 'open',
          horizontalWidth: borderWidth,
          verticalHeight: borderHeight,
          opacity: 1,
          glowIntensity: 0.3,
        }))
      }
    }

    requestAnimationFrame(animate)

    const fallbackTimeout = setTimeout(() => {
      setCrtAnimation(prev => ({
        ...prev,
        phase: 'open',
        horizontalWidth: borderWidth,
        verticalHeight: borderHeight,
        opacity: 1,
        glowIntensity: 0.3,
      }))
    }, 1600)

    return () => clearTimeout(fallbackTimeout)
  }, [getDimensions])

  const startCrtCloseAnimation = useCallback(() => {
    if (phaseRef.current === 'closing' || phaseRef.current === 'closed') return
    const { centerX, centerY, borderWidth, borderHeight } = getDimensions()

    setCrtAnimation({
      phase: 'closing',
      centerX,
      centerY,
      horizontalWidth: borderWidth,
      verticalHeight: borderHeight,
      opacity: 1,
      glowIntensity: 0.3,
    })

    const verticalDuration = 500
    const horizontalDuration = 700
    const pointDuration = 300
    const startTime = Date.now()

    let hasSignaledReturn = false

    const animate = () => {
      const elapsed = Date.now() - startTime
      const total = verticalDuration + horizontalDuration + pointDuration

      const verticalProgress = Math.min(elapsed / verticalDuration, 1)
      const verticalEased = 1 - Math.pow(1 - verticalProgress, 2)
      const currentVerticalHeight = (1 - verticalEased) * borderHeight

      const horizontalElapsed = Math.max(0, elapsed - verticalDuration)
      const horizontalProgress = Math.min(horizontalElapsed / horizontalDuration, 1)
      const horizontalEased = 1 - Math.pow(1 - horizontalProgress, 3)
      const currentHorizontalWidth = (1 - horizontalEased) * borderWidth

      const pointElapsed = Math.max(0, elapsed - verticalDuration - horizontalDuration)
      const pointProgress = Math.min(pointElapsed / pointDuration, 1)
      const pointSize = (1 - pointProgress) * 8

      const signalDuringLine = verticalProgress >= 1 && horizontalProgress >= 0.7 && pointElapsed === 0
      if (!hasSignaledReturn && signalDuringLine) {
        closeAnimation()
        hasSignaledReturn = true
      }

      const opacityProgress = Math.min(elapsed / total, 1)
      const opacity =
        opacityProgress < (verticalDuration + horizontalDuration) / total
          ? 1
          : 1 - (opacityProgress - (verticalDuration + horizontalDuration) / total) / (pointDuration / total)

      let glowIntensity = 0.6
      if (pointElapsed > 0 && pointElapsed < 120) glowIntensity = 1
      else if (pointElapsed >= 120) glowIntensity = Math.max(0, 1 - (pointElapsed - 120) / (pointDuration - 120))

      setCrtAnimation(prev => ({
        ...prev,
        phase: elapsed < total ? 'closing' : 'closed',
        centerX,
        centerY,
        horizontalWidth: Math.max(currentHorizontalWidth, pointSize),
        verticalHeight: Math.max(currentVerticalHeight, pointSize),
        opacity: Math.max(0, Math.min(1, opacity)),
        glowIntensity,
      }))

      if (elapsed < total) {
        rafRef.current.rafId = requestAnimationFrame(animate)
      } else {
        rafRef.current.rafId = null
        finishCloseAnimation()
      }
    }

    rafRef.current.rafId = requestAnimationFrame(animate)
  }, [getDimensions, finishCloseAnimation, closeAnimation])

  useEffect(() => {
    if (isReturning) startCrtCloseAnimation()
  }, [isReturning, startCrtCloseAnimation])

  useEffect(() => {
    startCrtAnimation()
  }, [startCrtAnimation])

  useEffect(() => {
    const closeState = rafRef.current
    return () => {
      const rafId = closeState.rafId
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return {
    showSnake,
    crtAnimation,
    startCrtAnimation,
    startCrtCloseAnimation,
  }
}
