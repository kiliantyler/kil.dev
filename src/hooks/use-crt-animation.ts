import { useKonamiAnimation } from '@/components/providers/konami-animation-provider'
import { type GameBoxDimensions } from '@/utils/grid'
import { useCallback, useEffect, useRef, useState } from 'react'

export type CrtAnimationState = {
  isAnimating: boolean
  centerX: number
  centerY: number
  horizontalWidth: number
  verticalHeight: number
  opacity: number
  glowIntensity: number
}

type UseCrtAnimationArgs = {
  getDimensions: () => GameBoxDimensions
}

export function useCrtAnimation({ getDimensions }: UseCrtAnimationArgs) {
  const { closeAnimation, finishCloseAnimation, isReturning, showSnake } = useKonamiAnimation()

  const [crtAnimation, setCrtAnimation] = useState<CrtAnimationState>({
    isAnimating: true,
    centerX: 0,
    centerY: 0,
    horizontalWidth: 0,
    verticalHeight: 0,
    opacity: 0,
    glowIntensity: 0,
  })
  const crtCloseRef = useRef<{ isClosing: boolean; rafId: number | null }>({ isClosing: false, rafId: null })
  const [isCrtClosing, setIsCrtClosing] = useState(false)
  const [isCrtOff, setIsCrtOff] = useState(false)

  const startCrtAnimation = useCallback(() => {
    setIsCrtOff(false)
    const { centerX, centerY, borderWidth, borderHeight } = getDimensions()

    setCrtAnimation({
      isAnimating: true,
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
        isAnimating: progress < 1,
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
          isAnimating: false,
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
        isAnimating: false,
        horizontalWidth: borderWidth,
        verticalHeight: borderHeight,
        opacity: 1,
        glowIntensity: 0.3,
      }))
    }, 1600)

    return () => clearTimeout(fallbackTimeout)
  }, [getDimensions])

  const startCrtCloseAnimation = useCallback(() => {
    if (crtCloseRef.current.isClosing) return
    const { centerX, centerY, borderWidth, borderHeight } = getDimensions()

    setCrtAnimation({
      isAnimating: true,
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
    crtCloseRef.current.isClosing = true
    setIsCrtClosing(true)
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
        isAnimating: elapsed < total,
        centerX,
        centerY,
        horizontalWidth: Math.max(currentHorizontalWidth, pointSize),
        verticalHeight: Math.max(currentVerticalHeight, pointSize),
        opacity: Math.max(0, Math.min(1, opacity)),
        glowIntensity,
      }))

      if (elapsed < total) {
        crtCloseRef.current.rafId = requestAnimationFrame(animate)
      } else {
        crtCloseRef.current.isClosing = false
        crtCloseRef.current.rafId = null
        setIsCrtClosing(false)
        setIsCrtOff(true)
        finishCloseAnimation()
      }
    }

    crtCloseRef.current.rafId = requestAnimationFrame(animate)
  }, [getDimensions, finishCloseAnimation, closeAnimation])

  useEffect(() => {
    if (isReturning) startCrtCloseAnimation()
  }, [isReturning, startCrtCloseAnimation])

  useEffect(() => {
    startCrtAnimation()
  }, [startCrtAnimation])

  useEffect(() => {
    return () => {
      const rafId = crtCloseRef.current.rafId
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return {
    showSnake,
    crtAnimation,
    isCrtClosing,
    isCrtOff,
    startCrtAnimation,
    startCrtCloseAnimation,
  }
}
