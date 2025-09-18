'use client'

import { LIGHT_GRID } from '@/lib/light-grid'
import { useCallback, useEffect, useRef, useState } from 'react'

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Position = { x: number; y: number }

const GAME_SPEED = 150

export function BackgroundSnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [snake, setSnake] = useState<Position[]>([{ x: 5, y: 5 }])
  const [food, setFood] = useState<Position>({ x: 10, y: 10 })
  const [isGoldenApple, setIsGoldenApple] = useState(false)
  const [direction, setDirection] = useState<Direction>('RIGHT')
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const gameLoopRef = useRef<number | null>(null)

  // Use refs to track current food state to avoid stale closures
  const foodRef = useRef<Position>({ x: 10, y: 10 })
  const isGoldenAppleRef = useRef<boolean>(false)
  const lastFoodEatenRef = useRef<Position | null>(null)

  // Calculate grid dimensions based on window size
  const getGridDimensions = useCallback(() => {
    const gridCellSize = LIGHT_GRID.GRID_SIZE_PX
    const gridOffset = LIGHT_GRID.GRID_OFFSET_PX

    return {
      gridWidth: Math.floor(window.innerWidth / gridCellSize) - 1,
      gridHeight: Math.floor(window.innerHeight / gridCellSize),
      gridCellSize,
      gridOffset,
    }
  }, [])

  const getHeaderHeight = useCallback(() => {
    const { gridCellSize } = getGridDimensions()
    return Math.floor(80 / gridCellSize) * gridCellSize + 20
  }, [getGridDimensions])

  // Calculate safe play area boundaries that match the visual border
  const getSafeBoundaries = useCallback(() => {
    const { gridCellSize, gridOffset } = getGridDimensions()
    const headerHeight = getHeaderHeight()
    const borderOffset = 40
    const actualHeaderHeight = headerHeight + borderOffset
    const footerHeight = Math.floor(60 / gridCellSize) * gridCellSize

    // Convert pixel positions to grid coordinates, then add inset
    const baseYMin = Math.floor((actualHeaderHeight - gridOffset) / gridCellSize)
    const baseYMax = Math.floor((window.innerHeight - footerHeight - gridOffset) / gridCellSize) - 1

    // Apply 1-grid-cell inset on top, left, and bottom
    const safeYMin = baseYMin + 1 // Top inset
    const safeYMax = baseYMax - 1 // Bottom inset
    const safeXMin = 1 // Left inset
    const safeXMax = Math.floor(window.innerWidth / gridCellSize) - 2 // Right stays the same

    return {
      safeYMin,
      safeYMax,
      safeXMin,
      safeXMax,
      actualHeaderHeight,
      footerHeight,
      borderOffset,
    }
  }, [getGridDimensions, getHeaderHeight])

  // Generate random food position
  const generateFood = useCallback(
    (gridWidth: number, gridHeight: number): { position: Position; isGolden: boolean } => {
      const { safeYMin, safeYMax, safeXMin, safeXMax } = getSafeBoundaries()

      // 15% chance for golden apple
      const isGolden = Math.random() < 0.15

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
    lastFoodEatenRef.current = null
  }, [generateFood, getGridDimensions, getSafeBoundaries])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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
  }, [direction, isPlaying])

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return

    const moveSnake = () => {
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
          return prevSnake
        }

        // Check self collision
        if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameOver(true)
          setIsPlaying(false)
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
          setScore(prev => prev + points)

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
    }

    // Clear any existing interval
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
    }

    gameLoopRef.current = window.setInterval(moveSnake, GAME_SPEED)
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [direction, gameOver, isPlaying, generateFood, getGridDimensions, getSafeBoundaries, food, isGoldenApple])

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { gridCellSize, gridOffset, gridWidth } = getGridDimensions()

    // Set canvas size to window size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw play area border with enhanced styling
    const playAreaWidth = gridWidth * gridCellSize
    const cornerRadius = 12
    const { safeYMin, safeYMax } = getSafeBoundaries()

    // Align border to grid like snake and food, with top/bottom moved out by 1 grid
    const borderTop = safeYMin * gridCellSize + gridOffset
    const borderBottom = (safeYMax + 1) * gridCellSize + gridOffset
    const borderHeight = borderBottom - borderTop
    const borderLeft = 1 * gridCellSize + gridOffset
    const borderWidth = playAreaWidth - gridCellSize

    // Create gradient for border
    const gradient = ctx.createLinearGradient(borderLeft, borderTop, borderLeft + borderWidth, borderBottom)
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

    // Draw snake aligned with background grid
    snake.forEach((segment, index) => {
      const x = segment.x * gridCellSize + gridOffset
      const y = segment.y * gridCellSize + gridOffset

      ctx.fillStyle = index === 0 ? '#10b981' : '#34d399' // Head is brighter
      ctx.fillRect(x + 2, y + 2, gridCellSize - 4, gridCellSize - 4)
    })

    // Draw food aligned with background grid
    const foodX = food.x * gridCellSize + gridOffset
    const foodY = food.y * gridCellSize + gridOffset
    ctx.fillStyle = isGoldenApple ? '#fbbf24' : '#ef4444'
    ctx.fillRect(foodX + 2, foodY + 2, gridCellSize - 4, gridCellSize - 4)

    // Draw game over overlay
    if (gameOver) {
      // Draw rounded overlay background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.beginPath()
      ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 48px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40)

      ctx.font = '24px monospace'
      ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20)
      ctx.font = '18px monospace'
      ctx.fillText('Press SPACE to restart', canvas.width / 2, canvas.height / 2 + 60)
    }

    // Draw start screen
    if (!isPlaying && !gameOver) {
      // Draw rounded overlay background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.beginPath()
      ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      ctx.fill()

      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 64px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('SNAKE', canvas.width / 2, canvas.height / 2 - 60)

      ctx.fillStyle = '#ffffff'
      ctx.font = '24px monospace'
      ctx.fillText('Use arrow keys to move', canvas.width / 2, canvas.height / 2)
      ctx.fillText('Press SPACE to start', canvas.width / 2, canvas.height / 2 + 40)
    }
  }, [snake, food, gameOver, isPlaying, score, getGridDimensions, isGoldenApple, getSafeBoundaries])

  // Handle restart and resize
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ') {
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
    }

    window.addEventListener('keydown', handleKeyPress)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
      window.removeEventListener('resize', handleResize)
    }
  }, [gameOver, isPlaying, initGame])

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
      {isPlaying && (
        <div
          className="absolute z-50 bg-black/40 text-white px-4 py-2 rounded-lg border border-green-500/30 shadow-lg"
          style={{
            top: `${getSafeBoundaries().safeYMin * getGridDimensions().gridCellSize + getGridDimensions().gridOffset + 8}px`,
            left: `${getSafeBoundaries().safeXMin * getGridDimensions().gridCellSize + getGridDimensions().gridOffset + 8}px`,
          }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-mono text-lg font-bold text-green-400">
              SCORE: <span className="text-white">{score}</span>
            </span>
          </div>
        </div>
      )}
    </>
  )
}
