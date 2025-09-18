import { recordGameMove } from '@/lib/game-validation'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// POST /api/game/move - Record a game move
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sessionId: string
      secret: string
      direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
      gameState: {
        snake: { x: number; y: number }[]
        food: { x: number; y: number }
        isGoldenApple: boolean
        score: number
        direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
      }
    }

    const { sessionId, secret, direction, gameState } = body

    if (!sessionId || !secret || !direction || !gameState) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: sessionId, secret, direction, gameState' },
        { status: 400 },
      )
    }

    const result = recordGameMove(sessionId, secret, direction, gameState)

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Move recorded',
    })
  } catch (error) {
    console.error('Error recording game move:', error)
    return NextResponse.json({ success: false, message: 'Failed to record game move' }, { status: 500 })
  }
}
