import { env, requireConvexGameWriteSecret } from '@/env'
import { stableStringify } from '@/utils/stable-stringify'
import { ConvexHttpClient } from 'convex/browser'
import { createHash, randomBytes } from 'node:crypto'
import type { Id } from '../../convex/_generated/dataModel'

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

interface GameSession {
  id: string
  createdAt: number
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

// Tunable validation thresholds (relaxed in development)
const IS_DEV = process.env.NODE_ENV !== 'production'
const MIN_DURATION_MS = IS_DEV ? 500 : 2000
const MIN_MOVE_EVENTS = IS_DEV ? 3 : 5
const MIN_MOVE_INTERVAL_MS = IS_DEV ? 30 : 50
const MAX_FOOD_RATE_MS = IS_DEV ? 80 : 200

// Convex client factory - creates a fresh instance per request
function getConvexClient(): ConvexHttpClient {
  if (!env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not set')
  }
  const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL)
  if (env.CONVEX_DEPLOY_KEY) {
    client.setAuth(env.CONVEX_DEPLOY_KEY)
  }
  return client
}

/**
 * Validates that a string is a valid sessionId format.
 * Convex IDs are validated server-side, but we check basic format here.
 */
function validateSessionId(sessionId: string): sessionId is Id<'gameSessions'> {
  // Basic validation: non-empty string
  // Convex will validate the actual ID format server-side
  return typeof sessionId === 'string' && sessionId.length > 0
}

/**
 * Type matching the return type of the server session action.
 * This matches the return validator defined in convex/gameSessions.ts
 */
type SessionQueryResult = {
  id: string
  secret: string
  seed: number
  createdAt: number
  isActive: boolean
  validatedScore?: number
} | null

/**
 * Type guard to validate the session query result structure.
 * Checks that all required properties exist and have correct types.
 */
function isValidSessionResult(result: unknown): result is NonNullable<SessionQueryResult> {
  if (!result || typeof result !== 'object') {
    return false
  }
  // Check properties without type assertion by using 'in' operator and type narrowing
  if (
    !('id' in result) ||
    !('secret' in result) ||
    !('seed' in result) ||
    !('createdAt' in result) ||
    !('isActive' in result)
  ) {
    return false
  }
  return (
    typeof result.id === 'string' &&
    typeof result.secret === 'string' &&
    typeof result.seed === 'number' &&
    typeof result.createdAt === 'number' &&
    typeof result.isActive === 'boolean' &&
    ('validatedScore' in result
      ? typeof result.validatedScore === 'number' || result.validatedScore === undefined
      : true)
  )
}

async function getSession(sessionId: string): Promise<GameSession | undefined> {
  try {
    // Validate sessionId format before using it
    if (!validateSessionId(sessionId)) {
      return undefined
    }

    const client = getConvexClient()
    const apiModule = await import('../../convex/_generated/api')
    const api = apiModule.api

    // ConvexHttpClient returns unknown, so we validate the result.
    const queryResult: unknown = await client.action(api.serverGameWrites.getGameSessionForServer, {
      writeSecret: requireConvexGameWriteSecret(),
      sessionId,
    })

    // Handle null/undefined case explicitly
    if (!queryResult) {
      return undefined
    }

    // Validate the result structure using type guard instead of type assertion
    if (!isValidSessionResult(queryResult)) {
      console.error('Invalid session data structure returned from Convex')
      return undefined
    }

    // Now TypeScript knows queryResult is the correct type
    return {
      id: queryResult.id,
      createdAt: queryResult.createdAt,
      isActive: queryResult.isActive,
      secret: queryResult.secret,
      seed: queryResult.seed,
      validatedScore: queryResult.validatedScore,
    }
  } catch (error) {
    console.error('Failed to get session from Convex:', error)
    return undefined
  }
}

async function updateSession(session: GameSession): Promise<void> {
  try {
    // Validate sessionId format before using it
    const sessionId = session.id
    if (!validateSessionId(sessionId)) {
      throw new Error('Invalid session ID format')
    }

    const client = getConvexClient()
    const apiModule = await import('../../convex/_generated/api')
    const api = apiModule.api

    await client.action(api.serverGameWrites.updateGameSession, {
      writeSecret: requireConvexGameWriteSecret(),
      sessionId,
      isActive: session.isActive,
      validatedScore: session.validatedScore,
    })
    console.log('Session updated in Convex:', session.id)
  } catch (error) {
    console.error('Failed to update session in Convex:', error)
    throw new Error('Failed to update session')
  }
}

export async function createGameSession(): Promise<{ sessionId: string; secret: string; seed: number }> {
  const secret = randomBytes(32).toString('hex')
  const seed = randomBytes(4).readUInt32BE(0)

  // Create session in Convex - Convex will generate the ID
  const client = getConvexClient()
  const apiModule = await import('../../convex/_generated/api')
  const api = apiModule.api

  const sessionId = await client.action(api.serverGameWrites.createGameSession, {
    writeSecret: requireConvexGameWriteSecret(),
    sessionSecret: secret,
    seed,
  })

  return { sessionId, secret, seed }
}

export async function endGameSession(
  sessionId: string,
  signature: string,
  finalScore: number,
  events: MoveEvent[],
  foods: FoodEvent[],
  durationMs: number,
): Promise<{ success: boolean; validatedScore?: number; message?: string }> {
  const session = await getSession(sessionId)

  if (!session) {
    return { success: false, message: 'Invalid game session' }
  }

  if (!session.isActive) {
    return { success: false, message: 'Game session is not active' }
  }

  // Verify signature with deterministic serialization
  const payloadString = stableStringify({ sessionId, finalScore, events, foods, durationMs })
  const expectedSig = computeSignatureHex(session.secret, payloadString)
  if (expectedSig !== signature) {
    return { success: false, message: 'Invalid signature' }
  }

  // Basic validations
  if (durationMs < MIN_DURATION_MS) {
    return { success: false, message: 'Game too short to be valid' }
  }

  if (events.length < MIN_MOVE_EVENTS) {
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
    if (curr.t - prev.t < MIN_MOVE_INTERVAL_MS) {
      return { success: false, message: 'Move too fast' }
    }
  }

  // Check score can be explained by food events
  const computedScore = foods.reduce((acc, f) => acc + (f.g ? 50 : 10), 0)
  if (computedScore !== finalScore) {
    return { success: false, message: 'Score does not match food events' }
  }

  // Upper bound food rate: at most 1 food per interval (disabled in dev)
  if (!IS_DEV && foods.length > Math.floor(durationMs / MAX_FOOD_RATE_MS)) {
    return { success: false, message: 'Unrealistic food consumption rate' }
  }

  // Finalize session
  session.isActive = false
  session.validatedScore = finalScore

  await updateSession(session)

  return { success: true, validatedScore: finalScore }
}

export async function validateScoreSubmissionBySession(
  sessionId: string,
  submittedScore: number,
): Promise<{ success: boolean; validatedScore?: number; message?: string }> {
  const session = await getSession(sessionId)

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

export async function verifySignedScoreSubmission(
  params: {
    sessionId: string
    name: string
    score: number
    timestamp: number
    signature: string
  },
  maxSkewMs = 2 * 60 * 1000, // 2 minutes
): Promise<{ success: boolean; message?: string }> {
  const { sessionId, name, score, timestamp, signature } = params
  const session = await getSession(sessionId)
  if (!session) return { success: false, message: 'Invalid game session' }
  if (!sessionId || !name || typeof score !== 'number') return { success: false, message: 'Invalid payload' }

  // Reject stale or future timestamps
  const now = Date.now()
  if (Math.abs(now - timestamp) > maxSkewMs) {
    return { success: false, message: 'Stale or invalid timestamp' }
  }

  // Verify signature over stable payload
  const payloadString = stableStringify({ sessionId, name, score, timestamp })
  const expected = computeSignatureHex(session.secret, payloadString)
  if (expected !== signature) return { success: false, message: 'Invalid signature' }

  return { success: true }
}
