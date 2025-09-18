'use client'

import { useKonamiAnimation } from '@/components/providers/konami-animation-provider'
import { useTheme } from '@/components/providers/theme-provider'
import { LIGHT_GRID } from '@/lib/light-grid'
import type { LeaderboardEntry } from '@/types/leaderboard'
import { playGameOverSound, playScoreSound } from '@/utils/arcade-utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Position = { x: number; y: number }

const BASE_GAME_SPEED = 150
const MIN_GAME_SPEED = 80
const SPEED_REDUCTION_PER_SEGMENT = 2
const GOLDEN_APPLE_CHANCE = 0.02

const checkScoreResponseSchema = z.object({
  qualifies: z.boolean(),
  currentThreshold: z.number().optional(),
})

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
      ctx.fillText(`Score: ${score}`, borderLeft + borderWidth / 2, borderTop + 100)

      if (isLoadingLeaderboard) {
        ctx.fillStyle = '#10b981'
        ctx.font = '36px VT323, monospace'
        ctx.fillText('Loading leaderboard...', borderLeft + borderWidth / 2, borderTop + 140)
      } else if (leaderboard.length > 0) {
        ctx.fillStyle = '#10b981'
        ctx.font = 'bold 40px VT323, monospace'
        ctx.fillText('LEADERBOARD', borderLeft + borderWidth / 2, borderTop + 140)

        const startY = borderTop + 170
        const lineHeight = 20
        const maxEntries = Math.min(leaderboard.length, 10)
        const leaderboardWidth = 200
        const leaderboardLeft = borderLeft + (borderWidth - leaderboardWidth) / 2

        for (let i = 0; i < maxEntries; i++) {
          const entry = leaderboard[i]
          if (!entry) continue
          const y = startY + i * lineHeight
          if (entry.score === score) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
            ctx.fillRect(leaderboardLeft, y - 12, leaderboardWidth, lineHeight)
          }
          ctx.fillStyle = '#10b981'
          ctx.font = '20px VT323, monospace'
          ctx.textAlign = 'left'
          ctx.fillText(`#${i + 1}`, leaderboardLeft + 10, y)

          ctx.fillStyle = entry.score === score ? '#ffffff' : '#10b981'
          ctx.font = 'bold 20px VT323, monospace'
          ctx.fillText(entry.name, leaderboardLeft + 40, y)

          ctx.fillStyle = entry.score === score ? '#ffffff' : '#10b981'
          ctx.font = '20px VT323, monospace'
          ctx.textAlign = 'right'
          ctx.fillText(entry.score.toString().padStart(4, '0'), leaderboardLeft + leaderboardWidth - 10, y)
        }
      }

      if (showNameInput) {
        const leaderboardHeight = leaderboard.length > 0 ? Math.min(leaderboard.length, 8) * 25 + 50 : 0
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
          ctx.strokeStyle = nameInputPosition === i ? '#ffffff' : '#10b981'
          ctx.lineWidth = nameInputPosition === i ? 3 : 2
          ctx.strokeRect(x, nameY - 20, boxWidth, 30)
          ctx.fillStyle = '#10b981'
          ctx.font = 'bold 32px VT323, monospace'
          ctx.textAlign = 'center'
          ctx.fillText(playerName[i] ?? 'A', x + boxWidth / 2, nameY)
        }

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

      ctx.fillStyle = '#ffffff'
      ctx.font = '24px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Press SPACE to restart', borderLeft + borderWidth / 2, borderTop + borderHeight - 30)

      ctx.fillStyle = '#ffffff'
      ctx.font = '18px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('ESC to quit', borderLeft + borderWidth / 2, borderTop + borderHeight - 10)
    },
    [isLoadingLeaderboard, leaderboard, nameInputPosition, playerName, score, showNameInput, isSubmittingScore],
  )

  const drawStartScreen = useCallback(
    (ctx: CanvasRenderingContext2D, dimensions: ReturnType<typeof getDimensions>) => {
      if (isPlaying || gameOver) return
      const {
        gridCellSize,
        gridOffset,
        borderLeft,
        borderTop,
        borderWidth,
        borderHeight,
        centerGridX,
        squareGridSize,
        safeYMin,
      } = dimensions
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
    [isPlaying, gameOver],
  )

  // Keyboard orchestration for overlay/name input
  const onNameInputKey = useCallback(
    (e: KeyboardEvent) => {
      if (!showNameInput) return
      if (e.key === ' ') {
        e.preventDefault()
        if (nameInputPosition < 2) {
          setNameInputPosition(prev => Math.min(2, prev + 1))
        } else {
          void submitScore(score)
        }
        return
      }
      handleNameInputKey(e)
    },
    [showNameInput, nameInputPosition, setNameInputPosition, submitScore, score, handleNameInputKey],
  )

  // Body class for grid lights
  useEffect(() => {
    if (isPlaying) document.body.classList.add('snake-game-active')
    else document.body.classList.remove('snake-game-active')
    return () => document.body.classList.remove('snake-game-active')
  }, [isPlaying])

  return (
    <>
      <SnakeCanvas
        snake={snake}
        food={food}
        isGoldenApple={isGoldenApple}
        crtAnimation={crtAnimation}
        gameBox={gameBox}
        showSnake={showSnake && !isCrtOff}
        theme={resolvedTheme}
        isPlaying={isPlaying}
        gameOver={gameOver}
        drawGameOverOverlay={drawGameOverOverlay}
        drawStartScreen={drawStartScreen}
      />

      <GameOverlay
        isPlaying={isPlaying}
        gameOver={gameOver}
        score={score}
        showNameInput={showNameInput}
        playerName={playerName}
        nameInputPosition={nameInputPosition}
        isSubmittingScore={isSubmittingScore}
        dimensions={gameBox}
        onRestart={() => initGame()}
        onEsc={() => {
          setIsPlaying(false)
          startCrtCloseAnimation()
        }}
        onNameInputKey={onNameInputKey}
      />

      {isPlaying &&
        (() => {
          const { borderLeft, borderTop } = gameBox
          return (
            <div
              className="absolute z-50 bg-black/40 text-white px-4 py-2 rounded-lg border border-green-500/30 shadow-lg"
              style={{ top: `${borderTop + 8}px`, left: `${borderLeft + 8}px` }}>
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
