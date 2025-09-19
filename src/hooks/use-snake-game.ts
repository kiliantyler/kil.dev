import { playGameOverSound, playScoreSound } from '@/utils/arcade-utils'
import { getGameBoxDimensions, getGridDimensions, getSafeBoundaries, type GameBoxDimensions } from '@/utils/grid'
import { useCallback, useEffect, useRef, useState } from 'react'

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
export type Position = { x: number; y: number }

const BASE_GAME_SPEED = 150
const MIN_GAME_SPEED = 80
const SPEED_REDUCTION_PER_SEGMENT = 2
const GOLDEN_APPLE_CHANCE = 0.02
const MAX_FOOD_GENERATION_ATTEMPTS = 100

type UseSnakeGameOptions = {
  isInputActive?: boolean
  onGameOver?: (score: number) => void
  onGameStart?: () => void | Promise<void>
  onMove?: (
    direction: Direction,
    gameState: { snake: Position[]; food: Position; isGoldenApple: boolean; score: number; direction: Direction },
  ) => void | Promise<void>
  onFoodEaten?: (position: Position, isGolden: boolean, newScore: number) => void | Promise<void>
}

export function useSnakeGame(options: UseSnakeGameOptions = {}) {
  const { isInputActive = false, onGameOver, onGameStart, onMove, onFoodEaten } = options

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [snake, setSnake] = useState<Position[]>([{ x: 5, y: 5 }])
  const [food, setFood] = useState<Position>({ x: 10, y: 10 })
  const [isGoldenApple, setIsGoldenApple] = useState(false)
  const [direction, setDirection] = useState<Direction>('RIGHT')
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const gameLoopRef = useRef<number | null>(null)
  const lastFoodEatenRef = useRef<Position | null>(null)

  // expose derived dimensions
  const getDimensions = useCallback((): GameBoxDimensions => {
    return getGameBoxDimensions(windowSize.width, windowSize.height)
  }, [windowSize])

  const getCurrentGameSpeed = useCallback((snakeLength: number) => {
    const speedReduction = (snakeLength - 1) * SPEED_REDUCTION_PER_SEGMENT
    const newSpeed = BASE_GAME_SPEED - speedReduction
    return Math.max(newSpeed, MIN_GAME_SPEED)
  }, [])

  // Track window size
  useEffect(() => {
    const updateWindowSize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    updateWindowSize()
    window.addEventListener('resize', updateWindowSize)
    return () => window.removeEventListener('resize', updateWindowSize)
  }, [])

  // Generate random food position within safe bounds
  const generateFood = useCallback((): { position: Position; isGolden: boolean } => {
    const { gridWidth, gridHeight } = getGridDimensions(windowSize.width, windowSize.height)
    const { safeYMin, safeYMax, safeXMin, safeXMax } = getSafeBoundaries(windowSize.width, windowSize.height)

    const isGolden = Math.random() < GOLDEN_APPLE_CHANCE

    if (safeYMin >= safeYMax || safeXMin >= safeXMax) {
      const fallback = {
        x: Math.floor(Math.random() * gridWidth),
        y: Math.floor(Math.random() * gridHeight),
      }
      const isOnSnake = snake.some(s => s.x === fallback.x && s.y === fallback.y)
      if (isOnSnake) return generateFood()
      return { position: fallback, isGolden }
    }

    const position = {
      x: safeXMin + Math.floor(Math.random() * (safeXMax - safeXMin + 1)),
      y: safeYMin + Math.floor(Math.random() * (safeYMax - safeYMin + 1)),
    }
    const isOnSnake = snake.some(s => s.x === position.x && s.y === position.y)
    if (isOnSnake) return generateFood()
    return { position, isGolden }
  }, [snake, windowSize])

  const initGame = useCallback(() => {
    const { safeYMin, safeYMax, safeXMin, safeXMax } = getSafeBoundaries(windowSize.width, windowSize.height)
    const startX = Math.max(safeXMin + 2, Math.min(5, safeXMax - 2))
    const startY = Math.max(safeYMin + 2, Math.min(5, safeYMax - 2))
    setSnake([{ x: startX, y: startY }])

    const foodData = generateFood()
    setFood(foodData.position)
    setIsGoldenApple(foodData.isGolden)

    setDirection('RIGHT')
    setGameOver(false)
    setScore(0)
    setIsPlaying(true)
    if (onGameStart) {
      Promise.resolve(onGameStart()).catch(console.error)
    }
    lastFoodEatenRef.current = null
  }, [generateFood, windowSize, onGameStart])

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      if (!prevSnake[0]) return prevSnake

      const head: Position = { x: prevSnake[0].x, y: prevSnake[0].y }

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

      const { safeYMin, safeYMax, safeXMin, safeXMax } = getSafeBoundaries(windowSize.width, windowSize.height)

      // walls
      if (head.x < safeXMin || head.x > safeXMax || head.y < safeYMin || head.y > safeYMax) {
        setGameOver(true)
        setIsPlaying(false)
        playGameOverSound()
        if (onGameOver) onGameOver(score)
        return prevSnake
      }

      // self collision
      if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true)
        setIsPlaying(false)
        playGameOverSound()
        if (onGameOver) onGameOver(score)
        return prevSnake
      }

      const newSnake = [head, ...prevSnake]

      if (head.x === food.x && head.y === food.y) {
        const currentFood = { x: food.x, y: food.y }
        if (
          lastFoodEatenRef.current &&
          lastFoodEatenRef.current.x === currentFood.x &&
          lastFoodEatenRef.current.y === currentFood.y
        ) {
          return newSnake
        }

        lastFoodEatenRef.current = currentFood
        const points = isGoldenApple ? 50 : 10
        const newScore = score + points
        playScoreSound(newScore)
        setScore(newScore)
        if (onFoodEaten) {
          Promise.resolve(onFoodEaten(currentFood, isGoldenApple, newScore)).catch(console.error)
        }

        const foodData = generateFood()
        setFood(foodData.position)
        setIsGoldenApple(foodData.isGolden)
        return newSnake
      }

      lastFoodEatenRef.current = null
      newSnake.pop()

      if (onMove) {
        Promise.resolve(
          onMove(direction, {
            snake: newSnake,
            food,
            isGoldenApple,
            score,
            direction,
          }),
        ).catch(console.error)
      }
      return newSnake
    })
  }, [direction, windowSize, isGoldenApple, food, onGameOver, score, generateFood, onMove, onFoodEaten])

  // game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return
    if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    const currentSpeed = getCurrentGameSpeed(snake.length)
    gameLoopRef.current = window.setInterval(moveSnake, currentSpeed)
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    }
  }, [isPlaying, gameOver, snake.length, getCurrentGameSpeed, moveSnake])

  // movement keys
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying || isInputActive) return
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
  }, [direction, isPlaying, isInputActive])

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    }
  }, [])

  return {
    // state
    snake,
    food,
    isGoldenApple,
    direction,
    gameOver,
    score,
    isPlaying,
    // actions
    initGame,
    moveSnake,
    setIsPlaying,
    setGameOver,
    // derived
    windowSize,
    getDimensions,
  }
}
