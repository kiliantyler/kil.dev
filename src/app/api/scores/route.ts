import { env } from '@/env'
import { validateScoreSubmissionBySession, verifySignedScoreSubmission } from '@/lib/game-validation'
import { addScoreToLeaderboard, getLeaderboard } from '@/lib/leaderboard'
import { checkRateLimit } from '@/lib/rate-limit'
import { sanitizeName, validateScoreSubmission } from '@/lib/score-validation'
import type { LeaderboardEntry, LeaderboardResponse, ScoreSubmissionResponse } from '@/types/leaderboard'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

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

    const body: unknown = await request.json()
    const validation = validateScoreSubmission(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid score data', errors: validation.error.issues },
        { status: 400 },
      )
    }

    const { name, score, sessionId, timestamp, nonce, signature } = validation.data
    const sanitizedName = sanitizeName(name)

    // If session data is provided, verify signature + anti-replay, then validate against stored validated score
    if (typeof sessionId === 'string') {
      const sigCheck = await (
        verifySignedScoreSubmission as (args: {
          sessionId: string
          name: string
          score: number
          timestamp: number
          nonce: string
          signature: string
        }) => Promise<{ success: boolean; message?: string }>
      )({
        sessionId,
        name, // use original name for signature verification (not sanitized)
        score,
        timestamp: timestamp as number,
        nonce: nonce as string,
        signature: signature as string,
      })
      if (!sigCheck.success) {
        return NextResponse.json({ success: false, message: 'Signature verification failed' }, { status: 400 })
      }

      const gameValidation = await validateScoreSubmissionBySession(sessionId, score)
      if (!gameValidation.success) {
        return NextResponse.json(
          { success: false, message: 'Score validation failed', details: gameValidation.message },
          { status: 400 },
        )
      }
      // Use the validated score
      const validatedScore = gameValidation.validatedScore
      if (validatedScore === undefined) {
        throw new Error('Validated score is undefined despite successful validation')
      }

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
