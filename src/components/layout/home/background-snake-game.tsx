'use client'

import { useKonamiAnimation } from '@/components/providers/konami-animation-provider'
import { useTheme } from '@/components/providers/theme-provider'
import { LIGHT_GRID } from '@/lib/light-grid'
import type { LeaderboardEntry } from '@/types/leaderboard'
import { playGameOverSound, playScoreSound } from '@/utils/arcade-utils'
import { useCallback, useEffect, useRef, useState } from 'react'

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Position = { x: number; y: number }

const BASE_GAME_SPEED = 150
const MIN_GAME_SPEED = 80
const SPEED_REDUCTION_PER_SEGMENT = 2
const GOLDEN_APPLE_CHANCE = 0.02

export function BackgroundSnakeGame() {
  const { showSnake, closeAnimation, finishCloseAnimation, isReturning } = useKonamiAnimation()
  const { resolvedTheme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [snake, setSnake] = useState<Position[]>([{ x: 5, y: 5 }])
  const [food, setFood] = useState<Position>({ x: 10, y: 10 })
  const [isGoldenApple, setIsGoldenApple] = useState(false)
  const [direction, setDirection] = useState<Direction>('RIGHT')
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [playerName, setPlayerName] = useState(['A', 'A', 'A'])
  const [nameInputPosition, setNameInputPosition] = useState(0)
  const [isSubmittingScore, setIsSubmittingScore] = useState(false)
  const [shouldSubmitScore, setShouldSubmitScore] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [crtAnimation, setCrtAnimation] = useState({
    isAnimating: true, // Start animating immediately
    centerX: 0,
    centerY: 0,
    horizontalWidth: 0,
    verticalHeight: 0,
    opacity: 0,
    glowIntensity: 0,
  })
  const gameLoopRef = useRef<number | null>(null)
  const crtCloseRef = useRef<{ isClosing: boolean; rafId: number | null }>({ isClosing: false, rafId: null })
  const [isCrtClosing, setIsCrtClosing] = useState(false)
  const [isCrtOff, setIsCrtOff] = useState(false)

  // Use refs to track current food state to avoid stale closures
  const foodRef = useRef<Position>({ x: 10, y: 10 })
  const isGoldenAppleRef = useRef<boolean>(false)
  const lastFoodEatenRef = useRef<Position | null>(null)

  // Calculate current game speed based on snake length
  const getCurrentGameSpeed = useCallback((snakeLength: number) => {
    const speedReduction = (snakeLength - 1) * SPEED_REDUCTION_PER_SEGMENT
    const newSpeed = BASE_GAME_SPEED - speedReduction
    return Math.max(newSpeed, MIN_GAME_SPEED)
  }, [])

  // Track window size changes
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }

    // Set initial size
    updateWindowSize()

    window.addEventListener('resize', updateWindowSize)
    return () => window.removeEventListener('resize', updateWindowSize)
  }, [])

  // Calculate grid dimensions based on window size
  const getGridDimensions = useCallback(() => {
    const gridCellSize = LIGHT_GRID.GRID_SIZE_PX
    const gridOffset = LIGHT_GRID.GRID_OFFSET_PX
    const width = windowSize.width || window.innerWidth
    const height = windowSize.height || window.innerHeight

    return {
      gridWidth: Math.floor(width / gridCellSize) - 1,
      gridHeight: Math.floor(height / gridCellSize),
      gridCellSize,
      gridOffset,
    }
  }, [windowSize])

  const getHeaderHeight = useCallback(() => {
    const { gridCellSize } = getGridDimensions()
    return Math.floor(80 / gridCellSize) * gridCellSize + 20
  }, [getGridDimensions])

  // Calculate safe play area boundaries that match the visual border (square)
  const getSafeBoundaries = useCallback(() => {
    const { gridCellSize, gridOffset } = getGridDimensions()
    const headerHeight = getHeaderHeight()
    const borderOffset = 40
    const actualHeaderHeight = headerHeight + borderOffset
    const footerHeight = Math.floor(60 / gridCellSize) * gridCellSize
    const width = windowSize.width || window.innerWidth
    const height = windowSize.height || window.innerHeight

    // Convert pixel positions to grid coordinates, then add inset
    const baseYMin = Math.floor((actualHeaderHeight - gridOffset) / gridCellSize)
    const baseYMax = Math.floor((height - footerHeight - gridOffset) / gridCellSize) - 1

    // Apply 1-grid-cell inset on top, left, and bottom
    const safeYMin = baseYMin + 1 // Top inset
    const safeYMax = baseYMax - 1 // Bottom inset
    const safeXMin = 1 // Left inset

    // Calculate available height and width for square
    const availableHeight = safeYMax - safeYMin + 1
    const maxWidth = Math.floor(width / gridCellSize) - 2 // Right boundary
    const availableWidth = maxWidth - safeXMin + 1

    // Make the play area square by using the smaller dimension
    const squareSize = Math.min(availableWidth, availableHeight)

    // Recalculate safe boundaries based on square size
    const safeXMax = safeXMin + squareSize - 1
    const safeYMaxAdjusted = safeYMin + squareSize - 1

    return {
      safeYMin,
      safeYMax: safeYMaxAdjusted,
      safeXMin,
      safeXMax,
      actualHeaderHeight,
      footerHeight,
      borderOffset,
    }
  }, [getGridDimensions, getHeaderHeight, windowSize])

  // Centralized game box sizing calculation
  const getGameBoxDimensions = useCallback(() => {
    const { gridCellSize, gridOffset } = getGridDimensions()
    const { safeYMin, safeYMax } = getSafeBoundaries()
    const totalGridWidth = Math.floor((windowSize.width || window.innerWidth) / gridCellSize)
    const squareGridSize = safeYMax - safeYMin + 1
    const centerGridX = Math.floor((totalGridWidth - squareGridSize) / 2)

    // Calculate all dimensions
    const squareSize = (safeYMax - safeYMin + 1) * gridCellSize
    const borderLeft = centerGridX * gridCellSize + gridOffset
    const borderTop = safeYMin * gridCellSize + gridOffset
    const borderBottom = (safeYMax + 1) * gridCellSize + gridOffset
    const borderWidth = squareSize
    const borderHeight = borderBottom - borderTop

    // Calculate center points
    const centerX = borderLeft + borderWidth / 2
    const centerY = borderTop + borderHeight / 2

    return {
      // Grid info
      gridCellSize,
      gridOffset,
      centerGridX,
      squareGridSize,

      // Dimensions
      squareSize,
      borderLeft,
      borderTop,
      borderBottom,
      borderWidth,
      borderHeight,

      // Centers
      centerX,
      centerY,

      // Safe boundaries for game logic
      safeYMin,
      safeYMax,
      safeXMin: getSafeBoundaries().safeXMin,
    }
  }, [getGridDimensions, getSafeBoundaries, windowSize])

  // Types for drawing helpers
  type GameBoxDimensions = ReturnType<typeof getGameBoxDimensions>

  // Draw helpers
  const drawGameBorder = useCallback(
    (ctx: CanvasRenderingContext2D, dimensions: GameBoxDimensions, showSnakeForBg: boolean) => {
      const { borderLeft, borderTop, borderWidth, borderHeight } = dimensions
      const cornerRadius = 12

      const gradient = ctx.createLinearGradient(
        borderLeft,
        borderTop,
        borderLeft + borderWidth,
        borderTop + borderHeight,
      )
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

      if (showSnakeForBg) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.05)'
        ctx.beginPath()
        ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
        ctx.fill()
      }
    },
    [],
  )

  const drawSnake = useCallback(
    (ctx: CanvasRenderingContext2D, snakeBody: Position[], dimensions: GameBoxDimensions) => {
      const { gridCellSize, gridOffset, centerGridX, safeXMin } = dimensions
      snakeBody.forEach((segment, index) => {
        const x = (centerGridX + segment.x - safeXMin) * gridCellSize + gridOffset
        const y = segment.y * gridCellSize + gridOffset
        ctx.fillStyle = index === 0 ? '#10b981' : '#34d399'
        ctx.fillRect(x + 2, y + 2, gridCellSize - 4, gridCellSize - 4)
      })
    },
    [],
  )

  const drawFood = useCallback(
    (ctx: CanvasRenderingContext2D, foodPos: Position, golden: boolean, dimensions: GameBoxDimensions) => {
      const { gridCellSize, gridOffset, centerGridX, safeXMin } = dimensions
      const foodX = (centerGridX + foodPos.x - safeXMin) * gridCellSize + gridOffset
      const foodY = foodPos.y * gridCellSize + gridOffset
      ctx.fillStyle = golden ? '#fbbf24' : '#ef4444'
      ctx.fillRect(foodX + 2, foodY + 2, gridCellSize - 4, gridCellSize - 4)
    },
    [],
  )

  const drawCRTEffects = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      dimensions: GameBoxDimensions,
      crt: typeof crtAnimation,
      theme: string | undefined,
      showSnakeForCrt: boolean,
    ) => {
      const { borderLeft, borderTop, borderWidth, borderHeight } = dimensions
      const isDarkMode = theme === 'dark'

      if (showSnakeForCrt) {
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

      if (crt.isAnimating) {
        const { centerX, centerY, horizontalWidth, verticalHeight } = crt
        if (horizontalWidth < 20) {
          const pulseIntensity = 0.8 + 0.2 * Math.sin(Date.now() * 0.01)
          ctx.shadowColor = '#10b981'
          ctx.shadowBlur = 30 * pulseIntensity
          ctx.fillStyle = 'rgba(16, 185, 129, 1)'
          ctx.fillRect(centerX - 4, centerY - 4, 8, 8)
          ctx.shadowBlur = 60 * pulseIntensity
          ctx.fillStyle = 'rgba(16, 185, 129, 0.8)'
          ctx.fillRect(centerX - 8, centerY - 8, 16, 16)
          ctx.shadowBlur = 0
        } else if (verticalHeight < 20) {
          const rectX = centerX - horizontalWidth / 2
          const rectY = centerY - 3
          const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.008)
          ctx.shadowColor = '#10b981'
          ctx.shadowBlur = 25 * pulseIntensity
          ctx.fillStyle = 'rgba(16, 185, 129, 1)'
          ctx.fillRect(rectX, rectY, horizontalWidth, 6)
          ctx.shadowBlur = 45 * pulseIntensity
          ctx.fillStyle = 'rgba(16, 185, 129, 0.8)'
          ctx.fillRect(rectX - 8, rectY - 8, horizontalWidth + 16, 22)
          ctx.shadowBlur = 0
        }
      }

      if (crt.isAnimating || crt.glowIntensity > 0) {
        const { borderLeft, borderTop, borderWidth, borderHeight } = dimensions
        const cornerRadius = 12
        const gradient = ctx.createLinearGradient(
          borderLeft,
          borderTop,
          borderLeft + borderWidth,
          borderTop + borderHeight,
        )
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)')
        gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.6)')
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.8)')

        ctx.shadowColor = '#10b981'
        ctx.shadowBlur = 20 * Math.max(crt.glowIntensity, 0.3)
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        ctx.strokeStyle = gradient
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
        ctx.stroke()
        ctx.shadowBlur = 0
      }
    },
    [],
  )

  const drawGameOverOverlay = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      scoreValue: number,
      leaderboardData: LeaderboardEntry[],
      loadingLeaderboard: boolean,
      shouldShowNameInput: boolean,
      nameChars: string[],
      namePos: number,
      submitting: boolean,
      dimensions: GameBoxDimensions,
    ) => {
      const { borderLeft, borderTop, borderWidth, borderHeight } = dimensions
      const cornerRadius = 12

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.beginPath()
      ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 100px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('GAME OVER', borderLeft + borderWidth / 2, borderTop + 60)

      ctx.font = '40px VT323, monospace'
      ctx.fillText(`Score: ${scoreValue}`, borderLeft + borderWidth / 2, borderTop + 100)

      if (loadingLeaderboard) {
        ctx.fillStyle = '#10b981'
        ctx.font = '36px VT323, monospace'
        ctx.fillText('Loading leaderboard...', borderLeft + borderWidth / 2, borderTop + 140)
      } else if (leaderboardData.length > 0) {
        ctx.fillStyle = '#10b981'
        ctx.font = 'bold 40px VT323, monospace'
        ctx.fillText('LEADERBOARD', borderLeft + borderWidth / 2, borderTop + 140)

        const startY = borderTop + 170
        const lineHeight = 20
        const maxEntries = Math.min(leaderboardData.length, 10)
        const leaderboardWidth = 200
        const leaderboardLeft = borderLeft + (borderWidth - leaderboardWidth) / 2

        for (let i = 0; i < maxEntries; i++) {
          const entry = leaderboardData[i]
          if (!entry) continue
          const y = startY + i * lineHeight
          if (entry.score === scoreValue) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
            ctx.fillRect(leaderboardLeft, y - 12, leaderboardWidth, lineHeight)
          }
          ctx.fillStyle = '#10b981'
          ctx.font = '20px VT323, monospace'
          ctx.textAlign = 'left'
          ctx.fillText(`#${i + 1}`, leaderboardLeft + 10, y)

          ctx.fillStyle = entry.score === scoreValue ? '#ffffff' : '#10b981'
          ctx.font = 'bold 20px VT323, monospace'
          ctx.fillText(entry.name, leaderboardLeft + 40, y)

          ctx.fillStyle = entry.score === scoreValue ? '#ffffff' : '#10b981'
          ctx.font = '20px VT323, monospace'
          ctx.textAlign = 'right'
          ctx.fillText(entry.score.toString().padStart(4, '0'), leaderboardLeft + leaderboardWidth - 10, y)
        }
      }

      if (shouldShowNameInput) {
        const leaderboardHeight = leaderboardData.length > 0 ? Math.min(leaderboardData.length, 8) * 25 + 50 : 0
        const nameInputY = borderTop + 170 + leaderboardHeight + 20
        ctx.fillStyle = '#10b981'
        ctx.font = 'bold 32px VT323, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('NEW HIGH SCORE!', borderLeft + borderWidth / 2, nameInputY)

        ctx.font = '24px VT323, monospace'
        ctx.fillText('Enter your initials:', borderLeft + borderWidth / 2, nameInputY + 30)

        const boxWidth = 30
        const boxSpacing = 20
        const totalWidth = boxWidth * 3 + boxSpacing * 2
        const nameStartX = borderLeft + borderWidth / 2 - totalWidth / 2
        const nameY = nameInputY + 60

        for (let i = 0; i < 3; i++) {
          const x = nameStartX + i * (boxWidth + boxSpacing)
          ctx.strokeStyle = namePos === i ? '#ffffff' : '#10b981'
          ctx.lineWidth = namePos === i ? 3 : 2
          ctx.strokeRect(x, nameY - 20, boxWidth, 30)
          ctx.fillStyle = '#10b981'
          ctx.font = 'bold 32px VT323, monospace'
          ctx.textAlign = 'center'
          ctx.fillText(nameChars[i] ?? 'A', x + boxWidth / 2, nameY)
        }

        ctx.fillStyle = '#10b981'
        ctx.font = '20px VT323, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('↑↓ Change letter  ←→ Move  SPACE Next/Submit', borderLeft + borderWidth / 2, nameInputY + 110)

        if (submitting) {
          ctx.fillStyle = '#ffffff'
          ctx.font = '24px VT323, monospace'
          ctx.textAlign = 'center'
          ctx.fillText('Submitting...', borderLeft + borderWidth / 2, nameInputY + 140)
        }
      }

      ctx.fillStyle = '#ffffff'
      ctx.font = '24px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Press SPACE to restart', borderLeft + borderWidth / 2, borderTop + borderHeight - 30)

      ctx.fillStyle = '#ffffff'
      ctx.font = '18px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('ESC to quit', borderLeft + borderWidth / 2, borderTop + borderHeight - 10)
    },
    [],
  )

  const drawStartScreen = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      dimensions: GameBoxDimensions,
      squareGridSize: number,
      centerGridX: number,
      safeYMin: number,
      showSnakeForStart: boolean,
      isPlayingState: boolean,
      gameOverState: boolean,
    ) => {
      if (!showSnakeForStart || isPlayingState || gameOverState) return
      const { gridCellSize, gridOffset, borderLeft, borderTop, borderWidth, borderHeight } = dimensions
      const cornerRadius = 12

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.beginPath()
      ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      ctx.fill()

      type Letter = 'S' | 'N' | 'A' | 'K' | 'E'
      const letters: Letter[] = ['S', 'N', 'A', 'K', 'E']
      const spacing = 1
      const glyph3x5: Record<Letter, string[]> = {
        S: ['111', '100', '111', '001', '111'],
        N: ['111', '101', '101', '101', '101'],
        A: ['010', '101', '111', '101', '101'],
        K: ['101', '101', '110', '101', '101'],
        E: ['111', '100', '110', '100', '111'],
      }
      const glyph: Record<Letter, string[]> = glyph3x5
      const letterW = 3
      const letterH = 5
      const totalWordW = letters.length * letterW + (letters.length - 1) * spacing
      const xStartGrid = centerGridX + Math.max(0, Math.floor((squareGridSize - totalWordW) / 2))
      const yCenter = safeYMin + Math.floor(squareGridSize / 2)
      const yStartGrid = Math.max(safeYMin + 1, yCenter - Math.floor(letterH / 2) - 2)

      ctx.fillStyle = '#10b981'
      for (let i = 0; i < letters.length; i++) {
        const ch = letters[i]
        if (!ch) continue
        const rows = glyph[ch]
        if (!rows) continue
        const letterX = xStartGrid + i * (letterW + spacing)
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r] ?? ''
          for (let c = 0; c < row.length; c++) {
            if (row[c] !== '1') continue
            const gx = (letterX + c) * gridCellSize + gridOffset
            const gy = (yStartGrid + r) * gridCellSize + gridOffset
            ctx.fillRect(gx + 2, gy + 2, gridCellSize - 4, gridCellSize - 4)
          }
        }
      }

      const centerXPx = borderLeft + borderWidth / 2
      ctx.fillStyle = '#ffffff'
      ctx.font = '28px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Use arrow keys to move', centerXPx, borderTop + borderHeight - 60)
      ctx.fillText('Press SPACE to start', centerXPx, borderTop + borderHeight - 30)

      ctx.fillStyle = '#ffffff'
      ctx.font = '20px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('ESC to quit', centerXPx, borderTop + borderHeight - 10)
    },
    [],
  )

  // Start CRT turn-on animation (mirror of power-down: point → horizontal line → full frame)
  const startCrtAnimation = useCallback(() => {
    // Ensure CRT is on for opening animation
    setIsCrtOff(false)
    // Get all dimensions from centralized calculation
    const { centerX, centerY, borderWidth, borderHeight } = getGameBoxDimensions()

    setCrtAnimation({
      isAnimating: true,
      centerX,
      centerY,
      horizontalWidth: 0,
      verticalHeight: 0,
      opacity: 0,
      glowIntensity: 0,
    })

    // Animation timeline - mirror the power-down feel
    const pointDuration = 300 // Hold a single point briefly
    const horizontalDuration = 700 // Expand to a horizontal line
    const verticalDuration = 500 // Then expand vertically to full frame
    const duration = pointDuration + horizontalDuration + verticalDuration // 1500ms total
    const glowDuration = 1200 // Strong glow early, then soften

    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Phase 1: Single point in center (0-0.3s)
      const pointProgress = Math.min(elapsed / pointDuration, 1)
      const pointSize = pointProgress * 8 // Larger, more visible point

      // Phase 2: Horizontal line grows (0.3-1.0s)
      const horizontalStart = pointDuration
      const horizontalProgress = Math.max(0, Math.min((elapsed - horizontalStart) / horizontalDuration, 1))
      // Ease-out for smoother horizontal expansion
      const horizontalEased = 1 - Math.pow(1 - horizontalProgress, 3)
      const horizontalWidth = horizontalEased * borderWidth

      // Phase 3: Vertical expansion (1.0-1.5s)
      const verticalStart = pointDuration + horizontalDuration
      const verticalProgress = Math.max(0, Math.min((elapsed - verticalStart) / verticalDuration, 1))
      // Ease-out for smoother vertical expansion
      const verticalEased = 1 - Math.pow(1 - verticalProgress, 2)
      const verticalHeight = verticalEased * borderHeight

      // Opacity animation: ramp in smoothly across most of timeline
      const opacityStart = 100
      const opacityProgress = Math.max(0, Math.min((elapsed - opacityStart) / (duration - 200), 1))
      // Ease-out for smoother opacity transition
      const opacityEased = 1 - Math.pow(1 - opacityProgress, 2)
      const opacity = Math.min(opacityEased, 1)

      // Glow intensity: strong early (point/line), then soften
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
        // Animation completed - set final state smoothly
        setCrtAnimation(prev => ({
          ...prev,
          isAnimating: false,
          horizontalWidth: borderWidth,
          verticalHeight: borderHeight,
          opacity: 1,
          glowIntensity: 0.3, // Maintain subtle glow for consistency
        }))
      }
    }

    requestAnimationFrame(animate)

    // Fallback timeout to ensure game becomes visible
    const fallbackTimeout = setTimeout(() => {
      setCrtAnimation(prev => ({
        ...prev,
        isAnimating: false,
        horizontalWidth: borderWidth,
        verticalHeight: borderHeight,
        opacity: 1,
        glowIntensity: 0.3, // Maintain subtle glow for consistency
      }))
    }, 1600) // 1.6s fallback (0.6s delay + 1.5s animation)

    return () => clearTimeout(fallbackTimeout)
  }, [getGameBoxDimensions])

  // Start CRT turn-off animation (reverse)
  const startCrtCloseAnimation = useCallback(() => {
    if (crtCloseRef.current.isClosing) return

    const { centerX, centerY, borderWidth, borderHeight } = getGameBoxDimensions()

    // Initialize to full open state
    setCrtAnimation({
      isAnimating: true,
      centerX,
      centerY,
      horizontalWidth: borderWidth,
      verticalHeight: borderHeight,
      opacity: 1,
      glowIntensity: 0.3,
    })

    // Close timeline tuned to read as CRT-off:
    // 1) Vertical collapse to a horizontal line (fast)
    // 2) Horizontal collapse to a bright center point (medium)
    // 3) Point flickers and fades out (short)
    const verticalDuration = 500
    const horizontalDuration = 700
    const pointDuration = 300

    const startTime = Date.now()
    crtCloseRef.current.isClosing = true
    setIsCrtClosing(true)
    // Reset signal
    let hasSignaledReturn = false

    const animate = () => {
      const elapsed = Date.now() - startTime
      const total = verticalDuration + horizontalDuration + pointDuration

      // Phase 1: Vertical collapse
      const verticalProgress = Math.min(elapsed / verticalDuration, 1)
      const verticalEased = 1 - Math.pow(1 - verticalProgress, 2)
      const currentVerticalHeight = (1 - verticalEased) * borderHeight

      // Phase 2: Horizontal collapse
      const horizontalElapsed = Math.max(0, elapsed - verticalDuration)
      const horizontalProgress = Math.min(horizontalElapsed / horizontalDuration, 1)
      const horizontalEased = 1 - Math.pow(1 - horizontalProgress, 3)
      const currentHorizontalWidth = (1 - horizontalEased) * borderWidth

      // Phase 3: Point flicker/fade
      const pointElapsed = Math.max(0, elapsed - verticalDuration - horizontalDuration)
      const pointProgress = Math.min(pointElapsed / pointDuration, 1)
      const pointSize = (1 - pointProgress) * 8

      // Trigger content return late in the horizontal collapse (>=70%), before the line disappears
      const signalDuringLine = verticalProgress >= 1 && horizontalProgress >= 0.7 && pointElapsed === 0
      if (!hasSignaledReturn && signalDuringLine) {
        closeAnimation()
        hasSignaledReturn = true
      }

      // Opacity: keep solid until point phase, then fade
      const opacityProgress = Math.min(elapsed / total, 1)
      const opacity =
        opacityProgress < (verticalDuration + horizontalDuration) / total
          ? 1
          : 1 - (opacityProgress - (verticalDuration + horizontalDuration) / total) / (pointDuration / total)

      // Glow: strong throughout, brief peak at the start of point phase, then decay
      let glowIntensity = 0.6
      if (pointElapsed > 0 && pointElapsed < 120) {
        glowIntensity = 1
      } else if (pointElapsed >= 120) {
        glowIntensity = Math.max(0, 1 - (pointElapsed - 120) / (pointDuration - 120))
      }

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
  }, [getGameBoxDimensions, finishCloseAnimation, closeAnimation])

  // If the provider enters returning state for any reason, ensure CRT close runs
  useEffect(() => {
    if (isReturning) {
      startCrtCloseAnimation()
    }
  }, [isReturning, startCrtCloseAnimation])

  // Start CRT animation immediately when component mounts (simultaneous with Konami)
  useEffect(() => {
    startCrtAnimation()
  }, [startCrtAnimation])

  // Generate random food position
  const generateFood = useCallback(
    (gridWidth: number, gridHeight: number): { position: Position; isGolden: boolean } => {
      const { safeYMin, safeYMax, safeXMin, safeXMax } = getSafeBoundaries()

      // Golden apple chance
      const isGolden = Math.random() < GOLDEN_APPLE_CHANCE

      // Ensure we have valid safe range
      if (safeYMin >= safeYMax || safeXMin >= safeXMax) {
        // Fallback to full grid if calculation fails
        const newFood = {
          x: Math.floor(Math.random() * gridWidth),
          y: Math.floor(Math.random() * gridHeight),
        }

        const isOnSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)
        if (isOnSnake) {
          return generateFood(gridWidth, gridHeight)
        }
        return { position: newFood, isGolden }
      }

      const newFood = {
        x: safeXMin + Math.floor(Math.random() * (safeXMax - safeXMin + 1)),
        y: safeYMin + Math.floor(Math.random() * (safeYMax - safeYMin + 1)),
      }

      // Make sure food doesn't spawn on snake
      const isOnSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)
      if (isOnSnake) {
        return generateFood(gridWidth, gridHeight)
      }

      return { position: newFood, isGolden }
    },
    [snake, getSafeBoundaries],
  )

  // Initialize game
  const initGame = useCallback(() => {
    const { gridWidth, gridHeight } = getGridDimensions()
    const { safeYMin, safeYMax, safeXMin, safeXMax } = getSafeBoundaries()

    // Start snake in safe area
    const startX = Math.max(safeXMin + 2, Math.min(5, safeXMax - 2))
    const startY = Math.max(safeYMin + 2, Math.min(5, safeYMax - 2))
    setSnake([{ x: startX, y: startY }])

    const foodData = generateFood(gridWidth, gridHeight)
    setFood(foodData.position)
    setIsGoldenApple(foodData.isGolden)
    foodRef.current = foodData.position
    isGoldenAppleRef.current = foodData.isGolden

    setDirection('RIGHT')
    setGameOver(false)
    setScore(0)
    setIsPlaying(true)
    setLeaderboard([])
    setIsLoadingLeaderboard(false)
    setShowNameInput(false)
    setPlayerName(['A', 'A', 'A'])
    setNameInputPosition(0)
    setIsSubmittingScore(false)
    setShouldSubmitScore(false)
    lastFoodEatenRef.current = null
  }, [generateFood, getGridDimensions, getSafeBoundaries])

  // Check if score qualifies for leaderboard
  const checkScoreQualification = useCallback(async (currentScore: number) => {
    try {
      console.log('Checking score qualification for score:', currentScore)
      const response = await fetch(`/api/scores/check?score=${currentScore}`)
      const data = (await response.json()) as { qualifies: boolean; currentThreshold?: number }
      console.log('Qualification response:', data)
      return data.qualifies
    } catch (error) {
      console.error('Error checking score qualification:', error)
      return false
    }
  }, [])

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    setIsLoadingLeaderboard(true)
    try {
      const response = await fetch('/api/scores')
      const data = (await response.json()) as { success: boolean; leaderboard: LeaderboardEntry[] }
      if (data.success) {
        setLeaderboard(data.leaderboard)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setIsLoadingLeaderboard(false)
    }
  }, [])

  // Handle name input navigation
  const handleNameInputKey = useCallback(
    (e: KeyboardEvent) => {
      if (!showNameInput) return

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          setPlayerName(prev => {
            const newName = [...prev]
            const currentChar = newName[nameInputPosition]
            if (!currentChar) return newName
            const newChar = currentChar === 'Z' ? 'A' : String.fromCharCode(currentChar.charCodeAt(0) + 1)
            newName[nameInputPosition] = newChar
            return newName
          })
          break
        case 'ArrowDown':
          e.preventDefault()
          setPlayerName(prev => {
            const newName = [...prev]
            const currentChar = newName[nameInputPosition]
            if (!currentChar) return newName
            const newChar = currentChar === 'A' ? 'Z' : String.fromCharCode(currentChar.charCodeAt(0) - 1)
            newName[nameInputPosition] = newChar
            return newName
          })
          break
        case 'ArrowLeft':
          e.preventDefault()
          setNameInputPosition(prev => Math.max(0, prev - 1))
          break
        case 'ArrowRight':
          e.preventDefault()
          setNameInputPosition(prev => Math.min(2, prev + 1))
          break
        case ' ':
          e.preventDefault()
          if (nameInputPosition < 2) {
            setNameInputPosition(prev => prev + 1)
          } else {
            // Set flag to submit score after state updates are processed
            setShouldSubmitScore(true)
          }
          break
      }
    },
    [showNameInput, nameInputPosition],
  )

  // Submit score to leaderboard
  const handleScoreSubmit = useCallback(async () => {
    if (isSubmittingScore) return

    setIsSubmittingScore(true)
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playerName.join(''),
          score,
        }),
      })

      const data = (await response.json()) as { success: boolean; message: string; leaderboard?: LeaderboardEntry[] }

      if (data.success) {
        // Update leaderboard with new data
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard)
        }
        // Keep name input visible briefly to show the updated leaderboard
        setTimeout(() => {
          setShowNameInput(false)
        }, 1000)
      } else {
        console.error('Failed to submit score:', data.message)
        setShowNameInput(false)
      }
    } catch (error) {
      console.error('Error submitting score:', error)
      setShowNameInput(false)
    } finally {
      setIsSubmittingScore(false)
    }
  }, [playerName, score, isSubmittingScore])

  // Handle game over logic
  const handleGameOver = useCallback(async () => {
    // Fetch leaderboard first
    await fetchLeaderboard()

    // Check if score qualifies
    const qualifies = await checkScoreQualification(score)

    if (qualifies) {
      setShowNameInput(true)
      setPlayerName(['A', 'A', 'A'])
      setNameInputPosition(0)
    }
  }, [score, fetchLeaderboard, checkScoreQualification])

  // Handle score submission when flag is set
  useEffect(() => {
    if (shouldSubmitScore && !isSubmittingScore) {
      setShouldSubmitScore(false)
      void handleScoreSubmit()
    }
  }, [shouldSubmitScore, isSubmittingScore, handleScoreSubmit])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showNameInput) {
        handleNameInputKey(e)
        return
      }

      if (!isPlaying) return

      switch (e.key) {
        case 'ArrowUp':
          if (direction !== 'DOWN') setDirection('UP')
          break
        case 'ArrowDown':
          if (direction !== 'UP') setDirection('DOWN')
          break
        case 'ArrowLeft':
          if (direction !== 'RIGHT') setDirection('LEFT')
          break
        case 'ArrowRight':
          if (direction !== 'LEFT') setDirection('RIGHT')
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [direction, isPlaying, showNameInput, handleNameInputKey, handleGameOver])

  // Create moveSnake function that can be reused
  const moveSnake = useCallback(() => {
    const { gridWidth, gridHeight } = getGridDimensions()

    setSnake(prevSnake => {
      if (!prevSnake[0]) return prevSnake
      const head: Position = { x: prevSnake[0].x, y: prevSnake[0].y }

      // Move head based on direction
      switch (direction) {
        case 'UP':
          head.y -= 1
          break
        case 'DOWN':
          head.y += 1
          break
        case 'LEFT':
          head.x -= 1
          break
        case 'RIGHT':
          head.x += 1
          break
      }

      // Get current grid dimensions for accurate boundary detection
      const { safeYMin, safeYMax, safeXMin, safeXMax } = getSafeBoundaries()

      // Check boundaries - walls kill the snake
      if (head.x < safeXMin || head.x > safeXMax || head.y < safeYMin || head.y > safeYMax) {
        setGameOver(true)
        setIsPlaying(false)
        playGameOverSound()
        void handleGameOver()
        return prevSnake
      }

      // Check self collision
      if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true)
        setIsPlaying(false)
        playGameOverSound()
        void handleGameOver()
        return prevSnake
      }

      const newSnake = [head, ...prevSnake]

      // Check food collision using current food state
      if (head.x === food.x && head.y === food.y) {
        // Prevent double scoring by checking if we already ate this food
        const currentFood = { x: food.x, y: food.y }
        if (
          lastFoodEatenRef.current &&
          lastFoodEatenRef.current.x === currentFood.x &&
          lastFoodEatenRef.current.y === currentFood.y
        ) {
          // Already processed this food, just return snake without growing
          return newSnake
        }

        // Mark this food as eaten
        lastFoodEatenRef.current = currentFood

        const points = isGoldenApple ? 50 : 10
        setScore(prev => {
          const newScore = prev + points
          playScoreSound(newScore)
          return newScore
        })

        const foodData = generateFood(gridWidth, gridHeight)
        setFood(foodData.position)
        setIsGoldenApple(foodData.isGolden)
        foodRef.current = foodData.position
        isGoldenAppleRef.current = foodData.isGolden

        // Don't remove tail since we ate food
        return newSnake
      } else {
        // Clear the last food eaten when we're not on food
        lastFoodEatenRef.current = null

        // Remove tail if no food eaten
        newSnake.pop()
        return newSnake
      }
    })
  }, [
    direction,
    generateFood,
    getGridDimensions,
    getSafeBoundaries,
    food,
    isGoldenApple,
    handleGameOver,
  ])

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return

    // Clear any existing interval
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
    }

    // Calculate current speed based on snake length
    const currentSpeed = getCurrentGameSpeed(snake.length)
    gameLoopRef.current = window.setInterval(moveSnake, currentSpeed)
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [
    gameOver,
    isPlaying,
    snake.length,
    getCurrentGameSpeed,
    moveSnake,
    getGridDimensions,
    getSafeBoundaries,
  ])

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Get all dimensions from centralized calculation
    const gameBox = getGameBoxDimensions()
    const {
      gridCellSize,
      gridOffset,
      borderLeft,
      borderTop,
      borderWidth,
      borderHeight,
      centerGridX,
      safeXMin,
      safeYMin,
      squareGridSize,
    } = gameBox

    // Set canvas size to window size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // When CRT is fully off, stop drawing frame/background
    if (isCrtOff) {
      ctx.restore()
      return
    }

    // Apply CRT animation effects
    ctx.save()

    // Apply opacity. When closing, let opacity drive the collapse visibility, otherwise maintain minimum
    ctx.globalAlpha = Math.max(crtAnimation.opacity, isCrtClosing ? 0 : 0.1)

    // Always draw CRT frame/background. Game elements inside are gated by `showSnake`.

    // Create CRT mask during animation (expanded to account for glow)
    if (crtAnimation.isAnimating || isCrtClosing) {
      const { centerX, centerY, horizontalWidth, verticalHeight } = crtAnimation

      // Expand clipping area to account for glow effect (20px on each side)
      const glowPadding = 20
      const rectX = centerX - horizontalWidth / 2 - glowPadding
      const rectY = centerY - verticalHeight / 2 - glowPadding
      const rectWidth = horizontalWidth + glowPadding * 2
      const rectHeight = verticalHeight + glowPadding * 2

      ctx.beginPath()
      ctx.rect(rectX, rectY, rectWidth, rectHeight)
      ctx.clip()
    }

    // Draw play area border with enhanced styling (square, centered)
    const cornerRadius = 12

    // Create gradient for border
    const gradient = ctx.createLinearGradient(borderLeft, borderTop, borderLeft + borderWidth, borderTop + borderHeight)
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)')
    gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.6)')
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.8)')

    // Draw border with rounded corners
    ctx.strokeStyle = gradient
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Draw rounded rectangle border (also during closing so the collapse is visible)
    ctx.beginPath()
    ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
    ctx.stroke()

    // Add inner glow effect (keep for closing too)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(borderLeft + 2, borderTop + 2, borderWidth - 4, borderHeight - 4, cornerRadius - 2)
    ctx.stroke()

    // Add subtle background fill only when showing gameplay
    if (showSnake) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.05)'
      ctx.beginPath()
      ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      ctx.fill()
    }

    // Only draw game elements when snake game is ready to show
    if (showSnake) {
      // Draw snake aligned with centered square grid
      snake.forEach((segment, index) => {
        const x = (centerGridX + segment.x - safeXMin) * gridCellSize + gridOffset
        const y = segment.y * gridCellSize + gridOffset

        ctx.fillStyle = index === 0 ? '#10b981' : '#34d399' // Head is brighter
        ctx.fillRect(x + 2, y + 2, gridCellSize - 4, gridCellSize - 4)
      })

      // Draw food aligned with centered square grid
      const foodX = (centerGridX + food.x - safeXMin) * gridCellSize + gridOffset
      const foodY = food.y * gridCellSize + gridOffset
      ctx.fillStyle = isGoldenApple ? '#fbbf24' : '#ef4444'
      ctx.fillRect(foodX + 2, foodY + 2, gridCellSize - 4, gridCellSize - 4)
    }

    // Add CRT scan lines effect
    if (showSnake) {
      ctx.save()

      // Create scan lines pattern - adaptive to theme
      const scanLineHeight = 2
      const scanLineSpacing = 4
      const isDarkMode = resolvedTheme === 'dark'
      const scanLineOpacity = isDarkMode ? 0.15 : 0.04 // Very light in light mode
      const scanLineColor = isDarkMode ? '0, 0, 0' : '0, 0, 0' // Black lines for both modes

      // Draw horizontal scan lines across the game area
      ctx.fillStyle = `rgba(${scanLineColor}, ${scanLineOpacity})`
      for (let y = borderTop; y < borderTop + borderHeight; y += scanLineHeight + scanLineSpacing) {
        ctx.fillRect(borderLeft, y, borderWidth, scanLineHeight)
      }

      // Add subtle vertical scan lines for more authentic CRT look
      const verticalScanLineWidth = 1
      const verticalScanLineSpacing = 8
      const verticalScanLineOpacity = isDarkMode ? 0.08 : 0.02 // Very light in light mode

      ctx.fillStyle = `rgba(${scanLineColor}, ${verticalScanLineOpacity})`
      for (let x = borderLeft; x < borderLeft + borderWidth; x += verticalScanLineWidth + verticalScanLineSpacing) {
        ctx.fillRect(x, borderTop, verticalScanLineWidth, borderHeight)
      }

      // Add subtle screen curvature effect - adaptive to theme
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      const curvatureOpacity = isDarkMode ? 0.05 : 0.01 // Very light in light mode
      ctx.fillStyle = `rgba(0, 0, 0, ${curvatureOpacity})`

      // Create a subtle vignette effect to simulate CRT screen curvature
      const gradient = ctx.createRadialGradient(
        borderLeft + borderWidth / 2,
        borderTop + borderHeight / 2,
        0,
        borderLeft + borderWidth / 2,
        borderTop + borderHeight / 2,
        Math.max(borderWidth, borderHeight) / 2,
      )
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
      gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)')
      gradient.addColorStop(1, `rgba(0, 0, 0, ${isDarkMode ? 0.1 : 0.02})`)

      ctx.fillStyle = gradient
      ctx.fillRect(borderLeft, borderTop, borderWidth, borderHeight)

      ctx.restore()
      ctx.restore()
    }

    // Add bright CRT glow effect after clipping
    if (crtAnimation.isAnimating) {
      const { centerX, centerY, horizontalWidth, verticalHeight } = crtAnimation

      // Create bright glow for single point phase
      if (horizontalWidth < 20) {
        // Pulsing glow effect
        const pulseIntensity = 0.8 + 0.2 * Math.sin(Date.now() * 0.01) // Fast pulse

        // Bright center point with strong glow
        ctx.shadowColor = '#10b981'
        ctx.shadowBlur = 30 * pulseIntensity
        ctx.fillStyle = 'rgba(16, 185, 129, 1)'
        ctx.fillRect(centerX - 4, centerY - 4, 8, 8)

        // Additional outer glow
        ctx.shadowBlur = 60 * pulseIntensity
        ctx.fillStyle = 'rgba(16, 185, 129, 0.8)'
        ctx.fillRect(centerX - 8, centerY - 8, 16, 16)

        // Reset shadow
        ctx.shadowBlur = 0
      }

      // Create bright glow for horizontal line phase
      else if (verticalHeight < 20) {
        const rectX = centerX - horizontalWidth / 2
        const rectY = centerY - 3

        // Pulsing glow effect for horizontal line
        const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.008) // Slightly slower pulse

        // Bright horizontal line with strong glow
        ctx.shadowColor = '#10b981'
        ctx.shadowBlur = 25 * pulseIntensity
        ctx.fillStyle = 'rgba(16, 185, 129, 1)'
        ctx.fillRect(rectX, rectY, horizontalWidth, 6)

        // Additional outer glow
        ctx.shadowBlur = 45 * pulseIntensity
        ctx.fillStyle = 'rgba(16, 185, 129, 0.8)'
        ctx.fillRect(rectX - 8, rectY - 8, horizontalWidth + 16, 22)

        // Reset shadow
        ctx.shadowBlur = 0
      }
    }

    // Add consistent CRT glow effect to border
    if (crtAnimation.isAnimating || crtAnimation.glowIntensity > 0) {
      ctx.shadowColor = '#10b981'
      ctx.shadowBlur = 20 * Math.max(crtAnimation.glowIntensity, 0.3) // Minimum glow during animation
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      // Redraw border with consistent glow
      ctx.strokeStyle = gradient
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      ctx.stroke()

      // Reset shadow
      ctx.shadowBlur = 0
    }

    // Draw game over overlay (only when snake game is ready)
    if (showSnake && gameOver) {
      // Draw rounded overlay background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.beginPath()
      ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      ctx.fill()

      // Draw game over text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 100px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('GAME OVER', borderLeft + borderWidth / 2, borderTop + 60)

      // Draw score
      ctx.font = '40px VT323, monospace'
      ctx.fillText(`Score: ${score}`, borderLeft + borderWidth / 2, borderTop + 100)

      // Always draw leaderboard first
      if (isLoadingLeaderboard) {
        ctx.fillStyle = '#10b981'
        ctx.font = '36px VT323, monospace'
        ctx.fillText('Loading leaderboard...', borderLeft + borderWidth / 2, borderTop + 140)
      } else if (leaderboard.length > 0) {
        // Draw leaderboard title
        ctx.fillStyle = '#10b981'
        ctx.font = 'bold 40px VT323, monospace'
        ctx.fillText('LEADERBOARD', borderLeft + borderWidth / 2, borderTop + 140)

        // Draw leaderboard entries - compact and centered
        const startY = borderTop + 170
        const lineHeight = 20
        const maxEntries = Math.min(leaderboard.length, 10) // Show max 10 entries

        // Calculate compact leaderboard width and position
        const leaderboardWidth = 200
        const leaderboardLeft = borderLeft + (borderWidth - leaderboardWidth) / 2

        for (let i = 0; i < maxEntries; i++) {
          const entry = leaderboard[i]
          if (!entry) continue

          const y = startY + i * lineHeight

          // Highlight current score if it matches
          if (entry.score === score) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
            ctx.fillRect(leaderboardLeft, y - 12, leaderboardWidth, lineHeight)
          }

          // Rank
          ctx.fillStyle = '#10b981'
          ctx.font = '20px VT323, monospace'
          ctx.textAlign = 'left'
          ctx.fillText(`#${i + 1}`, leaderboardLeft + 10, y)

          // Name
          ctx.fillStyle = entry.score === score ? '#ffffff' : '#10b981'
          ctx.font = 'bold 20px VT323, monospace'
          ctx.fillText(entry.name, leaderboardLeft + 40, y)

          // Score
          ctx.fillStyle = entry.score === score ? '#ffffff' : '#10b981'
          ctx.font = '20px VT323, monospace'
          ctx.textAlign = 'right'
          ctx.fillText(entry.score.toString().padStart(4, '0'), leaderboardLeft + leaderboardWidth - 10, y)
        }
      }

      // Draw name input below leaderboard if active
      if (showNameInput) {
        // Calculate position below leaderboard
        const leaderboardHeight = leaderboard.length > 0 ? Math.min(leaderboard.length, 8) * 25 + 50 : 0
        const nameInputY = borderTop + 170 + leaderboardHeight + 20

        // Draw name input title
        ctx.fillStyle = '#10b981'
        ctx.font = 'bold 32px VT323, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('NEW HIGH SCORE!', borderLeft + borderWidth / 2, nameInputY)

        ctx.font = '24px VT323, monospace'
        ctx.fillText('Enter your initials:', borderLeft + borderWidth / 2, nameInputY + 30)

        // Draw name input boxes - properly centered
        const boxWidth = 30
        const boxSpacing = 20
        const totalWidth = boxWidth * 3 + boxSpacing * 2 // 3 boxes + 2 gaps between them
        const nameStartX = borderLeft + borderWidth / 2 - totalWidth / 2
        const nameY = nameInputY + 60

        for (let i = 0; i < 3; i++) {
          const x = nameStartX + i * (boxWidth + boxSpacing)

          // Draw box
          ctx.strokeStyle = nameInputPosition === i ? '#ffffff' : '#10b981'
          ctx.lineWidth = nameInputPosition === i ? 3 : 2
          ctx.strokeRect(x, nameY - 20, boxWidth, 30)

          // Draw letter
          ctx.fillStyle = '#10b981'
          ctx.font = 'bold 32px VT323, monospace'
          ctx.textAlign = 'center'
          ctx.fillText(playerName[i] ?? 'A', x + boxWidth / 2, nameY)
        }

        // Draw instructions
        ctx.fillStyle = '#10b981'
        ctx.font = '20px VT323, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('↑↓ Change letter  ←→ Move  SPACE Next/Submit', borderLeft + borderWidth / 2, nameInputY + 110)

        if (isSubmittingScore) {
          ctx.fillStyle = '#ffffff'
          ctx.font = '24px VT323, monospace'
          ctx.textAlign = 'center'
          ctx.fillText('Submitting...', borderLeft + borderWidth / 2, nameInputY + 140)
        }
      }

      // Draw restart instruction
      ctx.fillStyle = '#ffffff'
      ctx.font = '24px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Press SPACE to restart', borderLeft + borderWidth / 2, borderTop + borderHeight - 30)

      // Draw quit instruction
      ctx.fillStyle = '#ffffff'
      ctx.font = '18px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('ESC to quit', borderLeft + borderWidth / 2, borderTop + borderHeight - 10)
    }

    // Draw start screen (only when snake game is ready)
    if (showSnake && !isPlaying && !gameOver) {
      // Draw rounded overlay background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.beginPath()
      ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      ctx.fill()

      // Draw SNAKE using snake pieces aligned to the grid
      type Letter = 'S' | 'N' | 'A' | 'K' | 'E'
      const letters: Letter[] = ['S', 'N', 'A', 'K', 'E']
      const spacing = 1 // grid cells between letters

      // 3x5 patterns
      const glyph3x5: Record<Letter, string[]> = {
        S: ['111', '100', '111', '001', '111'],
        N: ['111', '101', '101', '101', '101'],
        A: ['010', '101', '111', '101', '101'],
        K: ['101', '101', '110', '101', '101'],
        E: ['111', '100', '110', '100', '111'],
      }

      // Use only 3x5 glyphs
      const glyph: Record<Letter, string[]> = glyph3x5
      const letterW = 3
      const letterH = 5

      const totalWordW = letters.length * letterW + (letters.length - 1) * spacing
      const xStartGrid = centerGridX + Math.max(0, Math.floor((squareGridSize - totalWordW) / 2))
      const yCenter = safeYMin + Math.floor(squareGridSize / 2)
      const yStartGrid = Math.max(safeYMin + 1, yCenter - Math.floor(letterH / 2) - 2)

      ctx.fillStyle = '#10b981'
      for (let i = 0; i < letters.length; i++) {
        const ch = letters[i]
        if (!ch) continue
        const rows: string[] | undefined = glyph[ch]
        if (!rows) continue
        const letterX = xStartGrid + i * (letterW + spacing)
        for (let r = 0; r < rows.length; r++) {
          const row: string = rows[r] ?? ''
          for (let c = 0; c < row.length; c++) {
            if (row[c] !== '1') continue
            const gx = (letterX + c) * gridCellSize + gridOffset
            const gy = (yStartGrid + r) * gridCellSize + gridOffset
            ctx.fillRect(gx + 2, gy + 2, gridCellSize - 4, gridCellSize - 4)
          }
        }
      }

      // Draw instructions near the bottom (similar to game over screen)
      const centerXPx = borderLeft + borderWidth / 2

      ctx.fillStyle = '#ffffff'
      ctx.font = '28px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Use arrow keys to move', centerXPx, borderTop + borderHeight - 60)
      ctx.fillText('Press SPACE to start', centerXPx, borderTop + borderHeight - 30)

      // Draw quit instruction on start screen
      ctx.fillStyle = '#ffffff'
      ctx.font = '20px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('ESC to quit', centerXPx, borderTop + borderHeight - 10)
    }

    // Restore context after CRT effects
    ctx.restore()
  }, [
    snake,
    food,
    gameOver,
    isPlaying,
    score,
    getGameBoxDimensions,
    isGoldenApple,
    crtAnimation,
    showSnake,
    resolvedTheme,
    leaderboard,
    isLoadingLeaderboard,
    showNameInput,
    playerName,
    nameInputPosition,
    isSubmittingScore,
    isCrtClosing,
    isCrtOff,
  ])

  // Handle restart and resize
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (typeof e.preventDefault === 'function') e.preventDefault()
        // Start reverse CRT animation and trigger provider close
        setIsPlaying(false)
        startCrtCloseAnimation()
        return
      }
      if (e.key === ' ') {
        // Don't restart if we're in name input mode
        if (showNameInput) return

        if (gameOver || !isPlaying) {
          initGame()
        }
      }
    }

    const handleResize = () => {
      // Redraw on resize
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx) {
          canvas.width = window.innerWidth
          canvas.height = window.innerHeight
        }
      }
      // Game loop will automatically restart due to windowSize state change
    }

    window.addEventListener('keydown', handleKeyPress)
    window.addEventListener('resize', handleResize)
    const rafIdAtSubscribe = crtCloseRef.current.rafId
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
      window.removeEventListener('resize', handleResize)
      if (rafIdAtSubscribe) cancelAnimationFrame(rafIdAtSubscribe)
    }
  }, [gameOver, isPlaying, initGame, showNameInput, startCrtCloseAnimation])

  // Control grid lights visibility when game is playing
  useEffect(() => {
    if (isPlaying) {
      document.body.classList.add('snake-game-active')
      console.log('Snake game active - grid lights should be hidden')
    } else {
      document.body.classList.remove('snake-game-active')
      console.log('Snake game inactive - grid lights should be visible')
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('snake-game-active')
    }
  }, [isPlaying])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10"
        style={{ pointerEvents: isPlaying ? 'none' : 'auto' }}
      />

      {/* Floating score counter */}
      {isPlaying &&
        (() => {
          const { borderLeft, borderTop } = getGameBoxDimensions()

          return (
            <div
              className="absolute z-50 bg-black/40 text-white px-4 py-2 rounded-lg border border-green-500/30 shadow-lg"
              style={{
                top: `${borderTop + 8}px`,
                left: `${borderLeft + 8}px`,
              }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-lg font-bold text-green-400" style={{ fontFamily: 'VT323, monospace' }}>
                  SCORE: <span className="text-white">{score}</span>
                </span>
              </div>
            </div>
          )
        })()}
    </>
  )
}
