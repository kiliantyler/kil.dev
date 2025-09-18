import { env } from '@/env'
import { validateScoreSubmissionBySession } from '@/lib/game-validation'
import { addScoreToLeaderboard, getLeaderboard } from '@/lib/leaderboard'
import { redis } from '@/lib/redis'
import { sanitizeName, validateScoreSubmission } from '@/lib/score-validation'
import type { LeaderboardEntry, LeaderboardResponse, ScoreSubmissionResponse } from '@/types/leaderboard'
import { Ratelimit } from '@upstash/ratelimit'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// Redis-backed rate limiter for production
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
})

// In-memory fallback for local development with TTL cleanup
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const MAX_STORE_SIZE = 1000 // Cap to prevent unbounded growth
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

function cleanupExpiredEntries(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now

  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip)
    }
  }

  // If still over limit, remove oldest entries
  if (rateLimitStore.size > MAX_STORE_SIZE) {
    const entries = Array.from(rateLimitStore.entries())
    entries.sort((a, b) => a[1].resetTime - b[1].resetTime)

    const toRemove = entries.slice(0, rateLimitStore.size - MAX_STORE_SIZE)
    for (const [ip] of toRemove) {
      rateLimitStore.delete(ip)
    }
  }
}

function checkRateLimitInMemory(ip: string): boolean {
  cleanupExpiredEntries()

  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 5

  const record = rateLimitStore.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

async function checkRateLimit(ip: string): Promise<boolean> {
  // Use Redis in production, in-memory fallback for local development
  if (env.NODE_ENV === 'production') {
    try {
      const { success } = await ratelimit.limit(ip)
      return success
    } catch (error) {
      console.error('Redis rate limit error, falling back to in-memory:', error)
      return checkRateLimitInMemory(ip)
    }
  }

  return checkRateLimitInMemory(ip)
}

// POST /api/scores - Submit new score
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'

    // Check rate limit
    if (!(await checkRateLimit(ip))) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 },
      )
    }

    const body = (await request.json()) as unknown
    const validation = validateScoreSubmission(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid score data', errors: validation.error.issues },
        { status: 400 },
      )
    }

    const { name, score, sessionId, secret } = validation.data
    const sanitizedName = sanitizeName(name)

    // If session data is provided, validate against session's stored validated score (no secret needed)
    if (typeof sessionId === 'string') {
      const gameValidation = validateScoreSubmissionBySession(sessionId, score)
      if (!gameValidation.success) {
        return NextResponse.json(
          { success: false, message: 'Score validation failed', details: gameValidation.message },
          { status: 400 },
        )
      }
      // Use the validated score
      const validatedScore = gameValidation.validatedScore!

      // Create leaderboard entry with validated score
      const entry: LeaderboardEntry = {
        id: uuidv4(),
        name: sanitizedName,
        score: validatedScore,
        timestamp: Date.now(),
      }

      // Add to leaderboard
      const position = await addScoreToLeaderboard(entry)

      // Get updated leaderboard
      const leaderboard = await getLeaderboard()

      const response: ScoreSubmissionResponse = {
        success: true,
        position,
        leaderboard,
        message: `Score submitted! You're ranked #${position}`,
      }

      return NextResponse.json(response, { status: 201 })
    }

    // Reject unvalidated submissions if session data is missing
    return NextResponse.json(
      { success: false, message: 'Missing session data. Score submissions must be validated.' },
      { status: 400 },
    )
  } catch (error) {
    console.error('Error submitting score:', error)
    const payload = { success: false as const, message: 'Internal server error' as const }
    if (env.NODE_ENV !== 'production') {
      return NextResponse.json({ ...payload, details: (error as Error)?.message }, { status: 500 })
    }
    return NextResponse.json(payload, { status: 500 })
  }
}

// GET /api/scores - Fetch current leaderboard
export async function GET() {
  try {
    const leaderboard = await getLeaderboard()

    const response: LeaderboardResponse = {
      success: true,
      leaderboard,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ success: false, message: 'Internal server error', leaderboard: [] }, { status: 500 })
  }
}
