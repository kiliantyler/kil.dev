import { addScoreToLeaderboard, getLeaderboard } from '@/lib/leaderboard'
import { sanitizeName, validateScoreSubmission } from '@/lib/score-validation'
import type { LeaderboardEntry, LeaderboardResponse, ScoreSubmissionResponse } from '@/types/leaderboard'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// Rate limiting store (in production, use Redis or a proper rate limiting service)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
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

// POST /api/scores - Submit new score
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'

    // Check rate limit
    if (!checkRateLimit(ip)) {
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

    const { name, score } = validation.data
    const sanitizedName = sanitizeName(name)

    // Create leaderboard entry
    const entry: LeaderboardEntry = {
      id: uuidv4(),
      name: sanitizedName,
      score,
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
  } catch (error) {
    console.error('Error submitting score:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
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
