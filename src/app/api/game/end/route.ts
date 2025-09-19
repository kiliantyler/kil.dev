import { GameEndRequestSchema } from '@/lib/api-schemas'
import { endGameSession } from '@/lib/game-validation'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

// POST /api/game/end - End a game session and validate the final score
export async function POST(request: NextRequest) {
  try {
    const data = GameEndRequestSchema.parse(await request.json())
    const { sessionId, signature, finalScore, events, foods, durationMs } = data
    const result = await endGameSession(sessionId, signature, finalScore, events ?? [], foods ?? [], durationMs ?? 0)

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      validatedScore: result.validatedScore,
      message: 'Game session ended and score validated',
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request body',
          errors: error.flatten(),
        },
        { status: 400 },
      )
    }

    console.error('Error ending game session:', error)
    return NextResponse.json({ success: false, message: 'Failed to end game session' }, { status: 500 })
  }
}
