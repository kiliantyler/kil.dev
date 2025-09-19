import { GameEndRequestSchema } from '@/lib/api-schemas'
import { endGameSession } from '@/lib/game-validation'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// POST /api/game/end - End a game session and validate the final score
export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = GameEndRequestSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request body',
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const { sessionId, signature, finalScore, events, foods, durationMs } = parsed.data

    const result = endGameSession(sessionId, signature, finalScore, events ?? [], foods ?? [], durationMs ?? 0)

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
