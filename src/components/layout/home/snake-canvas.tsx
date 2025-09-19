'use client'

import type { CrtAnimationState } from '@/hooks/use-crt-animation'
import type { Position } from '@/hooks/use-snake-game'
import type { GameBoxDimensions } from '@/utils/grid'
import { useEffect, useRef } from 'react'

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // CRT mask
    ctx.save()
    if (crtAnimation.isAnimating) {
      const { centerX, centerY, horizontalWidth, verticalHeight } = crtAnimation
      const glowPadding = 20
      const rectX = centerX - horizontalWidth / 2 - glowPadding
      const rectY = centerY - verticalHeight / 2 - glowPadding
      const rectWidth = horizontalWidth + glowPadding * 2
      const rectHeight = verticalHeight + glowPadding * 2
      ctx.beginPath()
      ctx.rect(rectX, rectY, rectWidth, rectHeight)
      ctx.clip()
    }

    // opacity
    ctx.globalAlpha = Math.max(crtAnimation.opacity, 0.1)

    const { borderLeft, borderTop, borderWidth, borderHeight, gridCellSize, gridOffset, centerGridX, safeXMin } =
      gameBox

    // Border
    const cornerRadius = 12
    const gradient = ctx.createLinearGradient(borderLeft, borderTop, borderLeft + borderWidth, borderTop + borderHeight)
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)')
    gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.6)')
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.8)')
    ctx.strokeStyle = gradient
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(borderLeft + 2, borderTop + 2, borderWidth - 4, borderHeight - 4, cornerRadius - 2)
    ctx.stroke()

    // BG tint when showSnake
    if (showSnake) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.05)'
      ctx.beginPath()
      ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      ctx.fill()
    }

    if (showSnake) {
      // Snake
      snake.forEach((segment, index) => {
        const x = (centerGridX + segment.x - safeXMin) * gridCellSize + gridOffset
        const y = segment.y * gridCellSize + gridOffset
        ctx.fillStyle = index === 0 ? '#10b981' : '#34d399'
        ctx.fillRect(x + 2, y + 2, gridCellSize - 4, gridCellSize - 4)
      })

      // Food
      const foodX = (centerGridX + food.x - safeXMin) * gridCellSize + gridOffset
      const foodY = food.y * gridCellSize + gridOffset
      ctx.fillStyle = isGoldenApple ? '#fbbf24' : '#ef4444'
      ctx.fillRect(foodX + 2, foodY + 2, gridCellSize - 4, gridCellSize - 4)
    }

    // CRT effects
    const isDarkMode = theme === 'dark'
    if (showSnake) {
      ctx.save()
      const scanLineHeight = 2
      const scanLineSpacing = 4
      const scanLineOpacity = isDarkMode ? 0.15 : 0.04
      const scanLineColor = '0, 0, 0'
      ctx.fillStyle = `rgba(${scanLineColor}, ${scanLineOpacity})`
      for (let y = borderTop; y < borderTop + borderHeight; y += scanLineHeight + scanLineSpacing) {
        ctx.fillRect(borderLeft, y, borderWidth, scanLineHeight)
      }
      const verticalScanLineWidth = 1
      const verticalScanLineSpacing = 8
      const verticalScanLineOpacity = isDarkMode ? 0.08 : 0.02
      ctx.fillStyle = `rgba(${scanLineColor}, ${verticalScanLineOpacity})`
      for (let x = borderLeft; x < borderLeft + borderWidth; x += verticalScanLineWidth + verticalScanLineSpacing) {
        ctx.fillRect(x, borderTop, verticalScanLineWidth, borderHeight)
      }
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      const curvatureOpacity = isDarkMode ? 0.05 : 0.01
      ctx.fillStyle = `rgba(0, 0, 0, ${curvatureOpacity})`
      const vignette = ctx.createRadialGradient(
        borderLeft + borderWidth / 2,
        borderTop + borderHeight / 2,
        0,
        borderLeft + borderWidth / 2,
        borderTop + borderHeight / 2,
        Math.max(borderWidth, borderHeight) / 2,
      )
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0)')
      vignette.addColorStop(1, `rgba(0, 0, 0, ${isDarkMode ? 0.1 : 0.02})`)
      ctx.fillStyle = vignette
      ctx.fillRect(borderLeft, borderTop, borderWidth, borderHeight)
      ctx.restore()
      ctx.restore()
    }

    if (crtAnimation.isAnimating || crtAnimation.glowIntensity > 0) {
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
      ctx.shadowBlur = 20 * Math.max(crtAnimation.glowIntensity, 0.3)
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      ctx.strokeStyle = gradient2
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    if (showSnake && gameOver && drawGameOverOverlay) drawGameOverOverlay(ctx, gameBox)
    if (showSnake && !isPlaying && !gameOver && drawStartScreen) drawStartScreen(ctx, gameBox)

    ctx.restore()
  }, [
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
  ])

  return (
    <canvas ref={canvasRef} className="absolute inset-0 z-10" style={{ pointerEvents: isPlaying ? 'none' : 'auto' }} />
  )
}
