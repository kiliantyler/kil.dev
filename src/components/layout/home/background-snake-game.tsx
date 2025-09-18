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
  const { showSnake } = useKonamiAnimation()
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

  // Start CRT turn-on animation
  const startCrtAnimation = useCallback(() => {
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

    // Animation timeline - synchronized with Konami animation (starts 0.6s after Konami)
    const duration = 800 // 0.8 seconds total to complete with Konami
    const pointDuration = 80 // Point appears for 0.08 seconds
    const horizontalDuration = 500 // Horizontal line grows for 0.5 seconds (much slower)
    const verticalDuration = 200 // Vertical expansion for 0.2 seconds (faster to compensate)
    const glowDuration = 600 // Glow effect for 0.6 seconds

    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Phase 1: Single point in center (0-0.2s)
      const pointProgress = Math.min(elapsed / pointDuration, 1)
      const pointSize = pointProgress * 8 // Larger, more visible point

      // Phase 2: Horizontal line grows (0.2-0.6s)
      const horizontalStart = pointDuration
      const horizontalProgress = Math.max(0, Math.min((elapsed - horizontalStart) / horizontalDuration, 1))
      // Ease-out for smoother horizontal expansion
      const horizontalEased = 1 - Math.pow(1 - horizontalProgress, 3)
      const horizontalWidth = horizontalEased * borderWidth

      // Phase 3: Vertical expansion (0.6-1.6s)
      const verticalStart = pointDuration + horizontalDuration
      const verticalProgress = Math.max(0, Math.min((elapsed - verticalStart) / verticalDuration, 1))
      // Ease-out for smoother vertical expansion
      const verticalEased = 1 - Math.pow(1 - verticalProgress, 2)
      const verticalHeight = verticalEased * borderHeight

      // Opacity animation (starts at 0.1s, reaches 1 at 1.2s)
      const opacityStart = 100
      const opacityProgress = Math.max(0, Math.min((elapsed - opacityStart) / 1100, 1))
      // Ease-out for smoother opacity transition
      const opacityEased = 1 - Math.pow(1 - opacityProgress, 2)
      const opacity = Math.min(opacityEased, 1)

      // Glow intensity animation - more consistent throughout
      const glowProgress = Math.min(elapsed / glowDuration, 1)
      // Start with strong glow, maintain it, then fade out smoothly
      const glowIntensity = glowProgress < 0.8 ? 0.8 : 0.8 * (1 - (glowProgress - 0.8) / 0.2)

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
    }, 1400) // 1.4 seconds fallback (0.6s delay + 0.8s animation)

    return () => clearTimeout(fallbackTimeout)
  }, [getGameBoxDimensions])

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
    const { gridCellSize, gridOffset, borderLeft, borderTop, borderWidth, borderHeight, centerGridX, safeXMin } =
      gameBox

    // Set canvas size to window size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply CRT animation effects
    ctx.save()

    // Apply opacity for fade-in effect (ensure minimum visibility)
    ctx.globalAlpha = Math.max(crtAnimation.opacity, 0.1)

    // Create CRT mask during animation (expanded to account for glow)
    if (crtAnimation.isAnimating) {
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

    // Draw rounded rectangle border
    ctx.beginPath()
    ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
    ctx.stroke()

    // Add inner glow effect
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(borderLeft + 2, borderTop + 2, borderWidth - 4, borderHeight - 4, cornerRadius - 2)
    ctx.stroke()

    // Add subtle background fill
    ctx.fillStyle = 'rgba(16, 185, 129, 0.05)'
    ctx.beginPath()
    ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
    ctx.fill()

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
      ctx.font = 'bold 36px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('GAME OVER', borderLeft + borderWidth / 2, borderTop + 60)

      // Draw score
      ctx.font = '20px monospace'
      ctx.fillText(`Score: ${score}`, borderLeft + borderWidth / 2, borderTop + 100)

      // Always draw leaderboard first
      if (isLoadingLeaderboard) {
        ctx.fillStyle = '#10b981'
        ctx.font = '16px monospace'
        ctx.fillText('Loading leaderboard...', borderLeft + borderWidth / 2, borderTop + 140)
      } else if (leaderboard.length > 0) {
        // Draw leaderboard title
        ctx.fillStyle = '#10b981'
        ctx.font = 'bold 18px monospace'
        ctx.fillText('LEADERBOARD', borderLeft + borderWidth / 2, borderTop + 140)

        // Draw leaderboard entries
        const startY = borderTop + 170
        const lineHeight = 25
        const maxEntries = Math.min(leaderboard.length, 10) // Show max 10 entries

        for (let i = 0; i < maxEntries; i++) {
          const entry = leaderboard[i]
          if (!entry) continue

          const y = startY + i * lineHeight

          // Highlight current score if it matches
          if (entry.score === score) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
            ctx.fillRect(borderLeft + 20, y - 15, borderWidth - 40, lineHeight)
          }

          // Rank
          ctx.fillStyle = '#10b981'
          ctx.font = '14px monospace'
          ctx.textAlign = 'left'
          ctx.fillText(`#${i + 1}`, borderLeft + 30, y)

          // Name
          ctx.fillStyle = entry.score === score ? '#ffffff' : '#10b981'
          ctx.font = 'bold 14px monospace'
          ctx.fillText(entry.name, borderLeft + 80, y)

          // Score
          ctx.fillStyle = entry.score === score ? '#ffffff' : '#10b981'
          ctx.font = '14px monospace'
          ctx.textAlign = 'right'
          ctx.fillText(entry.score.toString().padStart(4, '0'), borderLeft + borderWidth - 30, y)
        }
      }

      // Draw name input below leaderboard if active
      if (showNameInput) {
        // Calculate position below leaderboard
        const leaderboardHeight = leaderboard.length > 0 ? Math.min(leaderboard.length, 8) * 25 + 50 : 0
        const nameInputY = borderTop + 170 + leaderboardHeight + 20

        // Draw name input title
        ctx.fillStyle = '#10b981'
        ctx.font = 'bold 18px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('NEW HIGH SCORE!', borderLeft + borderWidth / 2, nameInputY)

        ctx.font = '16px monospace'
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
          ctx.font = 'bold 20px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(playerName[i] ?? 'A', x + boxWidth / 2, nameY)
        }

        // Draw instructions
        ctx.fillStyle = '#10b981'
        ctx.font = '14px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('↑↓ Change letter  ←→ Move  SPACE Next/Submit', borderLeft + borderWidth / 2, nameInputY + 110)

        if (isSubmittingScore) {
          ctx.fillStyle = '#ffffff'
          ctx.font = '16px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('Submitting...', borderLeft + borderWidth / 2, nameInputY + 140)
        }
      }

      // Draw restart instruction
      ctx.fillStyle = '#ffffff'
      ctx.font = '16px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Press SPACE to restart', borderLeft + borderWidth / 2, borderTop + borderHeight - 30)
    }

    // Draw start screen (only when snake game is ready)
    if (showSnake && !isPlaying && !gameOver) {
      // Draw rounded overlay background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.beginPath()
      ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      ctx.fill()

      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 64px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('SNAKE', borderLeft + borderWidth / 2, borderTop + borderHeight / 2 - 60)

      ctx.fillStyle = '#ffffff'
      ctx.font = '24px monospace'
      ctx.fillText('Use arrow keys to move', borderLeft + borderWidth / 2, borderTop + borderHeight / 2)
      ctx.fillText('Press SPACE to start', borderLeft + borderWidth / 2, borderTop + borderHeight / 2 + 40)
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
  ])

  // Handle restart and resize
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
      window.removeEventListener('resize', handleResize)
    }
  }, [gameOver, isPlaying, initGame, showNameInput])

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
                <span className="font-mono text-lg font-bold text-green-400">
                  SCORE: <span className="text-white">{score}</span>
                </span>
              </div>
            </div>
          )
        })()}
    </>
  )
}
