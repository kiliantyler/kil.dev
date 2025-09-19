import { redis } from '@/lib/redis'
import { stableStringify } from '@/utils/stable-stringify'
import { createHash, randomBytes } from 'crypto'

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

// Redis key and TTL configuration
const SESSION_KEY_PREFIX = 'game:session:'
const SESSION_TTL_SECONDS = 60 * 60 // 1 hour

// In-memory fallback store (useful in dev/local or if Redis is temporarily unavailable)
const memorySessions = new Map<string, GameSession>()

function setMemorySession(session: GameSession) {
  memorySessions.set(session.id, session)
  // Best-effort TTL cleanup
  setTimeout(
    () => {
      const existing = memorySessions.get(session.id)
      if (existing && Date.now() - existing.createdAt >= SESSION_TTL_SECONDS * 1000) {
        memorySessions.delete(session.id)
      }
    },
    SESSION_TTL_SECONDS * 1000 + 1000,
  )
}

type RetryOptions = {
  attempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
}

async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const attempts = options?.attempts ?? 3
  const initialDelayMs = options?.initialDelayMs ?? 100
  const maxDelayMs = options?.maxDelayMs ?? 1000

  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const delay = Math.min(maxDelayMs, initialDelayMs * 2 ** attempt) + Math.floor(Math.random() * 50)
      if (attempt === attempts - 1) break
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Unknown error during Redis operation')
}

function getSessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`
}

export async function createSession(session: GameSession): Promise<void> {
  const key = getSessionKey(session.id)
  try {
    await withRetry(() => redis.set(key, session, { ex: SESSION_TTL_SECONDS }))
    // Also store in memory as a soft cache to avoid race/infra hiccups
    setMemorySession(session)
  } catch {
    // Fallback to memory in dev
    if (IS_DEV) setMemorySession(session)
    else throw new Error('Failed to create session')
  }
}

export async function getSession(sessionId: string): Promise<GameSession | undefined> {
  const key = getSessionKey(sessionId)
  let raw: GameSession | null = null
  try {
    raw = await withRetry(() => redis.get<GameSession>(key))
  } catch {
    const mem = memorySessions.get(sessionId)
    if (mem) return mem
    if (!IS_DEV) throw new Error('Failed to get session')
    return undefined
  }
  if (!raw) {
    const mem = memorySessions.get(sessionId)
    if (mem) return mem
    return undefined
  }
  // If Upstash already deserialized JSON, return it directly
  return raw
}

export async function updateSession(session: GameSession): Promise<void> {
  const key = getSessionKey(session.id)
  try {
    await withRetry(() => redis.set(key, session, { ex: SESSION_TTL_SECONDS }))
    setMemorySession(session)
  } catch {
    if (IS_DEV) setMemorySession(session)
    else throw new Error('Failed to update session')
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const key = getSessionKey(sessionId)
  try {
    await withRetry(() => redis.del(key))
  } catch {
    if (IS_DEV) memorySessions.delete(sessionId)
    else throw new Error('Failed to delete session')
  }
  // Ensure memory copy is cleared as well
  memorySessions.delete(sessionId)
}

export async function createGameSession(): Promise<{ sessionId: string; secret: string; seed: number }> {
  const sessionId = randomBytes(16).toString('hex')
  const secret = randomBytes(32).toString('hex')
  const seed = randomBytes(4).readUInt32BE(0)

  const session: GameSession = {
    id: sessionId,
    createdAt: Date.now(),
    isActive: true,
    secret,
    seed,
  }

  await createSession(session)

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

export async function validateScoreSubmission(
  sessionId: string,
  secret: string,
  submittedScore: number,
): Promise<{ success: boolean; validatedScore?: number; message?: string }> {
  const session = await getSession(sessionId)

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
