'use client'

import type { CrtAnimationState } from '@/hooks/use-crt-animation'
import type { Position } from '@/hooks/use-snake-game'
import type { GameBoxDimensions } from '@/utils/grid'
import { useEffect, useMemo, useRef } from 'react'

type SnakeCanvasProps = {
  snake: Position[]
  food: Position
  isGoldenApple: boolean
  crtAnimation: CrtAnimationState
  gameBox: GameBoxDimensions
  showSnake: boolean
  theme: string | undefined
  isPlaying: boolean
  gameOver: boolean
  drawGameOverOverlay?: (ctx: CanvasRenderingContext2D, dimensions: GameBoxDimensions) => void
  drawStartScreen?: (ctx: CanvasRenderingContext2D, dimensions: GameBoxDimensions) => void
}

export function SnakeCanvas({
  snake,
  food,
  isGoldenApple,
  crtAnimation,
  gameBox,
  showSnake,
  theme,
  isPlaying,
  gameOver,
  drawGameOverOverlay,
  drawStartScreen,
}: SnakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const latestSnakeRef = useRef<Position[]>(snake)
  const latestFoodRef = useRef<Position>(food)
  const latestGoldenRef = useRef<boolean>(isGoldenApple)
  const latestCrtRef = useRef<CrtAnimationState>(crtAnimation)
  const latestGameOverRef = useRef<boolean>(gameOver)
  const latestIsPlayingRef = useRef<boolean>(isPlaying)
  const latestDrawGameOverRef = useRef<SnakeCanvasProps['drawGameOverOverlay']>(drawGameOverOverlay)
  const latestDrawStartRef = useRef<SnakeCanvasProps['drawStartScreen']>(drawStartScreen)

  latestSnakeRef.current = snake
  latestFoodRef.current = food
  latestGoldenRef.current = isGoldenApple
  latestCrtRef.current = crtAnimation
  latestGameOverRef.current = gameOver
  latestIsPlayingRef.current = isPlaying
  latestDrawGameOverRef.current = drawGameOverOverlay
  latestDrawStartRef.current = drawStartScreen

  const scanlineConfig = useMemo(() => {
    const isDark = theme === 'dark'
    return {
      scanLineHeight: 2,
      scanLineSpacing: 4,
      scanLineOpacity: isDark ? 0.15 : 0.04,
      verticalScanLineWidth: 1,
      verticalScanLineSpacing: 8,
      verticalScanLineOpacity: isDark ? 0.08 : 0.02,
      curvatureOpacity: isDark ? 0.05 : 0.01,
      vignetteEdgeOpacity: isDark ? 0.1 : 0.02,
    }
  }, [theme])

  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null)

  // Initialize canvas size and handle resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const setSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      // keep offscreen in sync
      offscreenCanvasRef.current ??= document.createElement('canvas')
      const off = offscreenCanvasRef.current
      if (!off) return
      off.width = canvas.width
      off.height = canvas.height
      offscreenCtxRef.current = off.getContext('2d', { willReadFrequently: true })
    }

    setSize()
    window.addEventListener('resize', setSize)
    return () => window.removeEventListener('resize', setSize)
  }, [])

  // Draw static background to offscreen when rare deps change
  useEffect(() => {
    const off = offscreenCanvasRef.current
    const offCtx = offscreenCtxRef.current
    if (!off || !offCtx) return

    offCtx.clearRect(0, 0, off.width, off.height)

    const { borderLeft, borderTop, borderWidth, borderHeight } = gameBox
    const cornerRadius = 12

    // Border gradients
    const gradient = offCtx.createLinearGradient(
      borderLeft,
      borderTop,
      borderLeft + borderWidth,
      borderTop + borderHeight,
    )
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)')
    gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.6)')
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.8)')
    offCtx.strokeStyle = gradient
    offCtx.lineWidth = 3
    offCtx.lineCap = 'round'
    offCtx.lineJoin = 'round'
    offCtx.beginPath()
    offCtx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
    offCtx.stroke()
    offCtx.strokeStyle = 'rgba(16, 185, 129, 0.2)'
    offCtx.lineWidth = 1
    offCtx.beginPath()
    offCtx.roundRect(borderLeft + 2, borderTop + 2, borderWidth - 4, borderHeight - 4, cornerRadius - 2)
    offCtx.stroke()

    // BG tint
    if (showSnake) {
      offCtx.fillStyle = 'rgba(16, 185, 129, 0.05)'
      offCtx.beginPath()
      offCtx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      offCtx.fill()
    }

    // CRT scanlines and vignette
    if (showSnake) {
      offCtx.save()

      const c = scanlineConfig
      const scanLineColor = '0, 0, 0'
      offCtx.fillStyle = `rgba(${scanLineColor}, ${c.scanLineOpacity})`
      for (let y = borderTop; y < borderTop + borderHeight; y += c.scanLineHeight + c.scanLineSpacing) {
        offCtx.fillRect(borderLeft, y, borderWidth, c.scanLineHeight)
      }

      offCtx.fillStyle = `rgba(${scanLineColor}, ${c.verticalScanLineOpacity})`
      for (let x = borderLeft; x < borderLeft + borderWidth; x += c.verticalScanLineWidth + c.verticalScanLineSpacing) {
        offCtx.fillRect(x, borderTop, c.verticalScanLineWidth, borderHeight)
      }

      offCtx.save()
      offCtx.globalCompositeOperation = 'multiply'
      offCtx.fillStyle = `rgba(0, 0, 0, ${c.curvatureOpacity})`
      const vignette = offCtx.createRadialGradient(
        borderLeft + borderWidth / 2,
        borderTop + borderHeight / 2,
        0,
        borderLeft + borderWidth / 2,
        borderTop + borderHeight / 2,
        Math.max(borderWidth, borderHeight) / 2,
      )
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0)')
      vignette.addColorStop(1, `rgba(0, 0, 0, ${scanlineConfig.vignetteEdgeOpacity})`)
      offCtx.fillStyle = vignette
      offCtx.fillRect(borderLeft, borderTop, borderWidth, borderHeight)
      offCtx.restore()

      offCtx.restore()
    }
  }, [gameBox, showSnake, scanlineConfig])

  // RAF loop for dynamic drawing
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    let animationId = 0
    const cornerRadius = 12

    const render = () => {
      const { borderLeft, borderTop, borderWidth, borderHeight, gridCellSize, gridOffset, centerGridX, safeXMin } =
        gameBox

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // CRT mask
      ctx.save()
      const crt = latestCrtRef.current
      if (crt.phase === 'opening' || crt.phase === 'closing') {
        const { centerX, centerY, horizontalWidth, verticalHeight } = crt
        const glowPadding = 20
        const rectX = centerX - horizontalWidth / 2 - glowPadding
        const rectY = centerY - verticalHeight / 2 - glowPadding
        const rectWidth = horizontalWidth + glowPadding * 2
        const rectHeight = verticalHeight + glowPadding * 2
        ctx.beginPath()
        ctx.rect(rectX, rectY, rectWidth, rectHeight)
        ctx.clip()
      }

      ctx.globalAlpha = Math.max(crt.opacity, 0.1)

      // Draw static background layer
      const off = offscreenCanvasRef.current
      if (off) ctx.drawImage(off, 0, 0)

      // Dynamic: snake and food
      if (showSnake) {
        const currentSnake = latestSnakeRef.current
        for (let i = 0; i < currentSnake.length; i++) {
          const segment = currentSnake[i]
          if (!segment) continue
          const x = (centerGridX + segment.x - safeXMin) * gridCellSize + gridOffset
          const y = segment.y * gridCellSize + gridOffset
          ctx.fillStyle = i === 0 ? '#10b981' : '#34d399'
          ctx.fillRect(x + 2, y + 2, gridCellSize - 4, gridCellSize - 4)
        }

        const f = latestFoodRef.current
        const foodX = (centerGridX + f.x - safeXMin) * gridCellSize + gridOffset
        const foodY = f.y * gridCellSize + gridOffset
        ctx.fillStyle = latestGoldenRef.current ? '#fbbf24' : '#ef4444'
        ctx.fillRect(foodX + 2, foodY + 2, gridCellSize - 4, gridCellSize - 4)
      }

      // Dynamic CRT glow overlay
      if (crt.phase !== 'closed' || crt.glowIntensity > 0) {
        const gradient2 = ctx.createLinearGradient(
          borderLeft,
          borderTop,
          borderLeft + borderWidth,
          borderTop + borderHeight,
        )
        gradient2.addColorStop(0, 'rgba(16, 185, 129, 0.8)')
        gradient2.addColorStop(0.5, 'rgba(34, 197, 94, 0.6)')
        gradient2.addColorStop(1, 'rgba(16, 185, 129, 0.8)')
        ctx.shadowColor = '#10b981'
        ctx.shadowBlur = 20 * Math.max(crt.glowIntensity, 0.3)
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        ctx.strokeStyle = gradient2
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Overlays
      if (showSnake && latestGameOverRef.current && latestDrawGameOverRef.current) {
        latestDrawGameOverRef.current(ctx, gameBox)
      }
      if (showSnake && !latestIsPlayingRef.current && !latestGameOverRef.current && latestDrawStartRef.current) {
        latestDrawStartRef.current(ctx, gameBox)
      }

      ctx.restore()

      animationId = requestAnimationFrame(render)
    }

    animationId = requestAnimationFrame(render)

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [gameBox, showSnake])

  return (
    <canvas ref={canvasRef} className="absolute inset-0 z-10" style={{ pointerEvents: isPlaying ? 'none' : 'auto' }} />
  )
}
