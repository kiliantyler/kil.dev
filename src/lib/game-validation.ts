import { randomBytes } from 'crypto'

// Game session data stored in memory (in production, use Redis)
const gameSessions = new Map<string, GameSession>()

interface GameSession {
  id: string
  startTime: number
  maxScore: number
  moves: GameMove[]
  foodEaten: FoodEaten[]
  isActive: boolean
  secret: string
}

interface GameMove {
  timestamp: number
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
  snakePosition: { x: number; y: number }[]
  score: number
}

interface FoodEaten {
  timestamp: number
  position: { x: number; y: number }
  isGolden: boolean
  points: number
}

interface GameState {
  snake: { x: number; y: number }[]
  food: { x: number; y: number }
  isGoldenApple: boolean
  score: number
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
}

// Constants from the game
const BASE_GAME_SPEED = 150
const MIN_GAME_SPEED = 80
const SPEED_REDUCTION_PER_SEGMENT = 2
const GOLDEN_APPLE_CHANCE = 0.02
const GOLDEN_APPLE_POINTS = 50
const REGULAR_APPLE_POINTS = 10

export function createGameSession(): { sessionId: string; secret: string } {
  const sessionId = randomBytes(16).toString('hex')
  const secret = randomBytes(32).toString('hex')

  const session: GameSession = {
    id: sessionId,
    startTime: Date.now(),
    maxScore: 0,
    moves: [],
    foodEaten: [],
    isActive: true,
    secret,
  }

  gameSessions.set(sessionId, session)

  // Clean up old sessions (older than 1 hour)
  setTimeout(
    () => {
      gameSessions.delete(sessionId)
    },
    60 * 60 * 1000,
  )

  return { sessionId, secret }
}

export function recordGameMove(
  sessionId: string,
  secret: string,
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT',
  gameState: GameState,
): { success: boolean; message?: string } {
  const session = gameSessions.get(sessionId)

  if (!session) {
    return { success: false, message: 'Invalid game session' }
  }

  if (!session.isActive) {
    return { success: false, message: 'Game session is not active' }
  }

  if (session.secret !== secret) {
    return { success: false, message: 'Invalid session secret' }
  }

  // Validate the move is reasonable (basic validation)
  const now = Date.now()
  const lastMove = session.moves[session.moves.length - 1]

  if (lastMove && now - lastMove.timestamp < 50) {
    return { success: false, message: 'Move too fast' }
  }

  // Record the move
  const move: GameMove = {
    timestamp: now,
    direction,
    snakePosition: [...gameState.snake],
    score: gameState.score,
  }

  session.moves.push(move)
  session.maxScore = Math.max(session.maxScore, gameState.score)

  return { success: true }
}

export function recordFoodEaten(
  sessionId: string,
  secret: string,
  position: { x: number; y: number },
  isGolden: boolean,
  score: number,
): { success: boolean; message?: string } {
  const session = gameSessions.get(sessionId)

  if (!session) {
    return { success: false, message: 'Invalid game session' }
  }

  if (!session.isActive) {
    return { success: false, message: 'Game session is not active' }
  }

  if (session.secret !== secret) {
    return { success: false, message: 'Invalid session secret' }
  }

  const points = isGolden ? GOLDEN_APPLE_POINTS : REGULAR_APPLE_POINTS

  // Validate score increment
  const lastMove = session.moves[session.moves.length - 1]
  if (lastMove && score !== lastMove.score + points) {
    return { success: false, message: 'Invalid score increment' }
  }

  const foodEaten: FoodEaten = {
    timestamp: Date.now(),
    position,
    isGolden,
    points,
  }

  session.foodEaten.push(foodEaten)
  session.maxScore = Math.max(session.maxScore, score)

  return { success: true }
}

export function endGameSession(
  sessionId: string,
  secret: string,
  finalScore: number,
): { success: boolean; validatedScore?: number; message?: string } {
  const session = gameSessions.get(sessionId)

  if (!session) {
    return { success: false, message: 'Invalid game session' }
  }

  if (session.secret !== secret) {
    return { success: false, message: 'Invalid session secret' }
  }

  // Validate the final score matches our recorded max score
  if (finalScore !== session.maxScore) {
    return { success: false, message: 'Final score does not match recorded score' }
  }

  // Basic validation: ensure the game lasted at least 5 seconds
  const gameDuration = Date.now() - session.startTime
  if (gameDuration < 5000) {
    return { success: false, message: 'Game too short to be valid' }
  }

  // Basic validation: ensure there were some moves
  if (session.moves.length < 10) {
    return { success: false, message: 'Too few moves recorded' }
  }

  // Mark session as inactive
  session.isActive = false

  return { success: true, validatedScore: finalScore }
}

export function validateScoreSubmission(
  sessionId: string,
  secret: string,
  submittedScore: number,
): { success: boolean; validatedScore?: number; message?: string } {
  const session = gameSessions.get(sessionId)

  if (!session) {
    return { success: false, message: 'Invalid game session' }
  }

  if (session.secret !== secret) {
    return { success: false, message: 'Invalid session secret' }
  }

  // The session must be ended before we can validate the score
  if (session.isActive) {
    return { success: false, message: 'Game session is still active' }
  }

  // Validate the submitted score matches our recorded score
  if (submittedScore !== session.maxScore) {
    return { success: false, message: 'Submitted score does not match recorded score' }
  }

  return { success: true, validatedScore: submittedScore }
}

// Clean up old sessions periodically
setInterval(
  () => {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    for (const [sessionId, session] of gameSessions.entries()) {
      if (session.startTime < oneHourAgo) {
        gameSessions.delete(sessionId)
      }
    }
  },
  10 * 60 * 1000,
) // Clean up every 10 minutes
