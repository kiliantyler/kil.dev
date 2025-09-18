import { endGameSession } from '@/lib/game-validation'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// POST /api/game/end - End a game session and validate the final score
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { sessionId: string; secret: string; finalScore: number }

    const { sessionId, secret, finalScore } = body

    if (!sessionId || !secret || typeof finalScore !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: sessionId, secret, finalScore' },
        { status: 400 },
      )
    }

    const result = endGameSession(sessionId, secret, finalScore)

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      validatedScore: result.validatedScore,
      message: 'Game session ended and score validated',
    })
  } catch (error) {
    console.error('Error ending game session:', error)
    return NextResponse.json({ success: false, message: 'Failed to end game session' }, { status: 500 })
  }
}
