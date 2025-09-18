import { createHash, randomBytes } from 'crypto'

// Game session data stored in memory (in production, use Redis)
const gameSessions = new Map<string, GameSession>()

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

interface GameSession {
  id: string
  startTime: number
  isActive: boolean
  secret: string
  seed: number
  validatedScore?: number
}

interface MoveEvent {
  t: number // ms since start
  k: Direction
}

interface FoodEvent {
  t: number // ms since start
  g: boolean // isGolden
}

function computeSignatureHex(secret: string, payloadString: string): string {
  return createHash('sha256').update(`${secret}.${payloadString}`).digest('hex')
}

export function createGameSession(): { sessionId: string; secret: string; seed: number } {
  const sessionId = randomBytes(16).toString('hex')
  const secret = randomBytes(32).toString('hex')
  const seed = randomBytes(4).readUInt32BE(0)

  const session: GameSession = {
    id: sessionId,
    startTime: Date.now(),
    isActive: true,
    secret,
    seed,
  }

  gameSessions.set(sessionId, session)

  // Clean up old sessions (older than 1 hour)
  setTimeout(
    () => {
      gameSessions.delete(sessionId)
    },
    60 * 60 * 1000,
  )

  return { sessionId, secret, seed }
}

export function endGameSession(
  sessionId: string,
  signature: string,
  finalScore: number,
  events: MoveEvent[],
  foods: FoodEvent[],
  durationMs: number,
): { success: boolean; validatedScore?: number; message?: string } {
  const session = gameSessions.get(sessionId)

  if (!session) {
    return { success: false, message: 'Invalid game session' }
  }

  if (!session.isActive) {
    return { success: false, message: 'Game session is not active' }
  }

  // Verify signature
  const payloadString = JSON.stringify({ sessionId, finalScore, events, foods, durationMs })
  const expectedSig = computeSignatureHex(session.secret, payloadString)
  if (expectedSig !== signature) {
    return { success: false, message: 'Invalid signature' }
  }

  // Basic validations
  if (durationMs < 5000) {
    return { success: false, message: 'Game too short to be valid' }
  }

  if (events.length < 10) {
    return { success: false, message: 'Too few moves recorded' }
  }

  // Ensure move timestamps are increasing and not too fast (< 50ms apart)
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1]
    const curr = events[i]
    if (!prev || !curr) continue
    if (curr.t <= prev.t) {
      return { success: false, message: 'Invalid event ordering' }
    }
    if (curr.t - prev.t < 50) {
      return { success: false, message: 'Move too fast' }
    }
  }

  // Check score can be explained by food events
  const computedScore = foods.reduce((acc, f) => acc + (f.g ? 50 : 10), 0)
  if (computedScore !== finalScore) {
    return { success: false, message: 'Score does not match food events' }
  }

  // Upper bound food rate: at most 1 food per 200ms average
  if (foods.length > Math.floor(durationMs / 200)) {
    return { success: false, message: 'Unrealistic food consumption rate' }
  }

  // Finalize session
  session.isActive = false
  session.validatedScore = finalScore

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

  if (session.isActive) {
    return { success: false, message: 'Game session is still active' }
  }

  if (session.validatedScore !== submittedScore) {
    return { success: false, message: 'Submitted score does not match validated score' }
  }

  return { success: true, validatedScore: submittedScore }
}

export function validateScoreSubmissionBySession(
  sessionId: string,
  submittedScore: number,
): { success: boolean; validatedScore?: number; message?: string } {
  const session = gameSessions.get(sessionId)

  if (!session) {
    return { success: false, message: 'Invalid game session' }
  }

  if (session.isActive) {
    return { success: false, message: 'Game session is still active' }
  }

  if (session.validatedScore !== submittedScore) {
    return { success: false, message: 'Submitted score does not match validated score' }
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
