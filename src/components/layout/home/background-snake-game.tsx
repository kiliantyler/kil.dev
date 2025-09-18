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
  const [direction, setDirection] = useState<Direction>('RIGHT')
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const gameLoopRef = useRef<number | null>(null)

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

  // Generate random food position
  const generateFood = useCallback(
    (gridWidth: number, gridHeight: number): Position => {
      const { gridCellSize } = getGridDimensions()

      // Calculate safe zones (avoid header and footer)
      // Header is approximately 80px tall (py-6 md:py-8 = 48px to 64px + content)
      // Footer is approximately 60px tall (py-4 = 32px + content)
      const headerHeightGrid = Math.floor(80 / gridCellSize) + 1
      const footerHeightGrid = Math.floor(60 / gridCellSize) + 1

      // Safe Y range excludes header and footer areas
      const safeYMin = headerHeightGrid
      const safeYMax = gridHeight - footerHeightGrid - 1

      // Ensure we have valid safe range
      if (safeYMin >= safeYMax) {
        // Fallback to full grid if calculation fails
        const newFood = {
          x: Math.floor(Math.random() * gridWidth),
          y: Math.floor(Math.random() * gridHeight),
        }

        const isOnSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)
        if (isOnSnake) {
          return generateFood(gridWidth, gridHeight)
        }
        return newFood
      }

      const newFood = {
        x: Math.floor(Math.random() * gridWidth),
        y: safeYMin + Math.floor(Math.random() * (safeYMax - safeYMin + 1)),
      }

      // Make sure food doesn't spawn on snake
      const isOnSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)
      if (isOnSnake) {
        return generateFood(gridWidth, gridHeight)
      }

      return newFood
    },
    [snake, getGridDimensions],
  )

  // Initialize game
  const initGame = useCallback(() => {
    const { gridWidth, gridHeight, gridCellSize } = getGridDimensions()

    // Calculate safe zones for starting position
    const headerHeightGrid = Math.floor(80 / gridCellSize) + 1
    const footerHeightGrid = Math.floor(60 / gridCellSize) + 1
    const safeYMin = headerHeightGrid
    const safeYMax = gridHeight - footerHeightGrid - 1

    // Start snake in safe area
    const startY = Math.max(safeYMin + 2, Math.min(5, safeYMax - 2))
    setSnake([{ x: 5, y: startY }])
    setFood(generateFood(gridWidth, gridHeight))
    setDirection('RIGHT')
    setGameOver(false)
    setScore(0)
    setIsPlaying(true)
  }, [generateFood, getGridDimensions])

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
      const { gridWidth, gridHeight, gridCellSize } = getGridDimensions()

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
        const { gridWidth: currentGridWidth, gridHeight: currentGridHeight } = getGridDimensions()

        // Calculate safe zones for wraparound boundaries
        const headerHeightGrid = Math.floor(80 / gridCellSize) + 1
        const footerHeightGrid = Math.floor(60 / gridCellSize)
        const safeYMin = headerHeightGrid
        const safeYMax = currentGridHeight - footerHeightGrid - 1

        // Check boundaries - left/right walls kill the snake
        if (head.x < 0 || head.x >= currentGridWidth || head.y < safeYMin || head.y > safeYMax) {
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

        // Check food collision
        if (head.x === food.x && head.y === food.y) {
          setScore(prev => prev + 10)
          setFood(generateFood(gridWidth, gridHeight))
        } else {
          newSnake.pop() // Remove tail if no food eaten
        }

        return newSnake
      })
    }

    gameLoopRef.current = window.setInterval(moveSnake, GAME_SPEED)
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [direction, food, gameOver, isPlaying, generateFood, getGridDimensions])

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { gridCellSize, gridOffset, gridWidth, gridHeight } = getGridDimensions()

    // Calculate safe play area dimensions
    const headerHeight = Math.floor(80 / gridCellSize) * gridCellSize
    const footerHeight = Math.floor(60 / gridCellSize) * gridCellSize

    // Set canvas size to window size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw play area border
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)'
    ctx.lineWidth = 2
    ctx.strokeRect(0, headerHeight, gridWidth * gridCellSize, gridHeight * gridCellSize - headerHeight - footerHeight)

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
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(foodX + 2, foodY + 2, gridCellSize - 4, gridCellSize - 4)

    // Draw game over overlay
    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(0, headerHeight, gridWidth * gridCellSize, gridHeight * gridCellSize - headerHeight - footerHeight)

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
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, headerHeight, gridWidth * gridCellSize, gridHeight * gridCellSize - headerHeight - footerHeight)

      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 64px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('SNAKE', canvas.width / 2, canvas.height / 2 - 60)

      ctx.fillStyle = '#ffffff'
      ctx.font = '24px monospace'
      ctx.fillText('Use arrow keys to move', canvas.width / 2, canvas.height / 2)
      ctx.fillText('Press SPACE to start', canvas.width / 2, canvas.height / 2 + 40)
    }
  }, [snake, food, gameOver, isPlaying, score, getGridDimensions])

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
          className="absolute left-4 z-50 bg-black/40 text-white px-4 py-2 rounded-lg border border-green-500/30 shadow-lg mt-4"
          style={{ top: `${getHeaderHeight()}px` }}>
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
